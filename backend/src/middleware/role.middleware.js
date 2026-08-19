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
      return error(
        res,
        `Access denied: '${req.user.role}' is not authorized to access this resource. Requires '${allowedRole}'.`,
        403
      );
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
      return error(
        res,
        `Access denied: Role '${req.user.role}' is not authorized. Allowed roles: [${allowedRoles.join(', ')}].`,
        403
      );
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireAnyRole
};
