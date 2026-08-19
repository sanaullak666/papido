const { error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Global 404 Handler
 */
const notFoundHandler = (req, res, next) => {
  return error(res, `API route '${req.originalUrl}' not found.`, 404);
};

/**
 * Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error occurred.';

  return error(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
