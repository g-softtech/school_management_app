const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    teacherId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: [true, 'Teacher ID is required'] },
    classId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Class',   required: [true, 'Class ID is required'] },
    subjectId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: [true, 'Subject ID is required'] },
    title:      { type: String, required: [true, 'Title is required'], trim: true },
    question:   { type: String, required: [true, 'Question is required'], trim: true },
    fileUrl:    { type: String, default: null },
    fileName:   { type: String, default: null },
    dueDate:    { type: Date,   required: [true, 'Due date is required'] },
    maxScore:   { type: Number, required: [true, 'Max score is required'], min: 1, max: 100 },
    term:       { type: String, required: [true, 'Term is required'], enum: ['first', 'second', 'third'] },
    session:    { type: String, required: [true, 'Session is required'], trim: true },
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

assignmentSchema.index({ classId: 1, subjectId: 1 });
assignmentSchema.index({ teacherId: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);