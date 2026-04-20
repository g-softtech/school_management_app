const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    feeType: {
      type: String,
      required: [true, 'Fee type is required'],
      enum: {
        values: ['tuition', 'exam', 'sports', 'library', 'development', 'other'],
        message: 'feeType must be one of: tuition, exam, sports, library, development, other',
      },
    },
    term: {
      type: String,
      required: [true, 'Term is required'],
      enum: { values: ['first', 'second', 'third'], message: 'Term must be first, second or third' },
    },
    session: {
      type: String,
      required: [true, 'Session is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['paystack', 'cash', 'bank_transfer'],
      default: 'paystack',
    },
    reference: {
      type: String,
      unique: true,
      sparse: true, // allows multiple nulls
    },
    paystackData: {
      type: Object,
      default: null,
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ studentId: 1, term: 1, session: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ reference: 1 });

module.exports = mongoose.model('Payment', paymentSchema);