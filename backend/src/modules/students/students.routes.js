const express    = require('express');
const router     = express.Router();
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');
const {
  createStudent, getAllStudents, getStudent,
  getMyProfile, updateStudent, deleteStudent,
} = require('./students.controller');

// promoteStudents — inline to avoid separate file dependency
const Student  = require('../../models/Student');
const Class    = require('../../models/Class');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');

const promoteStudents = catchAsync(async function(req, res, next) {
  var fromClassId = req.body.fromClassId;
  var toClassId   = req.body.toClassId;
  var studentIds  = req.body.studentIds;

  if (!fromClassId || !toClassId)
    return next(new ApiError(400, 'fromClassId and toClassId are required'));
  if (String(fromClassId) === String(toClassId))
    return next(new ApiError(400, 'Source and destination cannot be the same'));

  var fromClass = await Class.findById(fromClassId);
  var toClass   = await Class.findById(toClassId);
  if (!fromClass) return next(new ApiError(404, 'Source class not found'));
  if (!toClass)   return next(new ApiError(404, 'Destination class not found'));

  var filter = { classId: fromClassId, isActive: true };
  if (studentIds && studentIds.length > 0) filter._id = { $in: studentIds };

  var result    = await Student.updateMany(filter, { classId: toClassId });
  var fromLabel = (fromClass.name + ' ' + (fromClass.section || '')).trim();
  var toLabel   = (toClass.name   + ' ' + (toClass.section   || '')).trim();

  res.status(200).json({
    success: true,
    message: result.modifiedCount + ' student(s) promoted from ' + fromLabel + ' to ' + toLabel,
    data:    { promoted: result.modifiedCount, fromClass: fromLabel, toClass: toLabel },
  });
});

// Also add my-child for parent portal
const getMyChild = catchAsync(async function(req, res, next) {
  var student = await Student.findOne({ parentId: req.user._id })
    .populate('userId',  'name email')
    .populate('classId', 'name section')
    .populate('parentId','name email');
  if (!student) return next(new ApiError(404, 'No child linked to your account'));
  res.status(200).json({ success: true, data: student });
});

router.use(protect);

router.get('/my-child', restrictTo('parent'),  getMyChild);
router.get('/me',       restrictTo('student'), getMyProfile);
router.post('/promote', restrictTo('admin'),   promoteStudents);

router.get('/',    restrictTo('admin','teacher'), getAllStudents);
router.post('/',   restrictTo('admin'),           createStudent);
router.get('/:id', restrictTo('admin','teacher','student'), getStudent);
router.patch('/:id',  restrictTo('admin'), updateStudent);
router.delete('/:id', restrictTo('admin'), deleteStudent);

module.exports = router;
