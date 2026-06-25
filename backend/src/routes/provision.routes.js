const express = require('express');
const router = express.Router();
const provisionController = require('../controllers/provision.controller');

// POST /api/public/provision
router.post('/provision', provisionController.registerTenantRequest);

module.exports = router;
