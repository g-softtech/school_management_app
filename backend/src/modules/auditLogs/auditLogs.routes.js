const express = require('express');
const router  = express.Router();
const { getAuditLogs } = require('./auditLogs.controller');
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');

router.use(protect);
router.get('/', restrictTo('admin'), getAuditLogs);

module.exports = router;