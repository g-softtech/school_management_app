const Message  = require('../../models/Message');
const User     = require('../../models/User');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const paginate   = require('../../utils/paginate');

// ─── Send a message ───────────────────────────────────────────────────────────
// POST /api/messages
// Any authenticated user
exports.sendMessage = catchAsync(async function(req, res, next) {
  var receiverId = req.body.receiverId;
  var content    = req.body.content;
  var subject    = req.body.subject;

  if (!receiverId || !content) {
    return next(new ApiError(400, 'Please provide receiverId and content'));
  }

  // Verify receiver exists
  var receiver = await User.findById(receiverId);
  if (!receiver) return next(new ApiError(404, 'Receiver not found'));

  // Cannot message yourself
  if (String(receiverId) === String(req.user._id)) {
    return next(new ApiError(400, 'You cannot send a message to yourself'));
  }

  // Role-based messaging rules
  var senderRole   = req.user.role;
  var receiverRole = receiver.role;

  var allowed = false;

  if (senderRole === 'admin') allowed = true;
  if (senderRole === 'teacher' && ['student', 'parent', 'admin'].includes(receiverRole)) allowed = true;
  if (senderRole === 'student' && ['teacher', 'admin'].includes(receiverRole)) allowed = true;
  if (senderRole === 'parent'  && ['teacher', 'admin'].includes(receiverRole)) allowed = true;

  if (!allowed) {
    return next(new ApiError(403, 'You are not allowed to send messages to this user role'));
  }

  var message = await Message.create({
    senderId:   req.user._id,
    receiverId: receiverId,
    content:    content,
    subject:    subject || null,
  });

  var populated = await Message.findById(message._id)
    .populate('senderId',   'name role')
    .populate('receiverId', 'name role');

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data:    populated,
  });
});

// ─── Broadcast message (admin only) ──────────────────────────────────────────
// POST /api/messages/broadcast
// Admin only — sends to ALL users of a given role
exports.broadcastMessage = catchAsync(async function(req, res, next) {
  var targetRole = req.body.targetRole;
  var content    = req.body.content;
  var subject    = req.body.subject;

  if (!targetRole || !content) {
    return next(new ApiError(400, 'Please provide targetRole and content'));
  }

  var validRoles = ['admin', 'teacher', 'student', 'parent'];
  if (!validRoles.includes(targetRole)) {
    return next(new ApiError(400, 'targetRole must be one of: admin, teacher, student, parent'));
  }

  // Find all users with the target role
  var recipients = await User.find({ role: targetRole, isActive: true }, { _id: 1 });

  if (recipients.length === 0) {
    return next(new ApiError(404, 'No active users found with role: ' + targetRole));
  }

  // Create one message document per recipient
  var messages = recipients.map(function(r) {
    return {
      senderId:    req.user._id,
      receiverId:  r._id,
      content:     content,
      subject:     subject || null,
      isBroadcast: true,
      targetRole:  targetRole,
    };
  });

  await Message.insertMany(messages);

  res.status(201).json({
    success: true,
    message: 'Broadcast sent to ' + recipients.length + ' ' + targetRole + '(s)',
    recipients: recipients.length,
  });
});

// ─── Get inbox ────────────────────────────────────────────────────────────────
// GET /api/messages/inbox
// All authenticated users — returns messages received by current user
exports.getInbox = catchAsync(async function(req, res, next) {
  var p = paginate(req.query);

  var total    = await Message.countDocuments({ receiverId: req.user._id });
  var messages = await Message.find({ receiverId: req.user._id })
    .populate('senderId', 'name role')
    .sort({ createdAt: -1 })
    .skip(p.skip)
    .limit(p.limit);

  res.status(200).json({
    success: true,
    pagination: { total: total, page: p.page, limit: p.limit, pages: Math.ceil(total / p.limit) },
    data: messages,
  });
});

// ─── Get sent messages ────────────────────────────────────────────────────────
// GET /api/messages/sent
// All authenticated users
exports.getSent = catchAsync(async function(req, res, next) {
  var p = paginate(req.query);

  var total    = await Message.countDocuments({ senderId: req.user._id });
  var messages = await Message.find({ senderId: req.user._id })
    .populate('receiverId', 'name role')
    .sort({ createdAt: -1 })
    .skip(p.skip)
    .limit(p.limit);

  res.status(200).json({
    success: true,
    pagination: { total: total, page: p.page, limit: p.limit, pages: Math.ceil(total / p.limit) },
    data: messages,
  });
});

// ─── Get conversation thread between two users ────────────────────────────────
// GET /api/messages/conversation/:userId
// All authenticated users
exports.getConversation = catchAsync(async function(req, res, next) {
  var otherUserId = req.params.userId;
  var p = paginate(req.query);

  var otherUser = await User.findById(otherUserId);
  if (!otherUser) return next(new ApiError(404, 'User not found'));

  // Get messages in both directions between the two users
  var filter = {
    $or: [
      { senderId: req.user._id,  receiverId: otherUserId },
      { senderId: otherUserId,   receiverId: req.user._id },
    ],
    isBroadcast: false,
  };

  var total    = await Message.countDocuments(filter);
  var messages = await Message.find(filter)
    .populate('senderId',   'name role')
    .populate('receiverId', 'name role')
    .sort({ createdAt: 1 }) // oldest first for chat view
    .skip(p.skip)
    .limit(p.limit);

  // Mark all unread messages from the other user as read
  await Message.updateMany(
    { senderId: otherUserId, receiverId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    conversation: {
      with: { id: otherUser._id, name: otherUser.name, role: otherUser.role },
    },
    pagination: { total: total, page: p.page, limit: p.limit, pages: Math.ceil(total / p.limit) },
    data: messages,
  });
});

// ─── Get unread count ─────────────────────────────────────────────────────────
// GET /api/messages/unread-count
// All authenticated users — used for notification badge in frontend
exports.getUnreadCount = catchAsync(async function(req, res, next) {
  var count = await Message.countDocuments({
    receiverId: req.user._id,
    isRead:     false,
  });

  res.status(200).json({
    success: true,
    unreadCount: count,
  });
});

// ─── Mark message as read ─────────────────────────────────────────────────────
// PATCH /api/messages/:id/read
// All authenticated users
exports.markAsRead = catchAsync(async function(req, res, next) {
  var message = await Message.findById(req.params.id);
  if (!message) return next(new ApiError(404, 'Message not found'));

  // Only the receiver can mark a message as read
  if (String(message.receiverId) !== String(req.user._id)) {
    return next(new ApiError(403, 'You can only mark your own messages as read'));
  }

  message.isRead = true;
  message.readAt = new Date();
  await message.save();

  res.status(200).json({
    success: true,
    message: 'Message marked as read',
  });
});

// ─── Mark all messages as read ────────────────────────────────────────────────
// PATCH /api/messages/mark-all-read
// All authenticated users
exports.markAllAsRead = catchAsync(async function(req, res, next) {
  var result = await Message.updateMany(
    { receiverId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    message: result.modifiedCount + ' message(s) marked as read',
  });
});

// ─── Delete a message ─────────────────────────────────────────────────────────
// DELETE /api/messages/:id
// Sender or Admin
exports.deleteMessage = catchAsync(async function(req, res, next) {
  var message = await Message.findById(req.params.id);
  if (!message) return next(new ApiError(404, 'Message not found'));

  var isAdmin  = req.user.role === 'admin';
  var isSender = String(message.senderId) === String(req.user._id);

  if (!isAdmin && !isSender) {
    return next(new ApiError(403, 'You can only delete messages you sent'));
  }

  await Message.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
  });
});

// ─── Get all conversations list (inbox summary) ───────────────────────────────
// GET /api/messages/contacts
// All authenticated users — returns list of people you have chatted with
exports.getContacts = catchAsync(async function(req, res, next) {
  var userId = req.user._id;

  // Find all unique users this person has exchanged messages with
  var sent     = await Message.distinct('receiverId', { senderId: userId,   isBroadcast: false });
  var received = await Message.distinct('senderId',   { receiverId: userId, isBroadcast: false });

  // Merge and deduplicate contact IDs
  var allIds = {};
  sent.forEach(function(id)     { allIds[String(id)] = true; });
  received.forEach(function(id) { allIds[String(id)] = true; });
  var contactIds = Object.keys(allIds);

  // Fetch user info for each contact
  var contacts = await User.find({ _id: { $in: contactIds } }, 'name email role');

  // For each contact get unread count
  var result = await Promise.all(contacts.map(async function(contact) {
    var unread = await Message.countDocuments({
      senderId:   contact._id,
      receiverId: userId,
      isRead:     false,
    });

    var last = await Message.findOne({
      $or: [
        { senderId: userId,       receiverId: contact._id },
        { senderId: contact._id, receiverId: userId },
      ],
    }).sort({ createdAt: -1 });

    return {
      user:          { id: contact._id, name: contact.name, role: contact.role },
      unreadCount:   unread,
      lastMessage:   last ? last.content : null,
      lastMessageAt: last ? last.createdAt : null,
    };
  }));

  // Sort by most recent message
  result.sort(function(a, b) {
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
  });

  res.status(200).json({
    success: true,
    data:    result,
  });
});