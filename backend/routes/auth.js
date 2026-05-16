const express = require('express');
const router = express.Router();
const {
  registerUser, authUser, verifyEmail, verifyEmailCode, resendVerification,
  getUserProfile, forgotPassword, verifyResetCode, resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { passwordResetLimiter } = require('../middlewares/limiters');

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/verify-email/:token', verifyEmail);
router.post('/verify-email-code', passwordResetLimiter, verifyEmailCode);
router.post('/resend-verification', passwordResetLimiter, resendVerification);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/verify-reset-code', passwordResetLimiter, verifyResetCode);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/profile', protect, getUserProfile);

module.exports = router;
