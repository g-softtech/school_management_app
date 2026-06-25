const prisma = require('../../config/prisma');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const paginate   = require('../../utils/paginate');

function getFileInfo(req) {
  if (!req.file) return { fileUrl: null, fileName: null };
  return { fileUrl: '/uploads/assignments/' + req.file.filename, fileName: req.file.originalname };
}

exports.createAssignment = catchAsync(async function(req, res, next) {
  var b = req.body;
  if (!b.classId || !b.subjectId || !b.title || !b.question || !b.dueDate || !b.maxScore || !b.term || !b.session) {
    return next(new ApiError(400, 'Please provide classId, subjectId, title, question, dueDate, maxScore, term and session'));
  }

  if (req.user.role === 'teacher') {
    var subject = await prisma.subject.findFirst({ where: { id: b.subjectId, teacherId: req.user.id, tenantId: req.tenantId } });
    if (!subject) return next(new ApiError(403, 'You can only create assignments for subjects assigned to you'));
  }

  var fileInfo = getFileInfo(req);

  var assignment = await prisma.assignment.create({
    data: {
      tenantId:  req.tenantId,
      teacherId: req.user.id,
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
    },
    include: {
      teacher: { select: { name: true } },
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } }
    }
  });

  res.status(201).json({ success: true, message: 'Assignment created successfully', data: assignment });
});

exports.getAssignments = catchAsync(async function(req, res, next) {
  var p = paginate(req.query);
  var filter = { tenantId: req.tenantId };

  if (req.query.classId)   filter.classId   = req.query.classId;
  if (req.query.subjectId) filter.subjectId = req.query.subjectId;
  if (req.query.term)      filter.term      = req.query.term;
  if (req.query.session)   filter.session   = req.query.session;

  if (req.user.role === 'teacher') filter.teacherId = req.user.id;

  if (req.user.role === 'student') {
    var student = await prisma.student.findFirst({ where: { userId: req.user.id, tenantId: req.tenantId } });
    if (!student) return next(new ApiError(404, 'Student profile not found'));
    filter.classId  = student.classId;
    filter.isActive = true;
  }

  var total       = await prisma.assignment.count({ where: filter });
  var assignments = await prisma.assignment.findMany({
    where: filter,
    include: {
      teacher: { select: { name: true } },
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } }
    },
    orderBy: { dueDate: 'asc' },
    skip: p.skip,
    take: p.limit
  });

  res.status(200).json({
    success: true,
    pagination: { total, page: p.page, limit: p.limit, pages: Math.ceil(total / p.limit) },
    data: assignments,
  });
});

exports.getAssignment = catchAsync(async function(req, res, next) {
  var assignment = await prisma.assignment.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
    include: {
      teacher: { select: { name: true } },
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } }
    }
  });

  if (!assignment) return next(new ApiError(404, 'Assignment not found'));

  if (req.user.role === 'teacher' && assignment.teacherId !== req.user.id) {
    return next(new ApiError(403, 'You can only view your own assignments'));
  }

  res.status(200).json({ success: true, data: assignment });
});

exports.updateAssignment = catchAsync(async function(req, res, next) {
  var assignment = await prisma.assignment.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!assignment) return next(new ApiError(404, 'Assignment not found'));

  if (req.user.role === 'teacher' && assignment.teacherId !== req.user.id) {
    return next(new ApiError(403, 'You can only update your own assignments'));
  }

  var b = req.body;
  var fileInfo = getFileInfo(req);
  var fields = {};

  if (b.title    !== undefined) fields.title    = b.title;
  if (b.question !== undefined) fields.question = b.question;
  if (b.dueDate  !== undefined) fields.dueDate  = new Date(b.dueDate);
  if (b.maxScore !== undefined) fields.maxScore = Number(b.maxScore);
  if (b.isActive !== undefined) fields.isActive = b.isActive === 'true' || b.isActive === true;
  if (fileInfo.fileUrl) { fields.fileUrl = fileInfo.fileUrl; fields.fileName = fileInfo.fileName; }

  var updated = await prisma.assignment.update({
    where: { id: req.params.id },
    data: fields,
    include: {
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } }
    }
  });

  res.status(200).json({ success: true, message: 'Assignment updated successfully', data: updated });
});

exports.deleteAssignment = catchAsync(async function(req, res, next) {
  var assignment = await prisma.assignment.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!assignment) return next(new ApiError(404, 'Assignment not found'));

  if (req.user.role === 'teacher' && assignment.teacherId !== req.user.id) {
    return next(new ApiError(403, 'You can only delete your own assignments'));
  }

  await prisma.$transaction(async (tx) => {
    await tx.submission.deleteMany({ where: { assignmentId: req.params.id, tenantId: req.tenantId } });
    await tx.assignment.delete({ where: { id: req.params.id } });
  });

  res.status(200).json({ success: true, message: 'Assignment and all submissions deleted successfully' });
});

exports.getSubmissions = catchAsync(async function(req, res, next) {
  var assignment = await prisma.assignment.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!assignment) return next(new ApiError(404, 'Assignment not found'));

  if (req.user.role === 'teacher' && assignment.teacherId !== req.user.id) {
    return next(new ApiError(403, 'You can only view submissions for your own assignments'));
  }

  var submissions = await prisma.submission.findMany({
    where: { assignmentId: req.params.id, tenantId: req.tenantId },
    include: {
      student: { select: { admissionNumber: true, user: { select: { name: true, email: true } } } },
      gradedByUser: { select: { name: true } }
    },
    orderBy: { submittedAt: 'desc' }
  });

  var total    = submissions.length;
  var graded   = submissions.filter(function(s) { return s.status === 'graded'; }).length;
  var pending  = total - graded;

  res.status(200).json({
    success: true,
    summary: { total, graded, pending },
    data: submissions,
  });
});