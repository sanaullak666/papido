const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, AuthController.register);
router.post('/register-core', verifyToken, requireRole('ADMIN'), AuthController.registerCore);
router.post('/login', authLimiter, AuthController.login);
router.post('/send-login-otp', otpLimiter, AuthController.sendLoginOtp);
router.post('/verify-login-otp', otpLimiter, AuthController.verifyLoginOtp);
router.post('/refresh', AuthController.refreshToken);
router.post('/forgot-password', otpLimiter, AuthController.forgotPassword);
router.post('/verify-otp', otpLimiter, AuthController.verifyOtp);
router.post('/reset-password', otpLimiter, AuthController.resetPassword);
router.get('/me', verifyToken, AuthController.getMe);
router.patch('/profile', verifyToken, AuthController.updateProfile);
router.post('/change-password', verifyToken, AuthController.changePassword);
router.post('/logout', verifyToken, AuthController.logout);

module.exports = router;
