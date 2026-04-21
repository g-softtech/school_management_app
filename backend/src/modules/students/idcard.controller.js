const Student       = require('../../models/Student');
const ApiError      = require('../../utils/ApiError');
const catchAsync    = require('../../utils/catchAsync');
const generateIDCard = require('../../utils/generateIDCard');

// GET /api/students/:id/idcard
// Admin only
exports.generateStudentIDCard = catchAsync(async function(req, res, next) {
  var student = await Student.findById(req.params.id)
    .populate('userId',  'name email')
    .populate('classId', 'name section');

  if (!student) return next(new ApiError(404, 'Student not found'));

  await generateIDCard(student, res);
});