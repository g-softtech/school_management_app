const Assignment = require('../../models/Assignment');
const Submission = require('../../models/Submission');
const Student    = require('../../models/Student');
const Subject    = require('../../models/Subject');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const paginate   = require('../../utils/paginate');

function getFileInfo(req) {
  if (!req.file) return { fileUrl: null, fileName: null };
  return { fileUrl: '/uploads/assignments/' + req.file.filename, fileName: req.file.originalname };
}

// POST /api/assignments — Teacher, Admin
exports.createAssignment = catchAsync(async function(req, res, next) {
  var b = req.body;
  if (!b.classId || !b.subjectId || !b.title || !b.question || !b.dueDate || !b.maxScore || !b.term || !b.session) {
    return next(new ApiError(400, 'Please provide classId, subjectId, title, question, dueDate, maxScore, term and session'));
  }

  if (req.user.role === 'teacher') {
    var subject = await Subject.findOne({ _id: b.subjectId, teacherId: req.user._id });
    if (!subject) return next(new ApiError(403, 'You can only create assignments for subjects assigned to you'));
  }

  var fileInfo = getFileInfo(req);

  var assignment = await Assignment.create({
    teacherId: req.user._id,
    classId:   b.classId,
    subjectId: b.subjectId,
    title:     b.title,
    question:  b.question,
    dueDate:   new Date(b.dueDate),
    maxScore:  Number(b.maxScore),
    term:      b.term,
    session:   b.session,
    fileUrl:   fileInfo.fileUrl,
    fileName:  fileInfo.fileName,
  });

  var populated = await Assignment.findById(assignment._id)
    .populate('teacherId', 'name')
    .populate('classId',   'name section')
    .populate('subjectId', 'name code');

  res.status(201).json({ success: true, message: 'Assignment created successfully', data: populated });
});

// GET /api/assignments — filtered by role
exports.getAssignments = catchAsync(async function(req, res, next) {
  var p = paginate(req.query);
  var filter = {};

  if (req.query.classId)   filter.classId   = req.query.classId;
  if (req.query.subjectId) filter.subjectId = req.query.subjectId;
  if (req.query.term)      filter.term      = req.query.term;
  if (req.query.session)   filter.session   = req.query.session;

  if (req.user.role === 'teacher') filter.teacherId = req.user._id;

  if (req.user.role === 'student') {
    var student = await Student.findOne({ userId: req.user._id });
    if (!student) return next(new ApiError(404, 'Student profile not found'));
    filter.classId  = student.classId;
    filter.isActive = true;
  }

  var total       = await Assignment.countDocuments(filter);
  var assignments = await Assignment.find(filter)
    .populate('teacherId', 'name')
    .populate('classId',   'name section')
    .populate('subjectId', 'name code')
    .sort({ dueDate: 1 })
    .skip(p.skip)
    .limit(p.limit);

  res.status(200).json({
    success: true,
    pagination: { total, page: p.page, limit: p.limit, pages: Math.ceil(total / p.limit) },
    data: assignments,
  });
});

// GET /api/assignments/:id
exports.getAssignment = catchAsync(async function(req, res, next) {
  var assignment = await Assignment.findById(req.params.id)
    .populate('teacherId', 'name')
    .populate('classId',   'name section')
    .populate('subjectId', 'name code');

  if (!assignment) return next(new ApiError(404, 'Assignment not found'));

  if (req.user.role === 'teacher' && String(assignment.teacherId._id) !== String(req.user._id)) {
    return next(new ApiError(403, 'You can only view your own assignments'));
  }

  res.status(200).json({ success: true, data: assignment });
});

// PATCH /api/assignments/:id — Teacher, Admin
exports.updateAssignment = catchAsync(async function(req, res, next) {
  var assignment = await Assignment.findById(req.params.id);
  if (!assignment) return next(new ApiError(404, 'Assignment not found'));

  if (req.user.role === 'teacher' && String(assignment.teacherId) !== String(req.user._id)) {
    return next(new ApiError(403, 'You can only update your own assignments'));
  }

  var b = req.body;
  var fileInfo = getFileInfo(req);
  var fields = {};

  if (b.title    !== undefined) fields.title    = b.title;
  if (b.question !== undefined) fields.question = b.question;
  if (b.dueDate  !== undefined) fields.dueDate  = new Date(b.dueDate);
  if (b.maxScore !== undefined) fields.maxScore = Number(b.maxScore);
  if (b.isActive !== undefined) fields.isActive = b.isActive;
  if (fileInfo.fileUrl) { fields.fileUrl = fileInfo.fileUrl; fields.fileName = fileInfo.fileName; }

  var updated = await Assignment.findByIdAndUpdate(req.params.id, fields, { new: true })
    .populate('classId', 'name section').populate('subjectId', 'name code');

  res.status(200).json({ success: true, message: 'Assignment updated successfully', data: updated });
});

// DELETE /api/assignments/:id
exports.deleteAssignment = catchAsync(async function(req, res, next) {
  var assignment = await Assignment.findById(req.params.id);
  if (!assignment) return next(new ApiError(404, 'Assignment not found'));

  if (req.user.role === 'teacher' && String(assignment.teacherId) !== String(req.user._id)) {
    return next(new ApiError(403, 'You can only delete your own assignments'));
  }

  await Submission.deleteMany({ assignmentId: req.params.id });
  await Assignment.findByIdAndDelete(req.params.id);

  res.status(200).json({ success: true, message: 'Assignment and all submissions deleted successfully' });
});

// GET /api/assignments/:id/submissions — Teacher views all submissions
exports.getSubmissions = catchAsync(async function(req, res, next) {
  var assignment = await Assignment.findById(req.params.id);
  if (!assignment) return next(new ApiError(404, 'Assignment not found'));

  if (req.user.role === 'teacher' && String(assignment.teacherId) !== String(req.user._id)) {
    return next(new ApiError(403, 'You can only view submissions for your own assignments'));
  }

  var submissions = await Submission.find({ assignmentId: req.params.id })
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } })
    .populate('gradedBy', 'name')
    .sort({ submittedAt: -1 });

  var total    = submissions.length;
  var graded   = submissions.filter(function(s) { return s.status === 'graded'; }).length;
  var pending  = total - graded;

  res.status(200).json({
    success: true,
    summary: { total, graded, pending },
    data: submissions,
  });
});