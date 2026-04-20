const express = require('express');
const router  = express.Router();
const {
  sendMessage,
  broadcastMessage,
  getInbox,
  getSent,
  getConversation,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  getContacts,
} = require('./messages.controller');
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');

router.use(protect);

// Inbox & sent
router.get('/inbox',          getInbox);
router.get('/sent',           getSent);
router.get('/contacts',       getContacts);
router.get('/unread-count',   getUnreadCount);

// Send & broadcast
router.post('/',              sendMessage);
router.post('/broadcast',     restrictTo('admin'), broadcastMessage);

// Mark as read
router.patch('/mark-all-read',  markAllAsRead);
router.patch('/:id/read',       markAsRead);

// Conversation thread
router.get('/conversation/:userId', getConversation);

// Delete
router.delete('/:id',         deleteMessage);

module.exports = router;