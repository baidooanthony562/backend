const mongoose = require('mongoose');

const chatMessageSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    message: { type: String, required: true },
    response: { type: String },
    status: { type: String, enum: ['pending', 'answered'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
