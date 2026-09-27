const { error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Global 404 Handler
 */
const notFoundHandler = (req, res, next) => {
  return error(res, `API route '${req.originalUrl}' not found.`, 404);
};

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });

  const statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error occurred.';

  // Prevent database internal error disclosure in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    if (message.includes('SQL') || message.includes('SELECT') || message.includes('INSERT') || message.includes('table') || message.includes('column')) {
      message = 'A system error occurred. Please contact support if the issue persists.';
    }
  }

  const stack = process.env.EXPOSE_STACK_TRACE === 'true' ? err.stack : null;
  return error(res, message, statusCode, stack);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
