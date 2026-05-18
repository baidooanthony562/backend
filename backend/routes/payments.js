const express = require('express');
const router = express.Router();
const { initiateMoMoPayment, checkMoMoStatus, initializePaystackPayment, verifyPaystackPayment } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/momo/request', protect, initiateMoMoPayment);
router.get('/momo/status/:referenceId', protect, checkMoMoStatus);
router.post('/paystack/initialize', initializePaystackPayment);
router.get('/paystack/verify/:reference', verifyPaystackPayment);

module.exports = router;
