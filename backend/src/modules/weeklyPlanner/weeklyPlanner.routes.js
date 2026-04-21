const express = require('express');
const router  = express.Router();
const { createEntry, getEntries, updateEntry, deleteEntry } = require('./weeklyPlanner.controller');
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');

router.use(protect);

router.get('/',    restrictTo('admin', 'teacher'), getEntries);
router.post('/',   restrictTo('admin', 'teacher'), createEntry);
router.patch('/:id',  restrictTo('admin', 'teacher'), updateEntry);
router.delete('/:id', restrictTo('admin', 'teacher'), deleteEntry);

module.exports = router;    