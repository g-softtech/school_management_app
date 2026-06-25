const express = require('express');
const platformController = require('../controllers/platform.controller');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to protect platform routes
const requirePlatformOwner = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Platform token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    if (decoded.role !== 'PLATFORM_OWNER') {
      return res.status(403).json({ success: false, message: 'Platform Owner strictly required' });
    }
    req.platformUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid platform token' });
  }
};

router.post('/login', platformController.loginPlatformOwner);

// Protected routes
router.use(requirePlatformOwner);
router.get('/analytics', platformController.getPlatformAnalytics);
router.get('/requests', platformController.getTenantRequests);
router.post('/requests/:requestId/approve', platformController.approveTenantRequest);
router.post('/requests/:requestId/reject', platformController.rejectTenantRequest);

module.exports = router;
