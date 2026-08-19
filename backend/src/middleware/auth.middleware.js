const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const { error } = require('../utils/response');
const UserModel = require('../models/user.model');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Authentication token missing or invalid format.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT.SECRET);

    // Verify user exists and is active
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return error(res, 'User account associated with this token not found.', 401);
    }

    if (user.status === 'SUSPENDED') {
      const reason = user.suspension_reason && user.suspension_reason.trim().length > 0
        ? user.suspension_reason.trim()
        : 'Administrative action taken by campus administration.';
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: `Your account has been suspended: ${reason}`,
        suspensionReason: reason,
        statusCode: 403
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Authentication token has expired. Please refresh your session.', 401);
    }
    return error(res, 'Invalid authentication token.', 401);
  }
};

module.exports = {
  verifyToken
};
