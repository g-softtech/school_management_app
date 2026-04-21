const express = require('express');
const router  = express.Router();
const { getMyNotifications, markAsRead, markAllAsRead, sendNotification, deleteNotification } = require('./notifications.controller');
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');

router.use(protect);

router.get('/',                  getMyNotifications);
router.patch('/mark-all-read',   markAllAsRead);
router.post('/send',             restrictTo('admin'), sendNotification);
router.patch('/:id/read',        markAsRead);
router.delete('/:id',            deleteNotification);

module.exports = router;