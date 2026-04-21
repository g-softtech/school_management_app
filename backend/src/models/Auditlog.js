const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userRole: { type: String, default: null },
    action:   { type: String, required: true },
    method:   { type: String, required: true },
    resource: { type: String, required: true },
    statusCode: { type: Number, default: null },
    ip:       { type: String, default: null },
    userAgent:{ type: String, default: null },
    body:     { type: Object, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);