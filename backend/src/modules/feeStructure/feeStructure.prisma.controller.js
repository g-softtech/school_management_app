// Lives at: backend/src/modules/feeStructure/feeStructure.prisma.controller.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Fee Management Reference Controller — Phase 3
//
// All operations are automatically scoped to req.tenantId (injected by
// tenantContext middleware). No query can reach data from another tenant.
// ─────────────────────────────────────────────────────────────────────────────

const prisma     = require('../../config/prisma');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');

const VALID_FEE_TYPES = [
  'tuition','exam','sports','library','development',
  'transport','hostel','pta','uniform','feeding','ict','other',
];
const VALID_TERMS      = ['first','second','third','all'];
const VALID_SCOPES     = ['all_classes','specific_class','specific_student'];
const VALID_FREQUENCY  = ['per_term','per_session','one_time'];

// ─── GET /api/fee-structures ──────────────────────────────────────────────────
// List all fee structures for this tenant, with optional filtering.
exports.getAllFeeStructures = catchAsync(async (req, res) => {
  const { tenantId } = req;
  const { session, term, feeType, isActive, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    tenantId,                                               // ← mandatory isolation
    ...(session  && { session }),
    ...(term     && { term }),
    ...(feeType  && { feeType }),
    ...(isActive !== undefined && { isActive: isActive === 'true' }),
  };

  const [total, feeStructures] = await Promise.all([
    prisma.feeStructure.count({ where }),
    prisma.feeStructure.findMany({
      where,
      orderBy: [{ session: 'desc' }, { name: 'asc' }],
      skip,
      take: Number(limit),
    }),
  ]);

  res.status(200).json({
    success: true,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    data: feeStructures,
  });
});

// ─── POST /api/fee-structures ─────────────────────────────────────────────────
// Create a new fee catalogue entry, auto-stamped to this tenant.
exports.createFeeStructure = catchAsync(async (req, res, next) => {
  const { tenantId } = req;  // ← injected by tenantContext middleware

  const {
    name, feeType, amount, scope, session, term,
    frequency, description, allowInstallment, minInstallment,
    classId, studentId,
  } = req.body;

  // ── Input validation ───────────────────────────────────────────────────────
  if (!name || !feeType || amount === undefined || !session) {
    return next(new ApiError(400, 'name, feeType, amount, and session are required'));
  }
  if (!VALID_FEE_TYPES.includes(feeType)) {
    return next(new ApiError(400, `feeType must be one of: ${VALID_FEE_TYPES.join(', ')}`));
  }
  if (term && !VALID_TERMS.includes(term)) {
    return next(new ApiError(400, `term must be one of: ${VALID_TERMS.join(', ')}`));
  }
  if (scope && !VALID_SCOPES.includes(scope)) {
    return next(new ApiError(400, `scope must be one of: ${VALID_SCOPES.join(', ')}`));
  }
  if (frequency && !VALID_FREQUENCY.includes(frequency)) {
    return next(new ApiError(400, `frequency must be one of: ${VALID_FREQUENCY.join(', ')}`));
  }

  // ── Cross-tenant safety checks ─────────────────────────────────────────────
  // If a classId or studentId is provided, verify they belong to THIS tenant —
  // a malicious actor cannot attach fees to resources from a different school.
  if (classId) {
    const cls = await prisma.class.findFirst({ where: { id: classId, tenantId } });
    if (!cls) return next(new ApiError(404, `Class not found in this tenant`));
  }
  if (studentId) {
    const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
    if (!student) return next(new ApiError(404, `Student not found in this tenant`));
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  const feeStructure = await prisma.feeStructure.create({
    data: {
      tenantId,                                             // ← tenant stamp
      name,
      feeType,
      amount:          Number(amount),
      scope:           scope       || 'all_classes',
      session,
      term:            term        || 'all',
      frequency:       frequency   || 'per_term',
      description:     description || null,
      allowInstallment: allowInstallment ?? false,
      minInstallment:   minInstallment ? Number(minInstallment) : null,
      classId:         classId   || null,
      studentId:       studentId || null,
      createdById:     req.user?.id || null,               // auth user from protect middleware
    },
  });

  res.status(201).json({
    success: true,
    message: 'Fee structure created successfully',
    data: feeStructure,
  });
});

// ─── POST /api/invoices ────────────────────────────────────────────────────────
// Generate a student invoice for a specific term, assembling line items
// from the applicable FeeStructures for this tenant.
exports.createInvoice = catchAsync(async (req, res, next) => {
  const { tenantId } = req;  // ← injected by tenantContext middleware

  const { studentId, classId, session, term } = req.body;

  if (!studentId || !classId || !session || !term) {
    return next(new ApiError(400, 'studentId, classId, session, and term are required'));
  }

  // ── Validate student and class belong to THIS tenant ─────────────────────
  const [student, cls] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, tenantId } }),
    prisma.class.findFirst({   where: { id: classId,   tenantId } }),
  ]);
  if (!student) return next(new ApiError(404, 'Student not found in this tenant'));
  if (!cls)     return next(new ApiError(404, 'Class not found in this tenant'));

  // ── Idempotency guard — no duplicate invoice per student/session/term ─────
  const existing = await prisma.invoice.findUnique({
    where: { tenantId_studentId_session_term: { tenantId, studentId, session, term } },
  });
  if (existing) {
    return next(new ApiError(409, `Invoice already exists for this student in ${term} term, ${session}`));
  }

  // ── Resolve applicable fee structures for this tenant + class + term ──────
  const applicableFees = await prisma.feeStructure.findMany({
    where: {
      tenantId,
      session,
      isActive: true,
      term: { in: [term, 'all'] },          // 'all' fees apply every term
      OR: [
        { scope: 'all_classes' },
        { scope: 'specific_class',   classId   },
        { scope: 'specific_student', studentId },
      ],
    },
  });

  if (applicableFees.length === 0) {
    return next(new ApiError(400, `No active fee structures found for ${term} term, ${session}`));
  }

  // ── Build line items and totals ───────────────────────────────────────────
  const lineItems = applicableFees.map((fee) => ({
    tenantId,
    feeStructureId: fee.id,
    feeName:        fee.name,
    feeType:        fee.feeType,
    amount:         fee.amount,
    discount:       0,
    netAmount:      fee.amount,
    paid:           0,
    balance:        fee.amount,
    status:         'unpaid',
  }));

  const totalAmount = lineItems.reduce((sum, item) => sum + item.netAmount, 0);

  // ── Atomic creation — invoice + all line items in one transaction ─────────
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        tenantId,
        studentId,
        classId,
        session,
        term,
        totalAmount,
        totalBalance: totalAmount,
        createdById: req.user?.id || null,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true },
    });
    return inv;
  });

  res.status(201).json({
    success: true,
    message: `Invoice created with ${lineItems.length} line item(s). Total: ₦${totalAmount.toLocaleString()}`,
    data: invoice,
  });
});

// ─── GET /api/invoices/:studentId ─────────────────────────────────────────────
// Fetch all invoices for a specific student, scoped to this tenant.
exports.getStudentInvoices = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { studentId } = req.params;

  // Verify the student belongs to this tenant before returning any financial data
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId },       // ← double-scoped lookup
    select: { id: true, admissionNumber: true, user: { select: { name: true } } },
  });
  if (!student) return next(new ApiError(404, 'Student not found in this tenant'));

  const invoices = await prisma.invoice.findMany({
    where: { tenantId, studentId },
    orderBy: [{ session: 'desc' }, { term: 'asc' }],
    include: {
      lineItems:   true,
      payments:    { where: { status: 'paid' }, orderBy: { paidAt: 'desc' } },
      adjustments: { where: { status: 'applied' } },
    },
  });

  res.status(200).json({
    success: true,
    student: { id: student.id, name: student.user?.name, admissionNumber: student.admissionNumber },
    count:   invoices.length,
    data:    invoices,
  });
});
