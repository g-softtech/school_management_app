const express = require('express');
const router = express.Router();
const protect = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');
const { checkFeature } = require('../../utils/featureGuard');
const { getAttendance, saveAttendance } = require('./attendance.controller');

router.use(protect);
router.use(restrictTo('admin', 'teacher'));
router.use(checkFeature('feature_attendance'));

router.route('/')
  .get(getAttendance)
  .post(saveAttendance);

module.exports = router;
