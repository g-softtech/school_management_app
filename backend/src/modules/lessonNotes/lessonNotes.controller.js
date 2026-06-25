const prisma = require('../../config/prisma');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const paginate   = require('../../utils/paginate');

function getFileInfo(req) {
  if (!req.file) return { fileUrl: null, fileName: null };
  return {
    fileUrl:  '/uploads/lessons/' + req.file.filename,
    fileName: req.file.originalname,
  };
}

exports.createLessonNote = catchAsync(async function(req, res, next) {
  var b = req.body;
  if (!b.classId || !b.subjectId || !b.topic || !b.week || !b.term || !b.session) {
    return next(new ApiError(400, 'Please provide classId, subjectId, topic, week, term and session'));
  }

  if (req.user.role === 'teacher') {
    var subject = await prisma.subject.findFirst({ where: { id: b.subjectId, teacherId: req.user.id, tenantId: req.tenantId } });
    if (!subject) return next(new ApiError(403, 'You can only create lesson notes for subjects assigned to you'));
  }

  var fileInfo = getFileInfo(req);

  var note = await prisma.lessonNote.create({
    data: {
      tenantId:    req.tenantId,
      teacherId:   req.user.id,
      classId:     b.classId,
      subjectId:   b.subjectId,
      topic:       b.topic,
      week:        Number(b.week),
      term:        b.term,
      session:     b.session,
      content:     b.content || null,
      fileUrl:     fileInfo.fileUrl,
      fileName:    fileInfo.fileName,
      isPublished: b.isPublished !== undefined ? (b.isPublished === 'true' || b.isPublished === true) : true,
    },
    include: {
      teacher: { select: { name: true } },
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } }
    }
  });

  res.status(201).json({ success: true, message: 'Lesson note created successfully', data: note });
});

exports.getLessonNotes = catchAsync(async function(req, res, next) {
  var p = paginate(req.query);
  var filter = { tenantId: req.tenantId };

  if (req.query.classId)   filter.classId   = req.query.classId;
  if (req.query.subjectId) filter.subjectId = req.query.subjectId;
  if (req.query.term)      filter.term      = req.query.term;
  if (req.query.session)   filter.session   = req.query.session;
  if (req.query.week)      filter.week      = Number(req.query.week);

  if (req.user.role === 'teacher') filter.teacherId = req.user.id;

  if (req.user.role === 'student') {
    var student = await prisma.student.findFirst({ where: { userId: req.user.id, tenantId: req.tenantId } });
    if (!student) return next(new ApiError(404, 'Student profile not found'));
    filter.classId    = student.classId;
    filter.isPublished = true;
  }

  var total = await prisma.lessonNote.count({ where: filter });
  var notes = await prisma.lessonNote.findMany({
    where: filter,
    include: {
      teacher: { select: { name: true } },
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } }
    },
    orderBy: [
      { week: 'asc' },
      { createdAt: 'desc' }
    ],
    skip: p.skip,
    take: p.limit
  });

  res.status(200).json({
    success: true,
    pagination: { total, page: p.page, limit: p.limit, pages: Math.ceil(total / p.limit) },
    data: notes,
  });
});

exports.getLessonNote = catchAsync(async function(req, res, next) {
  var note = await prisma.lessonNote.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
    include: {
      teacher: { select: { name: true } },
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } }
    }
  });

  if (!note) return next(new ApiError(404, 'Lesson note not found'));

  if (req.user.role === 'teacher' && note.teacherId !== req.user.id) {
    return next(new ApiError(403, 'You can only view your own lesson notes'));
  }

  res.status(200).json({ success: true, data: note });
});

exports.updateLessonNote = catchAsync(async function(req, res, next) {
  var note = await prisma.lessonNote.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!note) return next(new ApiError(404, 'Lesson note not found'));

  if (req.user.role === 'teacher' && note.teacherId !== req.user.id) {
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
  if (b.isPublished !== undefined) fields.isPublished = b.isPublished === 'true' || b.isPublished === true;
  if (fileInfo.fileUrl) { fields.fileUrl = fileInfo.fileUrl; fields.fileName = fileInfo.fileName; }

  var updated = await prisma.lessonNote.update({
    where: { id: req.params.id },
    data: fields,
    include: {
      teacher: { select: { name: true } },
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } }
    }
  });

  res.status(200).json({ success: true, message: 'Lesson note updated successfully', data: updated });
});

exports.deleteLessonNote = catchAsync(async function(req, res, next) {
  var note = await prisma.lessonNote.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!note) return next(new ApiError(404, 'Lesson note not found'));

  if (req.user.role === 'teacher' && note.teacherId !== req.user.id) {
    return next(new ApiError(403, 'You can only delete your own lesson notes'));
  }

  await prisma.lessonNote.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, message: 'Lesson note deleted successfully' });
});