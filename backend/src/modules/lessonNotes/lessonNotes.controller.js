const LessonNote = require('../../models/LessonNote');
const Subject    = require('../../models/Subject');
const Class      = require('../../models/Class');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const paginate   = require('../../utils/paginate');

// Helper — build file info from multer
function getFileInfo(req) {
  if (!req.file) return { fileUrl: null, fileName: null };
  return {
    fileUrl:  '/uploads/lessons/' + req.file.filename,
    fileName: req.file.originalname,
  };
}

// POST /api/lesson-notes
// Teacher, Admin
exports.createLessonNote = catchAsync(async function(req, res, next) {
  var b = req.body;
  if (!b.classId || !b.subjectId || !b.topic || !b.week || !b.term || !b.session) {
    return next(new ApiError(400, 'Please provide classId, subjectId, topic, week, term and session'));
  }

  // Teachers can only create notes for subjects assigned to them
  if (req.user.role === 'teacher') {
    var subject = await Subject.findOne({ _id: b.subjectId, teacherId: req.user._id });
    if (!subject) return next(new ApiError(403, 'You can only create lesson notes for subjects assigned to you'));
  }

  var fileInfo = getFileInfo(req);

  var note = await LessonNote.create({
    teacherId:   req.user._id,
    classId:     b.classId,
    subjectId:   b.subjectId,
    topic:       b.topic,
    week:        Number(b.week),
    term:        b.term,
    session:     b.session,
    content:     b.content || null,
    fileUrl:     fileInfo.fileUrl,
    fileName:    fileInfo.fileName,
    isPublished: b.isPublished !== undefined ? b.isPublished : true,
  });

  var populated = await LessonNote.findById(note._id)
    .populate('teacherId', 'name')
    .populate('classId',   'name section')
    .populate('subjectId', 'name code');

  res.status(201).json({ success: true, message: 'Lesson note created successfully', data: populated });
});

// GET /api/lesson-notes
// Teacher (own), Student (their class), Admin
exports.getLessonNotes = catchAsync(async function(req, res, next) {
  var p = paginate(req.query);
  var filter = {};

  if (req.query.classId)   filter.classId   = req.query.classId;
  if (req.query.subjectId) filter.subjectId = req.query.subjectId;
  if (req.query.term)      filter.term      = req.query.term;
  if (req.query.session)   filter.session   = req.query.session;
  if (req.query.week)      filter.week      = Number(req.query.week);

  // Teachers only see their own notes
  if (req.user.role === 'teacher') filter.teacherId = req.user._id;

  // Students only see published notes for their class
  if (req.user.role === 'student') {
    var Student = require('../../models/Student');
    var student = await Student.findOne({ userId: req.user._id });
    if (!student) return next(new ApiError(404, 'Student profile not found'));
    filter.classId    = student.classId;
    filter.isPublished = true;
  }

  var total = await LessonNote.countDocuments(filter);
  var notes = await LessonNote.find(filter)
    .populate('teacherId', 'name')
    .populate('classId',   'name section')
    .populate('subjectId', 'name code')
    .sort({ week: 1, createdAt: -1 })
    .skip(p.skip)
    .limit(p.limit);

  res.status(200).json({
    success: true,
    pagination: { total, page: p.page, limit: p.limit, pages: Math.ceil(total / p.limit) },
    data: notes,
  });
});

// GET /api/lesson-notes/:id
exports.getLessonNote = catchAsync(async function(req, res, next) {
  var note = await LessonNote.findById(req.params.id)
    .populate('teacherId', 'name')
    .populate('classId',   'name section')
    .populate('subjectId', 'name code');

  if (!note) return next(new ApiError(404, 'Lesson note not found'));

  // Teacher can only see their own
  if (req.user.role === 'teacher' && String(note.teacherId._id) !== String(req.user._id)) {
    return next(new ApiError(403, 'You can only view your own lesson notes'));
  }

  res.status(200).json({ success: true, data: note });
});

// PATCH /api/lesson-notes/:id
exports.updateLessonNote = catchAsync(async function(req, res, next) {
  var note = await LessonNote.findById(req.params.id);
  if (!note) return next(new ApiError(404, 'Lesson note not found'));

  if (req.user.role === 'teacher' && String(note.teacherId) !== String(req.user._id)) {
    return next(new ApiError(403, 'You can only update your own lesson notes'));
  }

  var b = req.body;
  var fileInfo = getFileInfo(req);

  var fields = {};
  if (b.topic       !== undefined) fields.topic       = b.topic;
  if (b.content     !== undefined) fields.content     = b.content;
  if (b.week        !== undefined) fields.week        = Number(b.week);
  if (b.term        !== undefined) fields.term        = b.term;
  if (b.session     !== undefined) fields.session     = b.session;
  if (b.isPublished !== undefined) fields.isPublished = b.isPublished;
  if (fileInfo.fileUrl) { fields.fileUrl = fileInfo.fileUrl; fields.fileName = fileInfo.fileName; }

  var updated = await LessonNote.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true })
    .populate('teacherId', 'name')
    .populate('classId',   'name section')
    .populate('subjectId', 'name code');

  res.status(200).json({ success: true, message: 'Lesson note updated successfully', data: updated });
});

// DELETE /api/lesson-notes/:id
exports.deleteLessonNote = catchAsync(async function(req, res, next) {
  var note = await LessonNote.findById(req.params.id);
  if (!note) return next(new ApiError(404, 'Lesson note not found'));

  if (req.user.role === 'teacher' && String(note.teacherId) !== String(req.user._id)) {
    return next(new ApiError(403, 'You can only delete your own lesson notes'));
  }

  await LessonNote.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'Lesson note deleted successfully' });
});