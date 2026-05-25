const express = require('express');
const router = express.Router();
const { sendSupportMessage, listSupportMessages, setSupportMessageStatus } = require('../controllers/supportController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');

router.post('/message', sendSupportMessage);
router.get('/messages', protect, adminProtect, listSupportMessages);
router.patch('/messages/:id', protect, adminProtect, setSupportMessageStatus);

module.exports = router;
