const express = require('express');
const router = express.Router();
const { registerUser, authUser, getUserProfile, forgotPassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/forgot-password', forgotPassword);
router.get('/profile', protect, getUserProfile);

module.exports = router;
