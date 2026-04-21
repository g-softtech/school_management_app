const express = require('express');
const router  = express.Router();
const { submitAssignment, getMySubmissions, gradeSubmission, getSubmission } = require('./submissions.controller');
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');
const { uploadSubmission } = require('../../middleware/upload');

router.use(protect);

router.post('/',              restrictTo('student'), uploadSubmission, submitAssignment);
router.get('/my',             restrictTo('student'), getMySubmissions);
router.get('/:id',            restrictTo('admin', 'teacher', 'student'), getSubmission);
router.patch('/:id/grade',    restrictTo('admin', 'teacher'), gradeSubmission);

module.exports = router;