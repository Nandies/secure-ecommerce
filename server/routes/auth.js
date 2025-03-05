const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const router = express.Router();

// Apply stricter rate limiting for sensitive routes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 accounts per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many accounts created from this IP, please try again after an hour'
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many password reset attempts from this IP, please try again after an hour'
});

// Auth routes
router.post('/signup', signupLimiter, authController.signup);
router.post('/login', loginLimiter, authController.login);
router.get('/logout', authController.logout);

// Password management
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.patch('/reset-password/:token', passwordResetLimiter, authController.resetPassword);

// Protected routes - require authentication
router.use(authController.protect); // All routes after this middleware require authentication

router.patch('/update-password', authController.updatePassword);
router.get('/validate-token', authController.validateToken);

// Export the router
module.exports = router;