const express = require('express');
const router = express.Router();
const { protect, adminProtect } = require('../middlewares/authMiddleware');
const {
  getUsers,
  getUserProfile,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../controllers/userController');

router.route('/').get(protect, adminProtect, getUsers);
router.route('/profile').get(protect, getUserProfile);
router.route('/wishlist').get(protect, getWishlist);
router.route('/wishlist/:id').post(protect, addToWishlist).delete(protect, removeFromWishlist);

module.exports = router;
