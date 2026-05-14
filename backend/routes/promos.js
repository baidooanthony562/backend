const express = require('express');
const router = express.Router();
const { createPromo, getPromos, validatePromo, deletePromo } = require('../controllers/promoController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');
const { promoLimiter } = require('../middlewares/limiters');

router.route('/').get(protect, adminProtect, getPromos).post(protect, adminProtect, createPromo);
router.route('/validate').post(promoLimiter, validatePromo);
router.route('/:id').delete(protect, adminProtect, deletePromo);

module.exports = router;
