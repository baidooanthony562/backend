const express = require('express');
const router = express.Router();
const { getCategories, createCategory } = require('../controllers/categoryController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');

router.route('/').get(getCategories).post(protect, adminProtect, createCategory);

module.exports = router;
