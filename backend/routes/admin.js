const express = require('express');
const router = express.Router();
const { adminLogin, adminLogout, getAdminSessions, getDashboardStats, getUsers, verifyUser, getDailySales } = require('../controllers/adminController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');

router.post('/login', adminLogin);
router.post('/logout', protect, adminProtect, adminLogout);
router.get('/sessions', protect, adminProtect, getAdminSessions);
router.get('/dashboard', protect, adminProtect, getDashboardStats);
router.get('/users', protect, adminProtect, getUsers);
router.put('/users/:id/verify', protect, adminProtect, verifyUser);
router.get('/sales/daily', protect, adminProtect, getDailySales);

module.exports = router;
