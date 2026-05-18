const AcademicSession = require('../../models/AcademicSession');
const ApiError        = require('../../utils/ApiError');
const catchAsync      = require('../../utils/catchAsync');

// Helper — clean term dates (convert empty strings to null)
function cleanTerms(terms) {
  if (!Array.isArray(terms)) return [];
  return terms.map(function(t) {
    return {
      name:      t.name,
      startDate: t.startDate && t.startDate !== '' ? t.startDate : null,
      endDate:   t.endDate   && t.endDate   !== '' ? t.endDate   : null,
      isActive:  t.isActive || false,
    };
  });
}

// GET /api/academic-sessions
exports.getAll = catchAsync(async (req, res) => {
  const sessions = await AcademicSession.find().sort({ startDate: -1 });
  res.json({ success: true, data: sessions });
});

// GET /api/academic-sessions/current
exports.getCurrent = catchAsync(async (req, res) => {
  const session = await AcademicSession.findOne({ isCurrent: true });
  res.json({ success: true, data: session || null });
});

// POST /api/academic-sessions
exports.create = catchAsync(async (req, res, next) => {
  const { name, startDate, endDate, isCurrent, terms } = req.body;

  if (!name)      return next(new ApiError(400, 'Session name is required'));
  if (!startDate) return next(new ApiError(400, 'Session start date is required'));
  if (!endDate)   return next(new ApiError(400, 'Session end date is required'));

  // If setting as current, unset all others first
  if (isCurrent) {
    await AcademicSession.updateMany({}, { isCurrent: false });
  }

  const session = await AcademicSession.create({
    name,
    startDate,
    endDate,
    isCurrent: isCurrent || false,
    terms:     cleanTerms(terms),
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Academic session created',
    data:    session,
  });
});

// PATCH /api/academic-sessions/:id
exports.update = catchAsync(async (req, res, next) => {
  const { name, startDate, endDate, isCurrent, isActive, terms } = req.body;

  const fields = {};
  if (name      !== undefined) fields.name      = name;
  if (startDate !== undefined && startDate !== '') fields.startDate = startDate;
  if (endDate   !== undefined && endDate   !== '') fields.endDate   = endDate;
  if (isCurrent !== undefined) fields.isCurrent = isCurrent;
  if (isActive  !== undefined) fields.isActive  = isActive;
  if (terms     !== undefined) fields.terms     = cleanTerms(terms);

  // If setting as current, unset all others first
  if (fields.isCurrent) {
    await AcademicSession.updateMany({ _id: { $ne: req.params.id } }, { isCurrent: false });
  }

  const session = await AcademicSession.findByIdAndUpdate(
    req.params.id, fields, { new: true, runValidators: true }
  );
  if (!session) return next(new ApiError(404, 'Session not found'));

  res.json({ success: true, message: 'Session updated', data: session });
});

// DELETE /api/academic-sessions/:id
exports.remove = catchAsync(async (req, res, next) => {
  const session = await AcademicSession.findByIdAndDelete(req.params.id);
  if (!session) return next(new ApiError(404, 'Session not found'));
  res.json({ success: true, message: 'Session deleted' });
});

// PATCH /api/academic-sessions/:id/set-current
exports.setCurrent = catchAsync(async (req, res, next) => {
  await AcademicSession.updateMany({}, { isCurrent: false });
  const session = await AcademicSession.findByIdAndUpdate(
    req.params.id, { isCurrent: true }, { new: true }
  );
  if (!session) return next(new ApiError(404, 'Session not found'));
  res.json({
    success: true,
    message: `${session.name} is now the current session`,
    data:    session,
  });
});
