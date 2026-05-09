const express = require('express');
const router = express.Router();
const { adminLogin, getDashboardStats, getUsers } = require('../controllers/adminController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');

router.post('/login', adminLogin);
router.get('/dashboard', protect, adminProtect, getDashboardStats);
router.get('/users', protect, adminProtect, getUsers);

module.exports = router;
