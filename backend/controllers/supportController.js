const asyncHandler = require('express-async-handler');
const ChatMessage = require('../models/ChatMessage');

const sendSupportMessage = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;
  if (!message || message.trim().length === 0) {
    res.status(400);
    throw new Error('Support message is required');
  }
  const chat = new ChatMessage({
    name: name || 'Guest',
    email,
    message: message.trim(),
    response: `Thanks ${name || 'there'}! Our support team received your message and will reply shortly.`,
  });
  await chat.save();
  res.status(201).json({
    message: 'Support request received',
    response: chat.response,
  });
});

module.exports = { sendSupportMessage };
