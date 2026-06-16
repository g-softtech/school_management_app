const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middlewares/auth');
const { getAttendance, saveAttendance } = require('./attendance.controller');

router.use(protect);
router.use(authorize('admin', 'teacher'));

router.route('/')
  .get(getAttendance)
  .post(saveAttendance);

module.exports = router;
