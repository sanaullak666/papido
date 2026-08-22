const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, AuthController.register);
router.post('/register-core', authLimiter, AuthController.registerCore);
router.post('/login', authLimiter, AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/verify-otp', authLimiter, AuthController.verifyOtp);
router.post('/reset-password', authLimiter, AuthController.resetPassword);
router.get('/me', verifyToken, AuthController.getMe);
router.patch('/profile', verifyToken, AuthController.updateProfile);
router.post('/change-password', verifyToken, AuthController.changePassword);
router.post('/logout', verifyToken, AuthController.logout);

module.exports = router;
