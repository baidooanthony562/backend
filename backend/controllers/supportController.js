const asyncHandler = require('express-async-handler');
const ChatMessage = require('../models/ChatMessage');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sendSupportMessage = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  // Stringify before any string operations — prevents TypeError on numeric input
  const messageStr = String(req.body.message || '').trim();

  if (!messageStr) {
    res.status(400);
    throw new Error('Support message is required');
  }
  if (messageStr.length > 2000) {
    res.status(400);
    throw new Error('Message must be under 2000 characters');
  }
  if (name && String(name).length > 100) {
    res.status(400);
    throw new Error('Name must be under 100 characters');
  }
  if (email && !EMAIL_RE.test(email)) {
    res.status(400);
    throw new Error('Invalid email address');
  }

  const safeName = name ? String(name).trim().slice(0, 100) : 'Guest';
  const chat = new ChatMessage({
    name: safeName,
    email: email || '',
    message: messageStr,
    response: `Thanks ${safeName}! Our support team received your message and will reply shortly.`,
  });
  await chat.save();
  res.status(201).json({
    message: 'Support request received',
    response: chat.response,
  });
});

module.exports = { sendSupportMessage };
