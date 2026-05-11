const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');

router.route('/').get(getCategories).post(protect, adminProtect, createCategory);
router.route('/:id').put(protect, adminProtect, updateCategory).delete(protect, adminProtect, deleteCategory);

module.exports = router;
