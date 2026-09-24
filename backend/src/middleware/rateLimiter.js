const rateLimit = require('express-rate-limit');
const env = require('../config/environment');

const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT.WINDOW_MS || 15 * 60 * 1000,
  max: env.RATE_LIMIT.MAX || 100000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 1. Always skip rate limiting in development mode or for local developer loopback
    if (
      process.env.NODE_ENV === 'development' ||
      req.ip === '127.0.0.1' ||
      req.ip === '::1' ||
      req.ip === '::ffff:127.0.0.1' ||
      req.hostname === 'localhost'
    ) {
      return true;
    }

    // 2. Skip rate limiting for real-time telemetry, radar polling, health, outside-rides, scheduled rides
    const url = req.originalUrl || req.url || req.path || '';
    return url.includes('/requests') ||
           url.includes('/active') ||
           url.includes('/health') ||
           url.includes('/dashboard') ||
           url.includes('/status') ||
           url.includes('/scheduled') ||
           url.includes('/outside-rides') ||
           url.includes('/fares') ||
           url.includes('/radar') ||
           url.includes('/rides') ||
           url.includes('/penalties') ||
           url.includes('/earnings');
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development' ||
           req.ip === '127.0.0.1' ||
           req.ip === '::1' ||
           req.ip === '::ffff:127.0.0.1' ||
           req.hostname === 'localhost';
  },
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
