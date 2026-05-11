const express = require('express');
const router = express.Router();
const { initiateMoMoPayment, checkMoMoStatus } = require('../controllers/paymentController');

router.post('/momo/request', initiateMoMoPayment);
router.get('/momo/status/:referenceId', checkMoMoStatus);

module.exports = router;
