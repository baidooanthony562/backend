const express = require('express');
const router = express.Router();
const { createOrder, createGuestOrder, getGuestOrder, getMyOrders, getOrderById, getOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, createOrder).get(protect, adminProtect, getOrders);
router.post('/guest', createGuestOrder);
router.get('/guest/:id', getGuestOrder);
router.route('/my-orders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/status').put(protect, adminProtect, updateOrderStatus);

module.exports = router;
