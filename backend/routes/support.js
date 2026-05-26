const express = require('express');
const router = express.Router();
const {
  sendSupportMessage,
  getMyThread,
  listSupportMessages,
  setSupportMessageStatus,
  replySupportMessage,
  deleteSupportMessage,
} = require('../controllers/supportController');
const { protect, adminProtect } = require('../middlewares/authMiddleware');

// Customer-facing — both auth-only. Guests must use WhatsApp.
router.post('/message', protect, sendSupportMessage);
router.get('/my-thread', protect, getMyThread);

// Admin-facing.
router.get('/messages', protect, adminProtect, listSupportMessages);
router.patch('/messages/:id', protect, adminProtect, setSupportMessageStatus);
router.post('/messages/:id/reply', protect, adminProtect, replySupportMessage);
router.delete('/messages/:id', protect, adminProtect, deleteSupportMessage);

module.exports = router;
