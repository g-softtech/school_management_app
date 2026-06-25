const express = require('express');
const router  = express.Router();
const { createAssignment, getAssignments, getAssignment, updateAssignment, deleteAssignment, getSubmissions } = require('./assignments.controller');
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');
const { uploadAssignment } = require('../../middleware/upload');

const { checkFeature } = require('../../utils/featureGuard');

router.use(protect);
router.use(checkFeature('feature_assignments'));

router.get('/',    restrictTo('admin', 'teacher', 'student'), getAssignments);
router.post('/',   restrictTo('admin', 'teacher'), uploadAssignment, createAssignment);
router.get('/:id', restrictTo('admin', 'teacher', 'student'), getAssignment);
router.patch('/:id',  restrictTo('admin', 'teacher'), uploadAssignment, updateAssignment);
router.delete('/:id', restrictTo('admin', 'teacher'), deleteAssignment);
router.get('/:id/submissions', restrictTo('admin', 'teacher'), getSubmissions);

module.exports = router;