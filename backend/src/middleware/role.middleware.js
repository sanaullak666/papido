const { error } = require('../utils/response');

/**
 * Enforces specific role requirement on endpoint
 * E.g. requireRole('ADMIN'), requireRole('RIDER'), requireRole('CUSTOMER')
 */
const requireRole = (allowedRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required before role verification.', 401);
    }

    if (req.user.role !== allowedRole) {
      return res.status(403).json({
        success: false,
        code: 'ROLE_VIOLATION',
        message: 'This account cannot access this portal.',
        statusCode: 403,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Allows multiple specified roles
 */
const requireAnyRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required before role verification.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'ROLE_VIOLATION',
        message: 'This account cannot access this portal.',
        statusCode: 403,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireAnyRole
};
