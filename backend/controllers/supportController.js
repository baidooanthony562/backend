const asyncHandler = require('express-async-handler');
const ChatMessage = require('../models/ChatMessage');
const { sendResendEmail, escapeHtml } = require('../utils/email');

function notifyAdminOfSupportMessage(thread, latestText) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    console.warn('[Support] Skipping admin notification — ADMIN_EMAIL is not set');
    return;
  }
  console.log(`[Support] Sending admin notification to ${to} for message from ${thread.name}`);

  const time = new Date().toLocaleString('en-GH', {
    timeZone: 'Africa/Accra',
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const replyLine = thread.email
    ? `<a href="mailto:${escapeHtml(thread.email)}?subject=${encodeURIComponent('Re: your Cindy Nat support request')}" style="color:#0a66c2;text-decoration:none">Email ${escapeHtml(thread.email)}</a> or reply in the admin dashboard.`
    : `<span style="color:#888">Reply in the admin dashboard.</span>`;

  sendResendEmail({
    to,
    subject: `New support message from ${thread.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <h2 style="color:#131921;margin-bottom:4px">New support message</h2>
        <p style="color:#555;margin-top:0">A signed-in customer just sent a message via the on-site chat widget.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888;width:90px">From</td>
            <td style="padding:10px 0;font-weight:600;color:#131921">${escapeHtml(thread.name)}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">Email</td>
            <td style="padding:10px 0;color:#131921">${thread.email ? escapeHtml(thread.email) : '<span style="color:#888">(not provided)</span>'}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">When</td>
            <td style="padding:10px 0;color:#131921">${escapeHtml(time)}</td>
          </tr>
        </table>
        <div style="margin:20px 0;padding:16px;background:#f9f9f9;border-left:4px solid #D4AF37;border-radius:4px;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(latestText)}</div>
        <p style="margin:24px 0 0;font-size:14px">${replyLine}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
      </div>
    `,
  })
    .then(() => console.log('[Support] Admin notification email sent'))
    .catch((err) => console.error('[Support] Admin notification email FAILED:', err.message));
}

// Customer sends a message. Auth-only — req.user is guaranteed by `protect`.
// Reuses the customer's existing pending thread if one exists so back-and-forth
// stays in a single conversation instead of fanning out into many threads.
const sendSupportMessage = asyncHandler(async (req, res) => {
  const text = String(req.body.message || '').trim();
  if (!text) {
    res.status(400);
    throw new Error('Support message is required');
  }
  if (text.length > 2000) {
    res.status(400);
    throw new Error('Message must be under 2000 characters');
  }

  const now = new Date();
  // Treat any non-answered thread for this user as the "active" conversation.
  let thread = await ChatMessage.findOne({ user: req.user._id, status: 'pending' }).sort({ createdAt: -1 });
  if (!thread) {
    thread = new ChatMessage({
      user: req.user._id,
      name: req.user.name,
      email: req.user.email,
      messages: [],
      lastMessageAt: now,
      status: 'pending',
    });
  }
  thread.messages.push({ from: 'customer', text, createdAt: now });
  thread.lastMessageAt = now;
  thread.status = 'pending'; // reopens if customer follows up on an answered thread
  await thread.save();

  notifyAdminOfSupportMessage(thread, text);

  res.status(201).json(thread);
});

// Customer fetches their current thread (most recent), regardless of status.
// Returns null if they have never written in.
const getMyThread = asyncHandler(async (req, res) => {
  const thread = await ChatMessage.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(thread || null);
});

const listSupportMessages = asyncHandler(async (req, res) => {
  const messages = await ChatMessage.find({}).sort({ lastMessageAt: -1, createdAt: -1 }).limit(500);
  res.json(messages);
});

const setSupportMessageStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'answered'].includes(status)) {
    res.status(400);
    throw new Error('Status must be pending or answered');
  }
  const message = await ChatMessage.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!message) {
    res.status(404);
    throw new Error('Support message not found');
  }
  res.json(message);
});

// Admin appends a reply to a thread. Marks the thread as answered.
const replySupportMessage = asyncHandler(async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) {
    res.status(400);
    throw new Error('Reply text is required');
  }
  if (text.length > 2000) {
    res.status(400);
    throw new Error('Reply must be under 2000 characters');
  }
  const thread = await ChatMessage.findById(req.params.id);
  if (!thread) {
    res.status(404);
    throw new Error('Support thread not found');
  }
  const now = new Date();
  // Old legacy docs don't have a messages array yet — initialise it so the
  // reply doesn't get lost and so the customer sees the conversation later.
  if (!Array.isArray(thread.messages)) thread.messages = [];
  thread.messages.push({ from: 'admin', text, createdAt: now });
  thread.lastMessageAt = now;
  thread.status = 'answered';
  await thread.save();
  res.json(thread);
});

const deleteSupportMessage = asyncHandler(async (req, res) => {
  const result = await ChatMessage.findByIdAndDelete(req.params.id);
  if (!result) {
    res.status(404);
    throw new Error('Support message not found');
  }
  res.json({ deleted: true });
});

module.exports = {
  sendSupportMessage,
  getMyThread,
  listSupportMessages,
  setSupportMessageStatus,
  replySupportMessage,
  deleteSupportMessage,
};
