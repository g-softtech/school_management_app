const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { generateLessonNote, smartAssistant } = require('../../../services/aiService');
const Result  = require('../../models/Result');
const Student = require('../../models/Student');

// POST /api/ai/lesson-generator
// Teacher, Admin
exports.lessonGenerator = catchAsync(async function(req, res, next) {
  var subject   = req.body.subject;
  var className = req.body.class;
  var topic     = req.body.topic;
  var term      = req.body.term;

  if (!subject || !className || !topic || !term) {
    return next(new ApiError(400, 'Please provide subject, class, topic and term'));
  }

  var lesson = await generateLessonNote(subject, className, topic, term);

  res.status(200).json({
    success: true,
    message: 'Lesson note generated successfully',
    data: lesson,
  });
});

// POST /api/ai/assistant
// All authenticated users
exports.assistant = catchAsync(async function(req, res, next) {
  var query = req.body.query;
  if (!query) return next(new ApiError(400, 'Please provide a query'));

  var contextData = null;

  // For students — inject their recent results into the context
  if (req.user.role === 'student') {
    var student = await Student.findOne({ userId: req.user._id });
    if (student) {
      var results = await Result.find({ studentId: student._id })
        .populate('subjectId', 'name')
        .sort({ createdAt: -1 })
        .limit(10);

      contextData = {
        studentName: req.user.name,
        recentResults: results.map(function(r) {
          return { subject: r.subjectId ? r.subjectId.name : 'Unknown', total: r.total, grade: r.grade, term: r.term, session: r.session };
        }),
      };
    }
  }

  // For teachers — provide role context
  if (req.user.role === 'teacher') {
    contextData = { teacherName: req.user.name, role: 'teacher' };
  }

  var response = await smartAssistant(req.user.role, query, contextData);

  res.status(200).json({
    success: true,
    query:    query,
    response: response,
  });
});