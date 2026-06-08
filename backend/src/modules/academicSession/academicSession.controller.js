const mongoose    = require('mongoose');
const AcademicSession = require('../../models/AcademicSession');
const ApiError    = require('../../utils/ApiError');
const catchAsync  = require('../../utils/catchAsync');

const VALID_TERM_NAMES = ['first', 'second', 'third'];

// Safely clean terms — filter out invalid names, nullify bad dates
function cleanTerms(terms) {
  if (!Array.isArray(terms)) return [];
  return terms
    .filter(t => t && VALID_TERM_NAMES.includes(t.name))
    .map(t => ({
      name:      t.name,
      startDate: (t.startDate && t.startDate !== '') ? new Date(t.startDate) : null,
      endDate:   (t.endDate   && t.endDate   !== '') ? new Date(t.endDate)   : null,
      isActive:  Boolean(t.isActive),
    }));
}

// GET /api/academic-sessions
exports.getAll = catchAsync(async (req, res) => {
  const sessions = await AcademicSession.find().sort({ createdAt: -1 });
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

  // Validate required fields
  if (!name || String(name).trim() === '')
    return next(new ApiError(400, 'Session name is required'));
  if (!startDate || String(startDate).trim() === '')
    return next(new ApiError(400, 'Start date is required'));
  if (!endDate || String(endDate).trim() === '')
    return next(new ApiError(400, 'End date is required'));

  // Check for duplicate session name
  const existing = await AcademicSession.findOne({ name: String(name).trim() });
  if (existing)
    return next(new ApiError(400, `A session named "${name}" already exists`));

  // Unset current if needed — do BEFORE creating new one
  if (isCurrent) {
    await AcademicSession.updateMany({}, { isCurrent: false });
  }

  const cleanedTerms = cleanTerms(terms);

  const session = new AcademicSession({
    name:      String(name).trim(),
    startDate: new Date(startDate),
    endDate:   new Date(endDate),
    isCurrent: Boolean(isCurrent),
    terms:     cleanedTerms,
    createdBy: req.user._id,
  });

  await session.save({ validateBeforeSave: true });

  res.status(201).json({
    success: true,
    message: 'Academic session created successfully',
    data:    session,
  });
});

// PATCH /api/academic-sessions/:id
exports.update = catchAsync(async (req, res, next) => {
  const session = await AcademicSession.findById(req.params.id);
  if (!session) return next(new ApiError(404, 'Session not found'));

  if (req.body.name      !== undefined) session.name      = String(req.body.name).trim();
  if (req.body.isActive  !== undefined) session.isActive  = Boolean(req.body.isActive);
  if (req.body.isCurrent !== undefined) session.isCurrent = Boolean(req.body.isCurrent);

  if (req.body.startDate && req.body.startDate !== '')
    session.startDate = new Date(req.body.startDate);
  if (req.body.endDate && req.body.endDate !== '')
    session.endDate = new Date(req.body.endDate);

  if (req.body.terms !== undefined)
    session.terms = cleanTerms(req.body.terms);

  // If setting as current, unset others first
  if (session.isCurrent) {
    await AcademicSession.updateMany({ _id: { $ne: session._id } }, { isCurrent: false });
  }

  await session.save();

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
