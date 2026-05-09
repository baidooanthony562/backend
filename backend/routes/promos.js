const express = require('express');
const router = express.Router();
const { createPromo, getPromos, validatePromo } = require('../controllers/promoController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');

router.route('/').get(getPromos).post(protect, adminProtect, createPromo);
router.route('/validate').post(validatePromo);

module.exports = router;
