const rateLimit = require('express-rate-limit');
const env = require('../config/environment');

const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT.WINDOW_MS,
  max: env.RATE_LIMIT.MAX || 50000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for real-time telemetry, radar polling, health, and local dev
    return req.path.includes('/requests') ||
           req.path.includes('/active') ||
           req.path.includes('/health') ||
           req.path.includes('/dashboard') ||
           req.path.includes('/status');
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    timestamp: new Date().toISOString()
  }
});

module.exports = {
  generalLimiter,
  authLimiter
};
