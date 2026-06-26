const express = require('express');
const router = express.Router();
const websiteBuilderController = require('../controllers/websiteBuilder.controller');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const tenantContext = require('../middleware/tenantContext');

// 1. Unauthenticated route (dynamic template rendering)
// This does not use tenantContext because it resolves strictly from the Host header directly in the controller
router.get('/public', websiteBuilderController.getPublicWebsiteConfig);

// 2. Authenticated route (Admin Website Builder)
// tenantContext parses the subdomain / x-tenant-id to set req.tenantId
router.post('/config', tenantContext, protect, requireRole(['admin', 'SUPER_ADMIN']), websiteBuilderController.updateWebsiteConfig);

module.exports = router;
