const mongoose = require('mongoose');

// A ChatMessage is now a *thread* between one signed-in customer and the
// admin. The legacy single-message + response fields are kept on the schema
// without `required` so older docs from before the thread migration still
// load — the admin UI handles both shapes and offers a Delete to clean up.
const chatMessageSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: { type: String },

    // New thread structure — every message (customer or admin) lives here.
    messages: [
      {
        from: { type: String, enum: ['customer', 'admin'], required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastMessageAt: { type: Date, default: Date.now, index: true },

    // Legacy fields from the pre-thread schema — left optional so old docs
    // still validate. New writes do not populate these.
    message: { type: String },
    response: { type: String },

    status: { type: String, enum: ['pending', 'answered'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
