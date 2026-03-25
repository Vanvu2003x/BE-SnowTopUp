const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');
const { checkToken, checkRoleMDW } = require('../../middleware/auJWT.middleware');
const { authLimiter, otpLimiter } = require('../../middleware/rateLimit.middleware');

// Public routes - with rate limiting
router.post('/register', otpLimiter, AuthController.register); // OTP required
router.post('/login', authLimiter, AuthController.login); // 5 attempts per 15 min
router.post('/check-mail', otpLimiter, AuthController.checkmail); // 3 OTP per 5 min
router.post('/checkmail', otpLimiter, AuthController.checkmail); // 3 OTP per 5 min
router.post('/forgot-password', otpLimiter, AuthController.forgotPasswordSendOTP); // 3 OTP per 5 min
router.post('/reset-password', authLimiter, AuthController.resetPassword);
router.post('/logout', AuthController.logout);

// Protected routes
router.post('/checkRole', checkToken, AuthController.getRole);

module.exports = router;
