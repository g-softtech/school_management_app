const mongoose = require('mongoose');
const periodSchema = new mongoose.Schema({
  day:       { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday'], required: true },
  period:    { type: mongoose.Schema.Types.Mixed, required: true },
  startTime: { type: String },
  endTime:   { type: String },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    default: null },
  label:     { type: String, default: null },
}, { _id: true });
const timetableSchema = new mongoose.Schema({
  classId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  academicSession: { type: String, required: true },
  term:            { type: String, enum: ['first','second','third'], required: true },
  periods:         [periodSchema],
  periodConfig:    { type: mongoose.Schema.Types.Mixed, default: null },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
timetableSchema.index({ classId: 1, academicSession: 1, term: 1 }, { unique: true });
module.exports = mongoose.model('Timetable', timetableSchema);
