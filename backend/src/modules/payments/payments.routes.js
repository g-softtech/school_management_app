const express = require('express');
const router  = express.Router();
const {
  initializePayment,
  verifyPayment,
  webhook,
  recordManualPayment,
  getStudentPayments,
  getAllPayments,
  getReceipt,
} = require('./payments.controller');
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');

// Webhook must be public — no auth, Paystack calls this directly
router.post('/webhook', webhook);

// All routes below require authentication
router.use(protect);

router.post('/initialize',            restrictTo('admin', 'parent'), initializePayment);
router.get('/verify/:reference',      verifyPayment);
router.post('/manual',                restrictTo('admin'), recordManualPayment);
router.get('/',                       restrictTo('admin'), getAllPayments);
router.get('/student/:studentId',     restrictTo('admin', 'parent'), getStudentPayments);
router.get('/:id/receipt',            restrictTo('admin', 'parent'), getReceipt);

module.exports = router;