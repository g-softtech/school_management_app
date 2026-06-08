/**
 * ADD THIS TO YOUR students.routes.js:
 *
 * const { promoteStudents } = require('./promote');
 * router.post('/promote', protect, restrictTo('admin'), promoteStudents);
 *
 * OR simply add the promoteStudents function to your existing students.controller.js
 * and add the route to students.routes.js
 */
const Student    = require('../../models/Student');
const Class      = require('../../models/Class');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');

exports.promoteStudents = catchAsync(async function(req, res, next) {
  var fromClassId = req.body.fromClassId;
  var toClassId   = req.body.toClassId;
  var studentIds  = req.body.studentIds;

  if (!fromClassId || !toClassId)
    return next(new ApiError(400, 'fromClassId and toClassId are required'));
  if (fromClassId === toClassId)
    return next(new ApiError(400, 'Source and destination cannot be the same'));

  var fromClass = await Class.findById(fromClassId);
  var toClass   = await Class.findById(toClassId);
  if (!fromClass) return next(new ApiError(404, 'Source class not found'));
  if (!toClass)   return next(new ApiError(404, 'Destination class not found'));

  var filter = { classId: fromClassId, isActive: true };
  if (studentIds && studentIds.length > 0) filter._id = { $in: studentIds };

  var result    = await Student.updateMany(filter, { classId: toClassId });
  var fromLabel = (fromClass.name + ' ' + (fromClass.section||'')).trim();
  var toLabel   = (toClass.name   + ' ' + (toClass.section  ||'')).trim();

  res.status(200).json({
    success: true,
    message: result.modifiedCount + ' student(s) promoted from ' + fromLabel + ' to ' + toLabel,
    data:    { promoted: result.modifiedCount, fromClass: fromLabel, toClass: toLabel },
  });
});
