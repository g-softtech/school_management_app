const WeeklyPlanner = require('../../models/WeeklyPlanner');
const Subject       = require('../../models/Subject');
const ApiError      = require('../../utils/ApiError');
const catchAsync    = require('../../utils/catchAsync');

// POST /api/weekly-planner
exports.createEntry = catchAsync(async function(req, res, next) {
  var b = req.body;
  if (!b.classId || !b.subjectId || !b.week || !b.term || !b.session) {
    return next(new ApiError(400, 'Please provide classId, subjectId, week, term and session'));
  }

  if (req.user.role === 'teacher') {
    var subject = await Subject.findOne({ _id: b.subjectId, teacherId: req.user._id });
    if (!subject) return next(new ApiError(403, 'You can only plan for subjects assigned to you'));
  }

  var entry = await WeeklyPlanner.findOneAndUpdate(
    { teacherId: req.user._id, classId: b.classId, subjectId: b.subjectId, week: Number(b.week), term: b.term, session: b.session },
    {
      teacherId:        req.user._id,
      classId:          b.classId,
      subjectId:        b.subjectId,
      week:             Number(b.week),
      term:             b.term,
      session:          b.session,
      topicsCovered:    Array.isArray(b.topicsCovered) ? b.topicsCovered : (b.topicsCovered ? [b.topicsCovered] : []),
      notes:            b.notes || null,
      completionStatus: b.completionStatus || 'planned',
    },
    { new: true, upsert: true, runValidators: true }
  )
    .populate('classId',   'name section')
    .populate('subjectId', 'name code');

  res.status(201).json({ success: true, message: 'Weekly planner entry saved', data: entry });
});

// GET /api/weekly-planner
exports.getEntries = catchAsync(async function(req, res, next) {
  var filter = {};
  if (req.user.role === 'teacher') filter.teacherId = req.user._id;
  if (req.query.classId)   filter.classId   = req.query.classId;
  if (req.query.subjectId) filter.subjectId = req.query.subjectId;
  if (req.query.term)      filter.term      = req.query.term;
  if (req.query.session)   filter.session   = req.query.session;
  if (req.query.week)      filter.week      = Number(req.query.week);

  var entries = await WeeklyPlanner.find(filter)
    .populate('classId',   'name section')
    .populate('subjectId', 'name code')
    .populate('teacherId', 'name')
    .sort({ week: 1 });

  res.status(200).json({ success: true, total: entries.length, data: entries });
});

// PATCH /api/weekly-planner/:id
exports.updateEntry = catchAsync(async function(req, res, next) {
  var entry = await WeeklyPlanner.findById(req.params.id);
  if (!entry) return next(new ApiError(404, 'Planner entry not found'));

  if (req.user.role === 'teacher' && String(entry.teacherId) !== String(req.user._id)) {
    return next(new ApiError(403, 'You can only update your own planner entries'));
  }

  var b = req.body;
  var fields = {};
  if (b.topicsCovered    !== undefined) fields.topicsCovered    = Array.isArray(b.topicsCovered) ? b.topicsCovered : [b.topicsCovered];
  if (b.notes            !== undefined) fields.notes            = b.notes;
  if (b.completionStatus !== undefined) fields.completionStatus = b.completionStatus;

  var updated = await WeeklyPlanner.findByIdAndUpdate(req.params.id, fields, { new: true })
    .populate('classId', 'name section').populate('subjectId', 'name code');

  res.status(200).json({ success: true, message: 'Planner entry updated', data: updated });
});

// DELETE /api/weekly-planner/:id
exports.deleteEntry = catchAsync(async function(req, res, next) {
  var entry = await WeeklyPlanner.findById(req.params.id);
  if (!entry) return next(new ApiError(404, 'Planner entry not found'));

  if (req.user.role === 'teacher' && String(entry.teacherId) !== String(req.user._id)) {
    return next(new ApiError(403, 'You can only delete your own planner entries'));
  }

  await WeeklyPlanner.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'Planner entry deleted' });
});