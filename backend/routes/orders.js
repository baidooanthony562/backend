const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrderById, getOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, createOrder).get(protect, adminProtect, getOrders);
router.route('/my-orders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/status').put(protect, adminProtect, updateOrderStatus);

module.exports = router;
