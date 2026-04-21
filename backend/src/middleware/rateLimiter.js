const rateLimit = require('express-rate-limit');

// General API limiter — 200 requests per 15 minutes
var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP. Please try again in 15 minutes.' },
});

// Strict limiter for auth endpoints — 10 requests per 15 minutes
var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// AI limiter — 20 requests per hour (AI calls are expensive)
var aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'AI request limit reached. Please try again in 1 hour.' },
});

module.exports = { apiLimiter, authLimiter, aiLimiter };