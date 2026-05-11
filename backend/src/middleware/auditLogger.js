const AuditLog = require('../models/Auditlog');

// Auto-log all mutating requests (POST, PUT, PATCH, DELETE)
var auditLogger = function(req, res, next) {
  var method = req.method;
  if (!['POST','PUT','PATCH','DELETE'].includes(method)) return next();

  // Skip non-API routes and webhook (webhook has raw body we don't want to log)
  var url = req.originalUrl;
  if (!url.startsWith('/api') || url.includes('/webhook')) return next();

  // Capture response status by hooking into res.json
  var originalJson = res.json.bind(res);
  res.json = function(body) {
    // Fire and forget — never block the response
    var logEntry = {
      userId:     req.user ? req.user._id : null,
      userRole:   req.user ? req.user.role : null,
      method:     method,
      resource:   url,
      action:     method + ' ' + url,
      statusCode: res.statusCode,
      ip:         req.ip || req.connection.remoteAddress,
      userAgent:  req.headers['user-agent'] || null,
      body:       sanitizeBody(req.body),
    };

    AuditLog.create(logEntry).catch(function(err) {
      console.error('Audit log error:', err.message);
    });

    return originalJson(body);
  };

  next();
};

// Remove sensitive fields before logging
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  var safe = Object.assign({}, body);
  delete safe.password;
  delete safe.currentPassword;
  delete safe.newPassword;
  delete safe.refreshToken;
  return safe;
}

module.exports = auditLogger;