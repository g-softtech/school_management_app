const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const paginate = require('../../utils/paginate');

exports.getAll = catchAsync(async (req, res) => {
  const p = paginate(req.query);
  const filter = { tenantId: req.tenantId };
  
  if (req.query.session) filter.session = req.query.session;
  if (req.query.term)    filter.term    = req.query.term;
  if (req.query.feeType) filter.feeType = req.query.feeType;
  if (req.query.classId) filter.classId = req.query.classId;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const total = await prisma.feeStructure.count({ where: filter });
  const fees  = await prisma.feeStructure.findMany({
    where: filter,
    include: {
      class: { select: { name: true, section: true } }
    },
    orderBy: [
      { feeType: 'asc' },
      { name: 'asc' }
    ],
    skip: p.skip,
    take: p.limit
  });

  const summaryAgg = await prisma.feeStructure.groupBy({
    by: ['feeType'],
    where: { ...filter, isActive: true },
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { feeType: 'asc' }
  });

  const summary = summaryAgg.map(item => ({
    _id: item.feeType,
    totalAmount: item._sum.amount,
    count: item._count._all
  }));

  res.json({ success: true, pagination: { total, page: p.page, pages: Math.ceil(total / p.limit) }, summary, data: fees });
});

exports.getOne = catchAsync(async (req, res, next) => {
  const fee = await prisma.feeStructure.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
    include: { class: { select: { name: true, section: true } } }
  });
  if (!fee) return next(new ApiError(404, 'Fee structure not found'));
  res.json({ success: true, data: fee });
});

exports.create = catchAsync(async (req, res, next) => {
  const { name, feeType, amount, scope, classId, studentId, session, term, frequency, allowInstallment, minInstallment, description } = req.body;
  if (!name || !feeType || !amount || !session) return next(new ApiError(400, 'name, feeType, amount and session are required'));
  if (scope === 'specific_class' && !classId)   return next(new ApiError(400, 'classId required for specific_class scope'));

  const fee = await prisma.feeStructure.create({
    data: {
      tenantId: req.tenantId,
      name, feeType, amount: Number(amount),
      scope: scope || 'all_classes',
      classId: classId || null, studentId: studentId || null,
      session, term: term || 'all',
      frequency: frequency || 'per_term',
      allowInstallment: allowInstallment || false,
      minInstallment: minInstallment || null,
      description: description || null,
      isActive: true,
    },
    include: { class: { select: { name: true, section: true } } }
  });

  res.status(201).json({ success: true, message: 'Fee structure created', data: fee });
});

exports.update = catchAsync(async (req, res, next) => {
  const allowed = ['name','feeType','amount','scope','classId','studentId','session','term','frequency','allowInstallment','minInstallment','description','isActive'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (updates.amount) updates.amount = Number(updates.amount);

  const existingFee = await prisma.feeStructure.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existingFee) return next(new ApiError(404, 'Fee structure not found'));

  const fee = await prisma.feeStructure.update({
    where: { id: req.params.id },
    data: updates,
    include: { class: { select: { name: true, section: true } } }
  });
  
  res.json({ success: true, message: 'Fee structure updated', data: fee });
});

exports.remove = catchAsync(async (req, res, next) => {
  const existingFee = await prisma.feeStructure.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!existingFee) return next(new ApiError(404, 'Fee structure not found'));

  await prisma.feeStructure.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Fee structure deleted' });
});

exports.getForClass = catchAsync(async (req, res, next) => {
  const { classId } = req.params;
  const { session, term } = req.query;
  if (!session) return next(new ApiError(400, 'session is required'));

  const cls = await prisma.class.findFirst({ where: { id: classId, tenantId: req.tenantId } });
  if (!cls) return next(new ApiError(404, 'Class not found'));

  const filter = {
    tenantId: req.tenantId,
    session,
    isActive: true,
    OR: [{ scope: 'all_classes' }, { scope: 'specific_class', classId }],
  };
  if (term) filter.term = { in: [term, 'all'] };

  const fees = await prisma.feeStructure.findMany({
    where: filter,
    include: { class: { select: { name: true, section: true } } },
    orderBy: { feeType: 'asc' }
  });
  
  res.json({ success: true, class: `${cls.name} ${cls.section || ''}`.trim(), totalAmount: fees.reduce((s,f) => s+f.amount, 0), count: fees.length, data: fees });
});

exports.getSummary = catchAsync(async (req, res) => {
  const match = { tenantId: req.tenantId, isActive: true };
  if (req.query.session) match.session = req.query.session;

  const summaryAgg = await prisma.feeStructure.groupBy({
    by: ['feeType'],
    where: match,
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: 'desc' } }
  });

  const byType = summaryAgg.map(item => ({
    _id: item.feeType,
    totalAmount: item._sum.amount,
    count: item._count._all
  }));

  const total = await prisma.feeStructure.count({ where: match });
  res.json({ success: true, data: { total, byType } });
});
