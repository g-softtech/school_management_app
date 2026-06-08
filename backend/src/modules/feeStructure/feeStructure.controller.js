const FeeStructure = require('../../models/FeeStructure');
const Class        = require('../../models/Class');
const ApiError     = require('../../utils/ApiError');
const catchAsync   = require('../../utils/catchAsync');
const paginate     = require('../../utils/paginate');

exports.getAll = catchAsync(async (req, res) => {
  const p = paginate(req.query);
  const filter = {};
  if (req.query.session) filter.session = req.query.session;
  if (req.query.term)    filter.term    = req.query.term;
  if (req.query.feeType) filter.feeType = req.query.feeType;
  if (req.query.classId) filter.classId = req.query.classId;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const total = await FeeStructure.countDocuments(filter);
  const fees  = await FeeStructure.find(filter)
    .populate('classId', 'name section')
    .populate('createdBy', 'name')
    .sort({ feeType: 1, name: 1 })
    .skip(p.skip).limit(p.limit);

  const summary = await FeeStructure.aggregate([
    { $match: { ...filter, isActive: true } },
    { $group: { _id: '$feeType', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, pagination: { total, page: p.page, pages: Math.ceil(total / p.limit) }, summary, data: fees });
});

exports.getOne = catchAsync(async (req, res, next) => {
  const fee = await FeeStructure.findById(req.params.id).populate('classId', 'name section');
  if (!fee) return next(new ApiError(404, 'Fee structure not found'));
  res.json({ success: true, data: fee });
});

exports.create = catchAsync(async (req, res, next) => {
  const { name, feeType, amount, scope, classId, studentId, session, term, frequency, allowInstallment, minInstallment, description } = req.body;
  if (!name || !feeType || !amount || !session) return next(new ApiError(400, 'name, feeType, amount and session are required'));
  if (scope === 'specific_class' && !classId)   return next(new ApiError(400, 'classId required for specific_class scope'));

  const fee = await FeeStructure.create({
    name, feeType, amount: Number(amount),
    scope: scope || 'all_classes',
    classId: classId || null, studentId: studentId || null,
    session, term: term || 'all',
    frequency: frequency || 'per_term',
    allowInstallment: allowInstallment || false,
    minInstallment: minInstallment || null,
    description: description || null,
    isActive: true, createdBy: req.user._id,
  });

  const populated = await FeeStructure.findById(fee._id).populate('classId', 'name section');
  res.status(201).json({ success: true, message: 'Fee structure created', data: populated });
});

exports.update = catchAsync(async (req, res, next) => {
  const allowed = ['name','feeType','amount','scope','classId','studentId','session','term','frequency','allowInstallment','minInstallment','description','isActive'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (updates.amount) updates.amount = Number(updates.amount);

  const fee = await FeeStructure.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('classId', 'name section');
  if (!fee) return next(new ApiError(404, 'Fee structure not found'));
  res.json({ success: true, message: 'Fee structure updated', data: fee });
});

exports.remove = catchAsync(async (req, res, next) => {
  const fee = await FeeStructure.findByIdAndDelete(req.params.id);
  if (!fee) return next(new ApiError(404, 'Fee structure not found'));
  res.json({ success: true, message: 'Fee structure deleted' });
});

exports.getForClass = catchAsync(async (req, res, next) => {
  const { classId } = req.params;
  const { session, term } = req.query;
  if (!session) return next(new ApiError(400, 'session is required'));

  const cls = await Class.findById(classId);
  if (!cls) return next(new ApiError(404, 'Class not found'));

  const filter = {
    session, isActive: true,
    $or: [{ scope: 'all_classes' }, { scope: 'specific_class', classId }],
  };
  if (term) filter.term = { $in: [term, 'all'] };

  const fees = await FeeStructure.find(filter).populate('classId', 'name section').sort({ feeType: 1 });
  res.json({ success: true, class: `${cls.name} ${cls.section || ''}`.trim(), totalAmount: fees.reduce((s,f) => s+f.amount, 0), count: fees.length, data: fees });
});

exports.getSummary = catchAsync(async (req, res) => {
  const match = { isActive: true };
  if (req.query.session) match.session = req.query.session;

  const byType = await FeeStructure.aggregate([
    { $match: match },
    { $group: { _id: '$feeType', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { totalAmount: -1 } },
  ]);

  res.json({ success: true, data: { total: await FeeStructure.countDocuments(match), byType } });
});
