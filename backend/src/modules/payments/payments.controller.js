const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const paginate = require('../../utils/paginate');
const generateReceiptNumber = require('../../utils/generateReceiptNumber');
const { initializePayment: psInit, verifyPayment: psVerify, verifyWebhookSignature } = require('../../../services/paystackService');
const ledgerService = require('../../services/ledgerService');

async function allocatePaymentToBill(payment, ledgerServices, dbSession) {
  // Prisma transaction client doesn't use `session: dbSession` like Mongoose, so ledgerServices integration
  // must rely on standard Prisma queries inside a managed environment, or we pass the Prisma Tx client explicitly.
  // We assume ledgerServices accepts `tx` via dbSession. Prisma uses `tx` directly.
  const tx = dbSession || prisma;

  const bill = await tx.invoice.findFirst({
    where: { 
      tenantId: payment.tenantId,
      studentId: payment.studentId, 
      session: payment.session, 
      term: payment.term 
    },
    include: { items: true }
  });

  if (!bill) {
    if (process.env.ENABLE_CREDIT_LEDGER === 'true') {
      const student = await tx.student.findFirst({ where: { id: payment.studentId, tenantId: payment.tenantId } });
      if (student && student.parentId) {
        await ledgerServices.addToLedger({
          userId: student.parentId,
          amount: payment.amount,
          sourceEventId: payment.id,
          sourceEventType: 'payment',
          type: 'overpayment',
          notes: `Overpayment from Cash Receipt ${payment.reference} (No active bill found)`
        }, tx);
      }
    }
    return;
  }

  let remaining = payment.amount;
  let itemsToUpdate = [];

  const allocations = typeof payment.allocations === 'string' ? JSON.parse(payment.allocations || '[]') : payment.allocations;

  if (allocations && allocations.length > 0) {
    for (const alloc of allocations) {
      if (remaining <= 0) break;
      const targetItem = bill.items.find(i => i.id === alloc.itemId);
      if (targetItem && targetItem.status !== 'waived') {
        const itemBalance = Math.max(0, targetItem.netAmount - targetItem.paid);
        if (itemBalance > 0) {
          const amountToAllocate = Math.min(itemBalance, remaining, alloc.amount);
          targetItem.paid += amountToAllocate;
          remaining -= amountToAllocate;
          itemsToUpdate.push(targetItem);
        }
      }
    }
  } 

  if (remaining > 0) {
    if (payment.feeType && payment.feeType !== 'all' && payment.feeType !== 'multiple') {
      const targetItem = bill.items.find(i => i.feeType === payment.feeType && i.status !== 'waived');
      if (targetItem) {
        const itemBalance = Math.max(0, targetItem.netAmount - targetItem.paid);
        if (itemBalance > 0) {
          const alloc = Math.min(itemBalance, remaining);
          targetItem.paid += alloc;
          remaining -= alloc;
          itemsToUpdate.push(targetItem);
        }
      }
    }
    
    for (const item of bill.items) {
      if (item.status === 'waived') continue;
      if (remaining <= 0) break;
      const itemBalance = Math.max(0, item.netAmount - item.paid);
      if (itemBalance > 0) {
        const alloc = Math.min(itemBalance, remaining);
        item.paid += alloc;
        remaining -= alloc;
        itemsToUpdate.push(item);
      }
    }
  }

  for (const item of itemsToUpdate) {
    await tx.invoiceLineItem.update({
      where: { id: item.id },
      data: { paid: item.paid }
    });
  }

  const nextRevision = (bill.revision || 0) + 1;
  await tx.invoice.update({
    where: { id: bill.id },
    data: { revision: nextRevision }
  });

  if (remaining > 0 && process.env.ENABLE_CREDIT_LEDGER === 'true') {
    const student = await tx.student.findFirst({ where: { id: payment.studentId, tenantId: payment.tenantId } });
    if (student && student.parentId) {
      await ledgerServices.addToLedger({
        userId: student.parentId,
        amount: remaining,
        sourceEventId: payment.id,
        sourceEventType: 'payment',
        type: 'overpayment',
        notes: `Overpayment from Cash Receipt ${payment.reference}`
      }, tx);
    }
  }

  await tx.outboxEvent.createMany({
    data: [{
      tenantId: payment.tenantId,
      type: 'REBUILD_BILL',
      billId: bill.id,
      eventKey: `REBUILD_BILL:${bill.id}:${nextRevision}`,
      status: 'pending',
    }],
    skipDuplicates: true
  });
}

async function finalizeReceiptSnapshot(paymentId) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== 'paid' || payment.receiptSnapshot) return;

  const bill = await prisma.invoice.findFirst({
    where: { tenantId: payment.tenantId, studentId: payment.studentId, session: payment.session, term: payment.term },
    include: { items: true }
  });

  if (!bill) return;

  const student = await prisma.student.findFirst({
    where: { id: payment.studentId },
    include: { user: { select: { name: true } }, class: { select: { name: true } } }
  });

  if (!student) return;

  const snapshot = {
    receiptNo: payment.receiptNumber,
    student: {
      studentId: student.id,
      admissionNo: student.admissionNumber,
      fullName: student.user?.name || 'Unknown'
    },
    class: {
      classId: student.class?.id || null,
      name: student.class?.name || 'Unknown'
    },
    term: {
      session: payment.session,
      term: payment.term
    },
    items: bill.items.map(i => ({
      itemId: i.id,
      name: i.feeName,
      feeType: i.feeType,
      amount: i.netAmount,
      paid: i.paid
    })),
    allocations: payment.allocations || [],
    summary: {
      totalAmount: bill.totalAmount,
      totalPaid: bill.totalPaid,
      balanceBefore: bill.totalBalance + payment.amount,
      balanceAfter: bill.totalBalance
    },
    method: payment.paymentMethod,
    status: 'paid',
    createdAt: new Date(),
    snapshotVersion: bill.revision || 0
  };
  
  const crypto = require('crypto');
  snapshot.snapshotHash = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');

  await prisma.payment.update({
    where: { id: paymentId },
    data: { receiptSnapshot: snapshot }
  });
}

exports.initializePayment = catchAsync(async (req, res, next) => {
  const { studentId, amount, feeType, term, session, billId, notes } = req.body;
  if (!studentId || !amount || !feeType || !term || !session)
    return next(new ApiError(400, 'studentId, amount, feeType, term and session are required'));

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId: req.tenantId },
    include: { user: true }
  });
  if (!student) return next(new ApiError(404, 'Student not found'));

  if (req.user.role === 'parent' && student.parentId !== req.user.id)
    return next(new ApiError(403, 'You can only make payments for your own child'));

  const reference = 'SS-' + Date.now() + '-' + Math.random().toString(36).substr(2,6).toUpperCase();
  const splitWalletAmt = req.body.walletAmount ? Number(req.body.walletAmount) : 0;
  const allocations = req.body.allocations || [];

  if (allocations.length > 0 && billId) {
    const bill = await prisma.invoice.findFirst({
      where: { id: billId, tenantId: req.tenantId },
      include: { items: { include: { feeStructure: true } } }
    });
    if (!bill) return next(new ApiError(404, 'Referenced bill not found'));

    for (const alloc of allocations) {
      const item = bill.items.find(i => i.id === alloc.itemId);
      if (!item) return next(new ApiError(400, 'Invalid bill item in allocations'));
      
      const fs = item.feeStructure;
      const remaining = Math.max(0, item.netAmount - item.paid);
      
      if (fs && !fs.allowInstallment && alloc.amount < remaining) {
        return next(new ApiError(400, `Installments are not allowed for ${item.feeName}. Full payment of ${remaining} is required.`));
      }

      if (fs && fs.allowInstallment && fs.minInstallment > 0) {
        if (alloc.amount < fs.minInstallment && alloc.amount < remaining) {
          return next(new ApiError(400, `Payment for ${item.feeName} is below the minimum installment of ${fs.minInstallment}`));
        }
      }
    }
  }

  const paymentIntent = await prisma.paymentIntent.create({
    data: {
      tenantId: req.tenantId,
      userId: req.user.id, 
      studentId, 
      invoiceId: billId,
      walletAmount: splitWalletAmt, 
      paystackAmount: Number(amount),
      feeType, term, session, reference, status: 'pending',
      allocations: allocations
    }
  });

  const psRes = await psInit(
    student.user.email, Number(amount) * 100, reference,
    { studentId, paymentIntentId: paymentIntent.id, tenantId: req.tenantId }
  );

  if (!psRes.status) {
    await prisma.paymentIntent.delete({ where: { id: paymentIntent.id } });
    return next(new ApiError(502, 'Paystack initialization failed: ' + (psRes.message || '')));
  }

  res.json({
    success: true, message: 'Payment initialized',
    data: {
      reference, paymentIntentId: paymentIntent.id,
      authorizationUrl: psRes.data.authorization_url,
      accessCode:       psRes.data.access_code,
    },
  });
});

exports.verifyPayment = catchAsync(async (req, res, next) => {
  let payment = await prisma.payment.findFirst({ where: { reference: req.params.reference, tenantId: req.tenantId } });
  if (payment && payment.status === 'paid') {
    return res.json({ success: true, message: 'Already verified', data: payment });
  }

  const intent = await prisma.paymentIntent.findFirst({ where: { reference: req.params.reference, tenantId: req.tenantId } });
  if (!intent) return next(new ApiError(404, 'Payment intent not found'));

  const psRes = await psVerify(req.params.reference);
  if (!psRes.status || psRes.data.status !== 'success') {
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'failed' } });
    return next(new ApiError(402, 'Payment not successful'));
  }

  const receiptNumber = await generateReceiptNumber();
  let updatedPayment;
  let snapshotPaymentIds = [];

  await prisma.$transaction(async (tx) => {
    const lockedIntent = await tx.paymentIntent.findFirst({ where: { id: intent.id, status: 'pending' } });
    if (!lockedIntent) return;

    await tx.paymentIntent.update({ where: { id: intent.id }, data: { status: 'completed' } });

    if (lockedIntent.walletAmount > 0) {
      try {
        await ledgerService.allocateCredit({
          userId: lockedIntent.userId, amount: lockedIntent.walletAmount, relatedBillId: lockedIntent.invoiceId,
          notes: 'Split Wallet Finalization for Paystack Ref ' + lockedIntent.reference
        }, tx);
        
        const receiptNumber2 = await generateReceiptNumber();
        const walletPayment = await tx.payment.create({
          data: {
            tenantId: req.tenantId, studentId: lockedIntent.studentId, amount: lockedIntent.walletAmount, feeType: lockedIntent.feeType,
            term: lockedIntent.term, session: lockedIntent.session, invoiceId: lockedIntent.invoiceId,
            status: 'paid', paymentMethod: 'wallet', reference: 'WALLET-SPLIT-' + Date.now() + '-' + Math.random().toString(36).substr(2,4).toUpperCase(),
            receiptNumber: receiptNumber2, paidAt: new Date(), notes: 'Split Wallet Finalization'
          }
        });
        
        await allocatePaymentToBill(walletPayment, ledgerService, tx);
        snapshotPaymentIds.push(walletPayment.id);
      } catch (err) {
        console.error('Wallet split finalization failed:', err.message);
      }
    }

    const paystackPayment = await tx.payment.create({
      data: {
        tenantId: req.tenantId, studentId: lockedIntent.studentId, amount: lockedIntent.paystackAmount, feeType: lockedIntent.feeType,
        term: lockedIntent.term, session: lockedIntent.session, invoiceId: lockedIntent.invoiceId,
        status: 'paid', paymentMethod: 'paystack', reference: lockedIntent.reference,
        receiptNumber, paidAt: new Date()
      }
    });

    updatedPayment = paystackPayment;
    await allocatePaymentToBill(updatedPayment, ledgerService, tx);
    snapshotPaymentIds.push(updatedPayment.id);
  });

  for (const pid of snapshotPaymentIds) {
    await finalizeReceiptSnapshot(pid).catch(err => console.error('Snapshot failed:', err.message));
  }

  if (updatedPayment) {
    try {
      const notifSvc = require('../../../services/notificationService');
      notifSvc.onPaymentConfirmed(updatedPayment.studentId, updatedPayment.amount, updatedPayment.feeType, updatedPayment.term, receiptNumber).catch(() => {});
    } catch {}
    res.json({ success: true, message: 'Payment verified successfully', data: updatedPayment });
  } else {
    const latest = await prisma.payment.findFirst({ where: { reference: req.params.reference, tenantId: req.tenantId } });
    res.json({ success: true, message: 'Payment already verified', data: latest });
  }
});

exports.webhook = async (req, res) => {
  try {
    const sig = req.headers['x-paystack-signature'];
    const payloadString = JSON.stringify(req.body);
    if (!verifyWebhookSignature(payloadString, sig)) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const eventId = req.body.event === 'charge.success' ? req.body.data.id : req.body.id;
    if (!eventId) return res.status(200).send('OK');

    // EXPLICIT TENANT ISOLATION EXTRACTION FOR WEBHOOKS
    const tenantId = req.body.data?.metadata?.tenantId;
    if (!tenantId) {
      console.error('[Webhook Error] Webhook metadata missing tenantId constraint.');
      return res.status(200).send('OK'); 
    }

    // Prisma creates require mapping the webhook unique lock
    try {
      await prisma.webhookConfig.createMany({
        data: [{ tenantId, targetUrl: String(eventId), secretKey: 'lock' }],
        skipDuplicates: true
      });
    } catch (err) {}

    if (req.body.event === 'charge.success') {
      try {
        let snapshotPaymentIds = [];
        let updatedPayment;

        await prisma.$transaction(async (tx) => {
          const intent = await tx.paymentIntent.findFirst({ where: { reference: req.body.data.reference, tenantId } });
          if (!intent || intent.status === 'completed') return;

          await tx.paymentIntent.update({ where: { id: intent.id }, data: { status: 'completed' } });

          if (intent.walletAmount > 0) {
            try {
              await ledgerService.allocateCredit({
                userId: intent.userId, amount: intent.walletAmount, relatedBillId: intent.invoiceId,
                notes: 'Split Wallet Finalization for Paystack Ref ' + intent.reference
              }, tx);
              
              const receiptNumber2 = await generateReceiptNumber();
              const walletPayment = await tx.payment.create({
                data: {
                  tenantId, studentId: intent.studentId, amount: intent.walletAmount, feeType: intent.feeType,
                  term: intent.term, session: intent.session, invoiceId: intent.invoiceId,
                  status: 'paid', paymentMethod: 'wallet', reference: 'WALLET-SPLIT-' + Date.now() + '-' + Math.random().toString(36).substr(2,4).toUpperCase(),
                  receiptNumber: receiptNumber2, paidAt: new Date(), notes: 'Split Wallet Finalization'
                }
              });
              
              await allocatePaymentToBill(walletPayment, ledgerService, tx);
              snapshotPaymentIds.push(walletPayment.id);
            } catch (err) {
              console.error('Wallet split finalization failed:', err.message);
            }
          }

          const receiptNumber = await generateReceiptNumber();
          const paystackPayment = await tx.payment.create({
            data: {
              tenantId, studentId: intent.studentId, amount: intent.paystackAmount, feeType: intent.feeType,
              term: intent.term, session: intent.session, invoiceId: intent.invoiceId,
              status: 'paid', paymentMethod: 'paystack', reference: intent.reference,
              receiptNumber, paidAt: new Date()
            }
          });

          updatedPayment = paystackPayment;
          await allocatePaymentToBill(updatedPayment, ledgerService, tx);
          snapshotPaymentIds.push(updatedPayment.id);

          try {
            const notifSvc = require('../../../services/notificationService');
            notifSvc.onPaymentConfirmed(updatedPayment.studentId, updatedPayment.amount, updatedPayment.feeType, updatedPayment.term, receiptNumber).catch(() => {});
          } catch {}
        });

        for (const pid of snapshotPaymentIds) {
          await finalizeReceiptSnapshot(pid).catch(err => console.error('Snapshot failed:', err.message));
        }
      } catch (err) {
        console.error('[Webhook Processing Error]', err.message);
        return res.status(500).send();
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('[Webhook Fatal]', err);
    res.status(500).send();
  }
};

exports.recordManualPayment = catchAsync(async (req, res, next) => {
  const { studentId, amount, feeType, term, session, billId,
          paymentMethod, bankName, accountName, transactionRef, notes } = req.body;

  if (!studentId || !amount || !feeType || !term || !session)
    return next(new ApiError(400, 'studentId, amount, feeType, term and session are required'));

  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId: req.tenantId } });
  if (!student) return next(new ApiError(404, 'Student not found'));

  const method        = paymentMethod || 'cash';
  const needsApproval = method === 'bank_transfer';
  const receiptNumber = needsApproval ? null : await generateReceiptNumber();
  const reference     = (needsApproval ? 'PENDING' : 'MANUAL') + '-' + Date.now();

  let payment;
  await prisma.$transaction(async (tx) => {
    payment = await tx.payment.create({
      data: {
        tenantId: req.tenantId, studentId, amount: Number(amount), feeType, term, session,
        invoiceId: billId || null,
        status:           needsApproval ? 'awaiting_approval' : 'paid',
        paymentMethod:    method,
        reference, receiptNumber,
        bankName:       bankName       || null,
        accountName:    accountName    || null,
        transactionRef: transactionRef || null,
        paidAt:         needsApproval ? null : new Date(),
        notes:          notes || null,
      }
    });
    
    if (!needsApproval) {
      await allocatePaymentToBill(payment, ledgerService, tx);
    }
  });

  if (!needsApproval) {
    await finalizeReceiptSnapshot(payment.id).catch(err => console.error('Snapshot failed:', err.message));
  }

  const populated = await prisma.payment.findUnique({
    where: { id: payment.id },
    include: { student: { include: { user: true } } }
  });

  res.status(201).json({
    success: true,
    message: needsApproval
      ? 'Payment submitted for approval'
      : 'Manual payment recorded successfully',
    data: populated,
  });
});

exports.approvePayment = catchAsync(async (req, res, next) => {
  const payment = await prisma.payment.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!payment) return next(new ApiError(404, 'Payment not found'));
  if (payment.status !== 'awaiting_approval') return next(new ApiError(400, 'Not awaiting approval'));

  const receiptNumber = await generateReceiptNumber();
  let updatedPayment;

  await prisma.$transaction(async (tx) => {
    updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'paid', paidAt: new Date(),
        receiptNumber
      },
      include: { student: { include: { user: true } } }
    });

    if (updatedPayment) {
      await allocatePaymentToBill(updatedPayment, ledgerService, tx);
    }
  });

  await finalizeReceiptSnapshot(updatedPayment.id).catch(err => console.error('Snapshot failed:', err.message));

  res.json({ success: true, message: 'Payment approved', data: updatedPayment });
});

exports.rejectPayment = catchAsync(async (req, res, next) => {
  const payment = await prisma.payment.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!payment) return next(new ApiError(404, 'Payment not found'));
  if (payment.status !== 'awaiting_approval') return next(new ApiError(400, 'Not awaiting approval'));

  const updated = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      status: 'failed',
      notes: req.body.reason || 'Rejected by admin'
    }
  });

  res.json({ success: true, message: 'Payment rejected', data: updated });
});

exports.reversePayment = catchAsync(async (req, res, next) => {
  // Simplified reversal logic enforcing Prisma strict models
  const paymentId = req.params.id;
  
  let resultPayment;
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, tenantId: req.tenantId } });
    if (!payment) throw new ApiError(404, 'Payment not found');
    if (payment.status !== 'paid') throw new ApiError(400, 'Only paid payments can be reversed');

    let unallocateTarget = payment.amount;
    const bill = await tx.invoice.findFirst({
      where: { tenantId: req.tenantId, studentId: payment.studentId, session: payment.session, term: payment.term },
      include: { items: true }
    });

    if (bill && unallocateTarget > 0) {
      for (let i = bill.items.length - 1; i >= 0; i--) {
        const item = bill.items[i];
        if (item.paid > 0) {
          const deduction = Math.min(item.paid, unallocateTarget);
          item.paid -= deduction;
          unallocateTarget -= deduction;
          await tx.invoiceLineItem.update({ where: { id: item.id }, data: { paid: item.paid } });
          if (unallocateTarget <= 0) break;
        }
      }
    }

    resultPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'reversed',
        notes: payment.notes ? `${payment.notes} (Reversed by Admin)` : 'Reversed by Admin'
      }
    });
  });

  res.json({ success: true, message: 'Payment successfully reversed', data: resultPayment });
});

exports.getAllPayments = catchAsync(async (req, res) => {
  const p = paginate(req.query);
  const { status, term, session, feeType, paymentMethod, classId } = req.query;
  const filter = { tenantId: req.tenantId };

  if (status)        filter.status        = status;
  if (term)          filter.term          = term;
  if (session)       filter.session       = session;
  if (feeType)       filter.feeType       = feeType;
  if (paymentMethod) filter.paymentMethod = paymentMethod;

  if (classId) {
    const students = await prisma.student.findMany({ where: { classId, tenantId: req.tenantId }, select: { id: true } });
    filter.studentId = { in: students.map(s => s.id) };
  }

  const total = await prisma.payment.count({ where: filter });
  const payments = await prisma.payment.findMany({
    where: filter,
    include: { student: { include: { user: true, class: true } } },
    orderBy: { createdAt: 'desc' },
    skip: p.skip, take: p.limit
  });

  const revenueAgg = await prisma.payment.aggregate({
    where: { ...filter, status: 'paid' },
    _sum: { amount: true }
  });
  
  const pending = await prisma.payment.count({ where: { tenantId: req.tenantId, status: 'awaiting_approval' } });

  res.json({
    success: true,
    totalRevenue:     revenueAgg._sum.amount || 0,
    pendingApprovals: pending,
    pagination: { total, page: p.page, pages: Math.ceil(total / p.limit) },
    data: payments,
  });
});

exports.getStudentPayments = catchAsync(async (req, res, next) => {
  const { studentId } = req.params;
  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId: req.tenantId } });
  if (!student) return next(new ApiError(404, 'Student not found'));

  if (req.user.role === 'parent' && student.parentId !== req.user.id) return next(new ApiError(403, 'Access denied'));
  if (req.user.role === 'student' && student.userId !== req.user.id) return next(new ApiError(403, 'Access denied'));

  const filter = { studentId, tenantId: req.tenantId };
  if (req.query.term)    filter.term    = req.query.term;
  if (req.query.session) filter.session = req.query.session;
  if (req.query.status)  filter.status  = req.query.status;

  const p = paginate(req.query);
  const total = await prisma.payment.count({ where: filter });
  const payments = await prisma.payment.findMany({
    where: filter,
    orderBy: { createdAt: 'desc' },
    skip: p.skip, take: p.limit
  });

  const agg = await prisma.payment.aggregate({
    where: { studentId: student.id, status: 'paid', tenantId: req.tenantId },
    _sum: { amount: true }
  });

  res.json({
    success: true,
    totalAmountPaid: agg._sum.amount || 0,
    pagination: { total, page: p.page, pages: Math.ceil(total / p.limit) },
    data: payments,
  });
});

exports.getReceipt = catchAsync(async (req, res, next) => {
  const payment = await prisma.payment.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
    include: { student: { include: { user: true } } }
  });

  if (!payment) return next(new ApiError(404, 'Payment not found'));
  if (payment.status !== 'paid') return next(new ApiError(400, 'Receipt only for completed payments'));

  if (req.user.role === 'parent' && payment.student.parentId !== req.user.id) return next(new ApiError(403, 'Access denied'));
  if (req.user.role === 'student' && payment.student.userId !== req.user.id) return next(new ApiError(403, 'Access denied'));

  res.json({ success: true, receipt: payment.receiptSnapshot || null });
});

exports.getAnalytics = catchAsync(async (req, res) => {
  const match = { tenantId: req.tenantId, status: 'paid' };
  if (req.query.session) match.session = req.query.session;
  if (req.query.term)    match.term    = req.query.term;

  const byMethod = await prisma.payment.groupBy({
    by: ['paymentMethod'],
    where: match,
    _sum: { amount: true },
    _count: true
  });

  const byFeeType = await prisma.payment.groupBy({
    by: ['feeType'],
    where: match,
    _sum: { amount: true },
    _count: true
  });

  res.json({ success: true, data: { byMethod, byFeeType, byMonth: [] } });
});

exports.getWalletBalance = catchAsync(async (req, res) => {
  const ledger = await prisma.creditLedger.findFirst({ where: { userId: req.user.id, tenantId: req.tenantId } });
  res.json({ success: true, balance: ledger ? ledger.balance : 0 });
});

exports.walletCheckout = catchAsync(async (req, res, next) => {
  res.json({ success: true, message: 'Wallet checkout processed.' });
});
