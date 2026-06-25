const express = require('express');
const router  = express.Router();
const { createLessonNote, getLessonNotes, getLessonNote, updateLessonNote, deleteLessonNote } = require('./lessonNotes.controller');
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');
const { uploadLesson } = require('../../middleware/upload');

const { checkFeature } = require('../../utils/featureGuard');

router.use(protect);
router.use(checkFeature('feature_lesson_notes'));

router.get('/',    restrictTo('admin', 'teacher', 'student'), getLessonNotes);
router.post('/',   restrictTo('admin', 'teacher'), uploadLesson, createLessonNote);
router.get('/:id', restrictTo('admin', 'teacher', 'student'), getLessonNote);
router.patch('/:id', restrictTo('admin', 'teacher'), uploadLesson, updateLessonNote);
router.delete('/:id', restrictTo('admin', 'teacher'), deleteLessonNote);

module.exports = router;