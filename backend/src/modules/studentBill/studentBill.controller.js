const prisma = require('../../config/prisma');
const { getRedisClient } = require('../../config/redis');

function ok(res, data, code)  { return res.status(code||200).json(Object.assign({ success: true }, data)); }
function bad(res, code, msg)  { return res.status(code).json({ success: false, message: msg }); }

exports.generateBills = async function(req, res) {
  var generationLockKey = null;
  const redis = getRedisClient();

  try {
    var classId = req.body.classId;
    var session = req.body.session;
    var term    = req.body.term;
    if (!classId || !session || !term)
      return bad(res, 400, 'classId, session and term are required');

    if (redis) {
      generationLockKey = `bill:generate:${req.tenantId}:${classId}:${session}:${term}`;
      try {
        const locked = await redis.set(generationLockKey, "1", "NX", "EX", 600);
        if (!locked && !req.body.forceRegenerate) {
          return bad(res, 409, 'Bill generation already in progress for this class and term.');
        }
      } catch (redisErr) {
        console.warn('[Redis] Generation lock failed, proceeding without lock:', redisErr.message);
      }
    }

    var existingBillsCount = await prisma.invoice.count({
      where: { tenantId: req.tenantId, classId, session, term }
    });

    if (existingBillsCount > 0 && !req.body.forceRegenerate) {
      return bad(res, 400, 'Bills already generated for this term. Use forceRegenerate to bypass.');
    }

    var cls = await prisma.class.findFirst({ where: { id: classId, tenantId: req.tenantId } });
    if (!cls) return bad(res, 404, 'Class not found');

    var students = await prisma.student.findMany({ where: { classId, isActive: true, tenantId: req.tenantId } });
    if (!students.length) return bad(res, 400, 'No active students in this class');

    var fees = await prisma.feeStructure.findMany({
      where: {
        tenantId: req.tenantId,
        session: session,
        isActive: true,
        term: { in: [term, 'all'] },
        OR: [
          { scope: 'all_classes' },
          { scope: 'specific_class', classId: classId },
        ]
      }
    });

    if (!fees.length)
      return bad(res, 400, 'No fee structures found for ' + term + ' term ' + session + '. Create fee structures first.');

    var created = 0, updated = 0, skipped = 0, results = [];
    var generatedBillIds = [];

    var prevTerm;
    var prevSession = session;
    if (term === 'second') prevTerm = 'first';
    else if (term === 'third') prevTerm = 'second';
    else if (term === 'first') {
      prevTerm = 'third';
      var parts = session.split('/');
      if (parts.length === 2) {
        var start = parseInt(parts[0], 10) - 1;
        var end = parseInt(parts[1], 10) - 1;
        prevSession = start + '/' + end;
      }
    }

    await prisma.$transaction(async (tx) => {
      const currentBills = await tx.invoice.findMany({ where: { tenantId: req.tenantId, classId, session, term }, include: { items: true } });
      const currentBillMap = new Map();
      currentBills.forEach(b => currentBillMap.set(b.studentId, b));

      const prevBills = await tx.invoice.findMany({ where: { tenantId: req.tenantId, classId, session: prevSession, term: prevTerm }, include: { items: true } });
      const prevBillMap = new Map();
      prevBills.forEach(b => prevBillMap.set(b.studentId, b));

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const studentIdStr = student.id;

        const baseItems = fees.map(fee => ({
          tenantId: req.tenantId,
          feeStructureId: fee.id,
          feeName: fee.name,
          feeType: fee.feeType,
          amount: fee.amount,
          discount: 0,
          netAmount: fee.amount,
          paid: 0,
          balance: fee.amount,
          status: 'unpaid'
        }));

        const existingBill = currentBillMap.get(studentIdStr);

        if (existingBill) {
          const existingStructureIds = existingBill.items.map(x => x.feeStructureId);
          const newItems = baseItems.filter(x => !existingStructureIds.includes(x.feeStructureId));

          if (newItems.length > 0) {
            await tx.invoiceLineItem.createMany({
              data: newItems.map(item => ({ ...item, invoiceId: existingBill.id }))
            });

            const updatedItems = [...existingBill.items, ...newItems];
            const totalAmount = updatedItems.reduce((sum, item) => sum + item.netAmount, 0);
            const totalPaid = updatedItems.reduce((sum, item) => sum + (item.paid || 0), 0);
            const totalBalance = totalAmount - totalPaid;
            
            let status = 'unpaid';
            if (totalBalance < 0) status = 'overpaid';
            else if (totalBalance === 0) status = 'paid';
            else if (totalPaid > 0) status = 'partial';

            const nextRevision = (existingBill.revision || 0) + 1;
            
            await tx.invoice.update({
              where: { id: existingBill.id },
              data: {
                totalAmount, totalPaid, totalBalance, status, revision: nextRevision
              }
            });

            generatedBillIds.push({ billId: existingBill.id, studentId: studentIdStr, revision: nextRevision });
            results.push({ student: student.admissionNumber, billId: existingBill.id, totalAmount, status });
            updated++;
          } else {
            skipped++;
          }
        } else {
          const prevBill = prevBillMap.get(studentIdStr);
          const carryOverAmount = prevBill ? prevBill.totalBalance : 0;

          const totalAmount = baseItems.reduce((sum, item) => sum + item.netAmount, 0);
          const totalPaid = 0;
          const totalBalance = totalAmount - totalPaid;
          let status = 'unpaid';
          if (totalBalance < 0) status = 'overpaid';
          else if (totalBalance === 0) status = 'paid';

          const newBill = await tx.invoice.create({
            data: {
              tenantId: req.tenantId,
              studentId: student.id,
              classId: classId,
              session: session,
              term: term,
              carryOver: carryOverAmount,
              totalAmount: totalAmount,
              totalPaid: totalPaid,
              totalBalance: totalBalance,
              status: status,
              revision: 0,
              items: { create: baseItems }
            }
          });

          generatedBillIds.push({ billId: newBill.id, studentId: studentIdStr, revision: 0 });
          results.push({ student: student.admissionNumber, billId: newBill.id, totalAmount, status });
          created++;
        }
      }

      if (generatedBillIds.length > 0) {
        const outboxDocs = generatedBillIds.map(g => ({
          tenantId: req.tenantId,
          type: 'REBUILD_BILL',
          billId: g.billId,
          eventKey: `REBUILD_BILL:${g.billId}:${g.revision}`,
          status: 'pending',
        }));
        
        // Prisma createMany ignores duplicates with skipDuplicates
        await tx.outboxEvent.createMany({
          data: outboxDocs,
          skipDuplicates: true
        });
      }
    });

    const { enqueueSyncJob } = require('../../utils/syncQueue');
    for (const record of generatedBillIds) {
      await enqueueSyncJob(record.billId).catch(err => console.error('Failed to enqueue sync job:', err.message));
    }

    return ok(res, { message: 'Bills generated: ' + created + ' created, ' + updated + ' updated, ' + skipped + ' unchanged',
                     summary: { created: created, updated: updated, skipped: skipped, total: students.length }, data: results }, 201);
  } catch (e) {
    console.error('[generateBills]', e.stack || e.message);
    return bad(res, 500, e.message || 'Failed to generate bills');
  } finally {
    if (redis && generationLockKey) {
      redis.del(generationLockKey).catch(() => {});
    }
  }
};

exports.generateSingleBill = async function(req, res) {
  try {
    var studentId = req.body.studentId, session = req.body.session, term = req.body.term;
    if (!studentId || !session || !term) return bad(res, 400, 'studentId, session and term required');
    
    var student = await prisma.student.findFirst({ where: { id: studentId, tenantId: req.tenantId }, include: { class: true } });
    if (!student) return bad(res, 404, 'Student not found');
    if (!student.classId) return bad(res, 400, 'Student has no class');
    
    var classId = student.classId;
    var fees = await prisma.feeStructure.findMany({ 
      where: { 
        tenantId: req.tenantId,
        session: session, 
        isActive: true, 
        term: { in: [term,'all'] },
        OR: [{ scope:'all_classes' },{ scope:'specific_class', classId: classId },{ scope:'specific_student', studentId: studentId }] 
      } 
    });

    var items = fees.map(function(fee) {
      return { tenantId: req.tenantId, feeStructureId: fee.id, feeName: fee.name, feeType: fee.feeType,
               amount: fee.amount, discount: 0, netAmount: fee.amount, paid: 0, balance: fee.amount, status: 'unpaid' };
    });

    let updatedBill;

    await prisma.$transaction(async (tx) => {
      var bill = await tx.invoice.findFirst({ where: { studentId: studentId, session: session, term: term, tenantId: req.tenantId }, include: { items: true } });
      if (bill) {
        var existing = bill.items.map(function(x) { return x.feeStructureId; });
        var newItems = items.filter(function(x) { return !existing.includes(x.feeStructureId); });
        
        if (newItems.length > 0) {
           await tx.invoiceLineItem.createMany({
             data: newItems.map(item => ({ ...item, invoiceId: bill.id }))
           });
        }
        
        bill.revision = (bill.revision || 0) + 1;
        updatedBill = await tx.invoice.update({
          where: { id: bill.id },
          data: { revision: bill.revision },
          include: { items: true }
        });
      } else {
        var prevBills = await tx.invoice.findMany({ where: { studentId: studentId, tenantId: req.tenantId }, orderBy: [{ session: 'desc' }, { term: 'desc' }], take: 1 });
        var prevBill = prevBills[0];
        var carryOverAmount = prevBill ? prevBill.totalBalance : 0;
        
        updatedBill = await tx.invoice.create({
          data: {
            tenantId: req.tenantId, studentId: studentId, classId: classId, session: session, term: term, 
            carryOver: carryOverAmount, items: { create: items }
          },
          include: { items: true }
        });
      }
      
      await tx.outboxEvent.createMany({
        data: [{
          tenantId: req.tenantId,
          type: 'REBUILD_BILL',
          billId: updatedBill.id,
          eventKey: `REBUILD_BILL:${updatedBill.id}:${updatedBill.revision || 0}`,
          status: 'pending'
        }],
        skipDuplicates: true
      });
    });
    
    return ok(res, { message: 'Bill generated successfully', data: updatedBill }, 201);
  } catch (e) { return bad(res, 500, e.message); }
};

exports.getAllBills = async function(req, res) {
  try {
    var page = Math.max(1, Number(req.query.page)||1), limit = Math.max(1, Number(req.query.limit)||20);
    var filter = { tenantId: req.tenantId };
    if (req.query.session) filter.session = req.query.session;
    if (req.query.term)    filter.term    = req.query.term;
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.status)  filter.status  = req.query.status;
    
    var total = await prisma.invoice.count({ where: filter });
    var bills = await prisma.invoice.findMany({
      where: filter,
      include: {
        student: { select: { admissionNumber: true, userId: true, user: { select: { name: true } } } },
        class: { select: { name: true, section: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page-1)*limit,
      take: limit
    });
    
    var agg = await prisma.invoice.aggregate({
      where: filter,
      _sum: { totalAmount: true, totalPaid: true, totalBalance: true }
    });

    var statuses = await prisma.invoice.groupBy({
      by: ['status'],
      where: filter,
      _count: { _all: true }
    });

    var countPaid = statuses.find(s => s.status === 'paid')?._count._all || 0;
    var countPartial = statuses.find(s => s.status === 'partial')?._count._all || 0;
    var countUnpaid = statuses.find(s => s.status === 'unpaid')?._count._all || 0;

    var summary = {
      totalBilled: agg._sum.totalAmount || 0,
      totalPaid: agg._sum.totalPaid || 0,
      totalBalance: agg._sum.totalBalance || 0,
      countPaid, countPartial, countUnpaid
    };

    return ok(res, { pagination: { total: total, page: page, pages: Math.ceil(total/limit) }, summary: summary, data: bills });
  } catch (e) { return bad(res, 500, e.message); }
};

exports.getStudentBills = async function(req, res) {
  try {
    if (req.user.role !== 'admin') {
      var student = await prisma.student.findFirst({ where: { id: req.params.studentId, tenantId: req.tenantId } });
      if (!student) return bad(res, 404, 'Student not found');
      if (req.user.role === 'parent' && student.parentId !== req.user.id) return bad(res, 403, 'Access denied');
      if (req.user.role === 'student' && student.userId !== req.user.id) return bad(res, 403, 'Access denied');
    }

    var filter = { studentId: req.params.studentId, tenantId: req.tenantId };
    if (req.query.session) filter.session = req.query.session;
    if (req.query.term)    filter.term    = req.query.term;
    
    var bills = await prisma.invoice.findMany({
      where: filter,
      include: {
        class: { select: { name: true, section: true } },
        items: { include: { feeStructure: { select: { name: true, allowInstallment: true, minInstallment: true } } } }
      },
      orderBy: [{ session: 'desc' }, { term: 'desc' }]
    });

    return ok(res, { totals: { 
      totalBilled: bills.reduce((s,b)=>s+b.totalAmount,0),
      totalPaid: bills.reduce((s,b)=>s+b.totalPaid,0),
      totalBalance: bills.reduce((s,b)=>s+b.totalBalance,0) 
    }, data: bills });
  } catch (e) { return bad(res, 500, e.message); }
};

exports.getBill = async function(req, res) {
  try {
    var bill = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        student: { select: { admissionNumber: true, userId: true, classId: true, parentId: true, user: { select: { name: true, email: true } } } },
        class: { select: { name: true, section: true } },
        items: { include: { feeStructure: { select: { name: true, feeType: true, allowInstallment: true, minInstallment: true } } } }
      }
    });

    if (!bill) return bad(res, 404, 'Bill not found');

    if (req.user.role !== 'admin') {
      if (req.user.role === 'parent' && bill.student.parentId !== req.user.id) return bad(res, 403, 'Access denied');
      if (req.user.role === 'student' && bill.student.userId !== req.user.id) return bad(res, 403, 'Access denied');
    }

    return ok(res, { data: bill });
  } catch (e) { return bad(res, 500, e.message); }
};

exports.applyAdjustment = async function(req, res) {
  try {
    const { itemId, type, amount, reason } = req.body;
    if (!['discount', 'waiver', 'penalty', 'scholarship'].includes(type)) {
      return bad(res, 400, 'Invalid adjustment type');
    }

    const bill = await prisma.invoice.findFirst({ where: { id: req.params.id, tenantId: req.tenantId }, include: { items: true } });
    if (!bill) return bad(res, 404, 'Bill not found');
    
    const item = bill.items.find(i => i.id === itemId);
    if (!item) return bad(res, 404, 'Line item not found');

    if (amount <= 0) return bad(res, 400, 'Amount must be positive');

    await prisma.billAdjustment.create({
      data: {
        tenantId: req.tenantId,
        billId: bill.id,
        itemId,
        type,
        amount,
        reason: reason || 'Manual adjustment',
        approvedBy: req.user.id
      }
    });

    await prisma.invoice.update({ where: { id: bill.id }, data: { revision: { increment: 1 } } });

    const { enqueueSyncJob } = require('../../utils/syncQueue');
    await enqueueSyncJob(bill.id);

    return ok(res, { message: type + ' logged successfully. Pending rebuild.' });
  } catch (e) {
    return bad(res, e.message.includes('not found') ? 404 : 500, e.message);
  }
};

exports.syncBill = async function(req, res) {
  try {
    const ledgerService = require('../../services/ledgerService');
    const bill = await prisma.invoice.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!bill) return bad(res, 404, 'Bill not found');

    const finalBill = await ledgerService.rebuildBillBalances(bill.id);
    return ok(res, { message: 'Bill reconstructed from events', data: finalBill });
  } catch (e) { return bad(res, 500, e.message); }
};

exports.deleteBill = async function(req, res) {
  try {
    var bill = await prisma.invoice.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!bill) return bad(res, 404, 'Bill not found');
    if (bill.totalPaid > 0) return bad(res, 400, 'Cannot delete bill with payments');
    await prisma.invoice.delete({ where: { id: req.params.id } });
    return ok(res, { message: 'Bill deleted' });
  } catch (e) { return bad(res, 500, e.message); }
};

exports.getDefaulters = async function(req, res) {
  try {
    var filter = {
      tenantId: req.tenantId,
      status: { in: ['unpaid', 'partial'] },
      totalBalance: { gt: Number(req.query.minBalance) || 0 },
    };
    if (req.query.session) filter.session = req.query.session;
    if (req.query.term)    filter.term    = req.query.term;
    if (req.query.classId) filter.classId = req.query.classId;

    var bills = await prisma.invoice.findMany({
      where: filter,
      include: {
        student: { select: { admissionNumber: true, userId: true, user: { select: { name: true, email: true } } } },
        class: { select: { name: true, section: true } }
      },
      orderBy: { totalBalance: 'desc' }
    });

    return ok(res, {
      count: bills.length,
      totalOutstanding: bills.reduce((s,b)=> s + b.totalBalance, 0),
      data:  bills,
    });
  } catch (e) { return bad(res, 500, e.message); }
};

exports.siblingTransfer = async function(req, res) {
  try {
    const { sourceBillId, targetBillId, sourceItemId, targetItemId, amount, reason } = req.body;
    if (!sourceBillId || !targetBillId || !sourceItemId || !targetItemId || !amount) {
      return bad(res, 400, 'sourceBillId, targetBillId, sourceItemId, targetItemId, and amount are required');
    }

    const sourceBill = await prisma.invoice.findFirst({ where: { id: sourceBillId, tenantId: req.tenantId }, include: { items: true } });
    const targetBill = await prisma.invoice.findFirst({ where: { id: targetBillId, tenantId: req.tenantId }, include: { items: true } });

    if (!sourceBill || !targetBill) return bad(res, 404, 'Source or target bill not found');

    const sourceItem = sourceBill.items.find(i => i.id === sourceItemId);
    const targetItem = targetBill.items.find(i => i.id === targetItemId);

    if (!sourceItem || !targetItem) return bad(res, 404, 'Source or target item not found');

    const transferGroupId = require('crypto').randomUUID();

    await prisma.billAdjustment.createMany({
      data: [
        {
          tenantId: req.tenantId,
          billId: sourceBillId,
          itemId: sourceItemId,
          type: 'transfer_out',
          amount,
          reason: reason || 'Sibling transfer to ' + targetBillId,
          transferGroupId,
          approvedBy: req.user.id
        },
        {
          tenantId: req.tenantId,
          billId: targetBillId,
          itemId: targetItemId,
          type: 'transfer_in',
          amount,
          reason: reason || 'Sibling transfer from ' + sourceBillId,
          transferGroupId,
          approvedBy: req.user.id
        }
      ]
    });

    await prisma.invoice.update({ where: { id: sourceBillId }, data: { revision: { increment: 1 } } });
    await prisma.invoice.update({ where: { id: targetBillId }, data: { revision: { increment: 1 } } });

    const { enqueueSyncJob } = require('../../utils/syncQueue');
    await enqueueSyncJob(sourceBillId);
    await enqueueSyncJob(targetBillId);

    return ok(res, { message: 'Sibling transfer logged successfully. Both bills pending rebuild.' });
  } catch (e) {
    console.error('[siblingTransfer]', e.stack || e.message);
    return bad(res, 500, e.message || 'Failed to process sibling transfer');
  }
};

exports.reconcileBills = async function(req, res) {
  try {
    const { classId, session, term, billIds, reason } = req.body;
    
    let filter = { tenantId: req.tenantId };
    
    if (billIds && Array.isArray(billIds) && billIds.length > 0) {
      filter.id = { in: billIds };
    } else {
      if (!session && !term && !classId) {
        return bad(res, 400, 'Must provide either billIds array OR session/term/classId filters');
      }
      if (session) filter.session = session;
      if (term) filter.term = term;
      if (classId) filter.classId = classId;
    }

    const bills = await prisma.invoice.findMany({ where: filter, select: { id: true } });
    
    if (!bills.length) {
      return bad(res, 404, 'No bills found matching the given criteria');
    }

    const { enqueueSyncJob } = require('../../utils/syncQueue');
    
    for (const bill of bills) {
      await enqueueSyncJob(bill.id);
    }

    if (reason) {
      console.log(`[Reconciliation] ${bills.length} bills enqueued. Reason: ${reason}`);
    }

    return ok(res, { 
      message: 'Reconciliation triggered successfully', 
      count: bills.length 
    });

  } catch (e) {
    console.error('[reconcileBills]', e.stack || e.message);
    return bad(res, 500, e.message || 'Failed to trigger reconciliation');
  }
};
