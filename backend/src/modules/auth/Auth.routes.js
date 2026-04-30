const express = require('express');
const router  = express.Router();
const {
  register, login, logout,
  refreshToken, getMe, updatePassword,
  forgotPassword, resetPassword,
} = require('./Auth.controller');
const protect = require('../../middleware/authMiddleware');

// Public routes
router.post('/register',        register);
router.post('/login',           login);
router.post('/refresh',         refreshToken);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);

// Protected routes
router.use(protect);
router.get('/me',               getMe);
router.post('/logout',          logout);
router.patch('/update-password', updatePassword);

module.exports = router;
