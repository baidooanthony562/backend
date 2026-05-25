const asyncHandler = require('express-async-handler');
const ChatMessage = require('../models/ChatMessage');
const { sendResendEmail, escapeHtml } = require('../utils/email');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function notifyAdminOfSupportMessage(chat) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    console.warn('[Support] Skipping admin notification — ADMIN_EMAIL is not set');
    return;
  }
  console.log(`[Support] Sending admin notification to ${to} for message from ${chat.name}`);

  const time = new Date(chat.createdAt || Date.now()).toLocaleString('en-GH', {
    timeZone: 'Africa/Accra',
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const replyLine = chat.email
    ? `<a href="mailto:${escapeHtml(chat.email)}?subject=${encodeURIComponent('Re: your Cindy Nat support request')}" style="color:#0a66c2;text-decoration:none">Reply to ${escapeHtml(chat.email)}</a>`
    : `<span style="color:#888">No reply address — customer is a guest</span>`;

  sendResendEmail({
    to,
    subject: `New support message from ${chat.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <h2 style="color:#131921;margin-bottom:4px">New support message</h2>
        <p style="color:#555;margin-top:0">A customer just sent a message via the on-site chat widget.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888;width:90px">From</td>
            <td style="padding:10px 0;font-weight:600;color:#131921">${escapeHtml(chat.name)}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">Email</td>
            <td style="padding:10px 0;color:#131921">${chat.email ? escapeHtml(chat.email) : '<span style="color:#888">(not provided)</span>'}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">When</td>
            <td style="padding:10px 0;color:#131921">${escapeHtml(time)}</td>
          </tr>
        </table>
        <div style="margin:20px 0;padding:16px;background:#f9f9f9;border-left:4px solid #D4AF37;border-radius:4px;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(chat.message)}</div>
        <p style="margin:24px 0 0;font-size:14px">${replyLine}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
      </div>
    `,
  })
    .then(() => console.log('[Support] Admin notification email sent'))
    .catch((err) => console.error('[Support] Admin notification email FAILED:', err.message));
}

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

  // Fire-and-forget — never block the customer's response on the email send.
  notifyAdminOfSupportMessage(chat);

  res.status(201).json({
    message: 'Support request received',
    response: chat.response,
  });
});

// Admin: list all support messages, newest first. Capped to 500 so the
// page can never accidentally pull the whole collection at once.
const listSupportMessages = asyncHandler(async (req, res) => {
  const messages = await ChatMessage.find({}).sort({ createdAt: -1 }).limit(500);
  res.json(messages);
});

// Admin: flip a message between pending ↔ answered. Used as a lightweight
// "I've handled this" toggle so the inbox doesn't keep showing old items.
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

module.exports = { sendSupportMessage, listSupportMessages, setSupportMessageStatus };
