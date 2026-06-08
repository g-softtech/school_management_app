const mongoose = require('mongoose');

const termSchema = new mongoose.Schema({
  name:      { type: String, enum: ['first','second','third'], required: true },
  startDate: { type: Date, default: null },
  endDate:   { type: Date, default: null },
  isActive:  { type: Boolean, default: false },
}, { _id: true });

const academicSessionSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  isCurrent: { type: Boolean, default: false },
  isActive:  { type: Boolean, default: true },
  terms:     { type: [termSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Remove unique index on name — it causes E11000 on re-deploy
// Uniqueness is handled in the controller instead
academicSessionSchema.index({ name: 1 }); // non-unique index for fast lookup

module.exports = mongoose.model('AcademicSession', academicSessionSchema);
