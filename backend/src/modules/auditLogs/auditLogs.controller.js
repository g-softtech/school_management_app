const AuditLog   = require('../../models/Auditlog');
const catchAsync = require('../../utils/catchAsync');
const paginate   = require('../../utils/paginate');

// GET /api/audit-logs — Admin only
exports.getAuditLogs = catchAsync(async function(req, res, next) {
  var p = paginate(req.query);
  var filter = {};

  if (req.query.userId)   filter.userId   = req.query.userId;
  if (req.query.method)   filter.method   = req.query.method.toUpperCase();
  if (req.query.userRole) filter.userRole = req.query.userRole;

  // Date range filter
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to);
  }

  var total = await AuditLog.countDocuments(filter);
  var logs  = await AuditLog.find(filter)
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .skip(p.skip)
    .limit(p.limit);

  res.status(200).json({
    success: true,
    pagination: { total, page: p.page, limit: p.limit, pages: Math.ceil(total / p.limit) },
    data: logs,
  });
});