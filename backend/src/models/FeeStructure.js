const mongoose = require('mongoose');
const feeStructureSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  feeType: {
    type: String, required: true,
    enum: ['tuition','exam','sports','library','development','transport','hostel','pta','uniform','feeding','ict','other'],
  },
  amount:    { type: Number, required: true, min: 0 },
  scope:     { type: String, enum: ['all_classes','specific_class','specific_student'], default: 'all_classes' },
  classId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Class',   default: null },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  session:   { type: String, required: true, trim: true },
  term:      { type: String, enum: ['first','second','third','all'], default: 'all' },
  frequency: { type: String, enum: ['per_term','per_session','one_time'], default: 'per_term' },
  allowInstallment: { type: Boolean, default: false },
  minInstallment:   { type: Number,  default: null },
  isActive:         { type: Boolean, default: true },
  description:      { type: String,  default: null, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
feeStructureSchema.index({ session: 1, term: 1 });
feeStructureSchema.index({ classId: 1, session: 1 });
module.exports = mongoose.model('FeeStructure', feeStructureSchema);
