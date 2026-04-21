const express = require('express');
const router  = express.Router();
const { lessonGenerator, assistant } = require('./ai.controller');
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');

router.use(protect);

router.post('/lesson-generator', restrictTo('admin', 'teacher'), lessonGenerator);
router.post('/assistant',        restrictTo('admin', 'teacher', 'student', 'parent'), assistant);

module.exports = router;