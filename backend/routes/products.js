const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { getProductReviews, createProductReview } = require('../controllers/reviewController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');

router.route('/').get(getProducts).post(protect, adminProtect, createProduct);
router.route('/:id').get(getProductById).put(protect, adminProtect, updateProduct).delete(protect, adminProtect, deleteProduct);
router.route('/:id/reviews').get(getProductReviews).post(protect, createProductReview);

module.exports = router;
