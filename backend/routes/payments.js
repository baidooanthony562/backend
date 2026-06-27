const express = require('express');
const router = express.Router();
const { initiateMoMoPayment, checkMoMoStatus, initializePaystackPayment, verifyPaystackPayment } = require('../controllers/paymentController');
const { finalizeOrderByReference } = require('../controllers/orderController');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');

router.post('/momo/request', protect, initiateMoMoPayment);
router.get('/momo/status/:referenceId', protect, checkMoMoStatus);
// optionalAuth so we can record the buyer (user or guest) on the pending order.
router.post('/paystack/initialize', optionalAuth, initializePaystackPayment);
router.get('/paystack/verify/:reference', verifyPaystackPayment);
// Browser-facing finalize for the payment-return page (webhook is the backup).
router.post('/paystack/finalize', finalizeOrderByReference);

module.exports = router;
