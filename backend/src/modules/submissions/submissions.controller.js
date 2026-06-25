const prisma = require('../../config/prisma');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');

function getFileInfo(req) {
  if (!req.file) return { fileUrl: null, fileName: null };
  return { fileUrl: '/uploads/submissions/' + req.file.filename, fileName: req.file.originalname };
}

exports.submitAssignment = catchAsync(async function(req, res, next) {
  var assignmentId = req.body.assignmentId;
  var answer       = req.body.answer;
  var fileInfo     = getFileInfo(req);

  if (!assignmentId) return next(new ApiError(400, 'Please provide assignmentId'));
  if (!answer && !fileInfo.fileUrl) return next(new ApiError(400, 'Please provide an answer (text or file)'));

  var assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, tenantId: req.tenantId } });
  if (!assignment) return next(new ApiError(404, 'Assignment not found'));
  if (!assignment.isActive) return next(new ApiError(400, 'This assignment is no longer accepting submissions'));

  if (new Date() > new Date(assignment.dueDate)) {
    return next(new ApiError(400, 'Assignment due date has passed'));
  }

  var student = await prisma.student.findFirst({ where: { userId: req.user.id, tenantId: req.tenantId } });
  if (!student) return next(new ApiError(404, 'Student profile not found'));

  if (student.classId !== assignment.classId) {
    return next(new ApiError(403, 'This assignment is not for your class'));
  }

  var existing = await prisma.submission.findFirst({ where: { assignmentId, studentId: student.id, tenantId: req.tenantId } });

  var submission;
  if (existing) {
    if (existing.status === 'graded') return next(new ApiError(400, 'Your submission has already been graded'));
    submission = await prisma.submission.update({
      where: { id: existing.id },
      data: {
        answer:    answer || existing.answer,
        fileUrl:   fileInfo.fileUrl || existing.fileUrl,
        fileName:  fileInfo.fileName || existing.fileName,
        submittedAt: new Date()
      }
    });
  } else {
    submission = await prisma.submission.create({
      data: {
        tenantId: req.tenantId,
        assignmentId,
        studentId: student.id,
        answer:    answer || null,
        fileUrl:   fileInfo.fileUrl,
        fileName:  fileInfo.fileName,
      }
    });
  }

  res.status(201).json({ success: true, message: 'Assignment submitted successfully', data: submission });
});

exports.getMySubmissions = catchAsync(async function(req, res, next) {
  var student = await prisma.student.findFirst({ where: { userId: req.user.id, tenantId: req.tenantId } });
  if (!student) return next(new ApiError(404, 'Student profile not found'));

  var submissions = await prisma.submission.findMany({
    where: { studentId: student.id, tenantId: req.tenantId },
    include: {
      assignment: { select: { title: true, dueDate: true, maxScore: true, subject: { select: { name: true } } } }
    },
    orderBy: { submittedAt: 'desc' }
  });

  res.status(200).json({ success: true, data: submissions });
});

exports.gradeSubmission = catchAsync(async function(req, res, next) {
  var score    = req.body.score;
  var feedback = req.body.feedback;

  if (score === undefined) return next(new ApiError(400, 'Please provide a score'));

  var submission = await prisma.submission.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
    include: { assignment: true }
  });
  if (!submission) return next(new ApiError(404, 'Submission not found'));

  var assignment = submission.assignment;

  if (req.user.role === 'teacher' && assignment.teacherId !== req.user.id) {
    return next(new ApiError(403, 'You can only grade submissions for your own assignments'));
  }

  if (Number(score) > assignment.maxScore) {
    return next(new ApiError(400, 'Score cannot exceed maximum score of ' + assignment.maxScore));
  }

  const notifSvc = require('../../../services/notificationService');
  notifSvc.onAssignmentGraded(
    submission.studentId, assignment.title,
    Number(score), assignment.maxScore, feedback || null
  ).catch(() => {});

  var updated = await prisma.submission.update({
    where: { id: req.params.id },
    data: { score: Number(score), feedback: feedback || null, status: 'graded', gradedAt: new Date(), gradedBy: req.user.id },
    include: {
      student: { include: { user: { select: { name: true } } } },
      gradedByUser: { select: { name: true } }
    }
  });

  res.status(200).json({ success: true, message: 'Submission graded successfully', data: updated });
});

exports.getSubmission = catchAsync(async function(req, res, next) {
  var submission = await prisma.submission.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
    include: {
      assignment: { select: { title: true, maxScore: true, dueDate: true } },
      student: { select: { admissionNumber: true, user: { select: { name: true, email: true } } } },
      gradedByUser: { select: { name: true } }
    }
  });

  if (!submission) return next(new ApiError(404, 'Submission not found'));
  res.status(200).json({ success: true, data: submission });
});