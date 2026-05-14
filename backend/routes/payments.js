const express = require('express');
const router = express.Router();
const { initiateMoMoPayment, checkMoMoStatus } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/momo/request', protect, initiateMoMoPayment);
router.get('/momo/status/:referenceId', protect, checkMoMoStatus);

module.exports = router;
