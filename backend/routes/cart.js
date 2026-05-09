const express = require('express');
const router = express.Router();
const { getCart, updateCart } = require('../controllers/cartController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').get(protect, getCart).post(protect, updateCart);

module.exports = router;
