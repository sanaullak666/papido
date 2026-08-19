/**
 * Standardized API Response Utilities
 */

const success = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const error = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

const paginate = (res, message, items, total, page = 1, limit = 10) => {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    success: true,
    message,
    data: {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  success,
  error,
  paginate
};
