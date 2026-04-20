const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      // null when it is a broadcast message
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Broadcast fields
    isBroadcast: {
      type: Boolean,
      default: false,
    },
    targetRole: {
      type: String,
      enum: ['admin', 'teacher', 'student', 'parent', null],
      default: null,
      // set when isBroadcast is true
    },
    subject: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

messageSchema.index({ receiverId: 1, isRead: 1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ senderId: 1, receiverId: 1 });

module.exports = mongoose.model('Message', messageSchema);