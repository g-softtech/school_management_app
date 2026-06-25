const express = require('express');
const router = express.Router();
const provisionController = require('../controllers/provision.controller');

// POST /api/public/provision
router.post('/provision', provisionController.provisionTenant);

module.exports = router;
