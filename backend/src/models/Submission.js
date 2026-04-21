const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: [true, 'Assignment ID is required'] },
    studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student',    required: [true, 'Student ID is required'] },
    answer:       { type: String, default: null, trim: true },
    fileUrl:      { type: String, default: null },
    fileName:     { type: String, default: null },
    submittedAt:  { type: Date, default: Date.now },
    score:        { type: Number, default: null, min: 0 },
    feedback:     { type: String, default: null, trim: true },
    gradedAt:     { type: Date, default: null },
    gradedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['submitted', 'graded', 'returned'],
      default: 'submitted',
    },
  },
  { timestamps: true }
);

// One submission per student per assignment
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ studentId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);