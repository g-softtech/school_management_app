const mongoose = require('mongoose');
const admissionSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date },
  gender:   { type: String, enum: ['male','female','other'] },
  applyingFor: { type: String, required: true },
  parentName:  { type: String, required: true, trim: true },
  email:       { type: String, required: true, trim: true, lowercase: true },
  phone:       { type: String, required: true, trim: true },
  address:     { type: String, trim: true },
  notes:       { type: String },
  status:      { type: String, enum: ['pending','reviewing','accepted','rejected'], default: 'pending' },
  adminNotes:  { type: String },
  reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:  { type: Date },
}, { timestamps: true });
module.exports = mongoose.model('AdmissionApplication', admissionSchema);
