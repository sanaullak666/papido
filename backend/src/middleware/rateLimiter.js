const rateLimit = require('express-rate-limit');
const env = require('../config/environment');

const isLocalOrTest = (req) => {
  return (
    process.env.NODE_ENV === 'test' ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip === '::ffff:127.0.0.1' ||
    req.hostname === 'localhost'
  );
};

const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT.WINDOW_MS || 15 * 60 * 1000,
  max: env.RATE_LIMIT.MAX || 50000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (isLocalOrTest(req)) return true;
    const url = req.originalUrl || req.url || req.path || '';
    return (
      url.includes('/requests') ||
      url.includes('/active') ||
      url.includes('/health') ||
      url.includes('/dashboard') ||
      url.includes('/status') ||
      url.includes('/scheduled') ||
      url.includes('/radar')
    );
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalOrTest(req),
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    timestamp: new Date().toISOString()
  }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // 15 OTP attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalOrTest(req),
  message: {
    success: false,
    message: 'Too many OTP verification attempts. Please try again after 15 minutes.',
    timestamp: new Date().toISOString()
  }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalOrTest(req),
  message: {
    success: false,
    message: 'Upload rate limit reached. Please wait before uploading more files.',
    timestamp: new Date().toISOString()
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  otpLimiter,
  uploadLimiter
};
