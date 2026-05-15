const mongoose = require('mongoose');

const adminSessionSchema = new mongoose.Schema({
  email: { type: String, required: true },
  loginAt: { type: Date, default: Date.now },
  logoutAt: { type: Date },
  ip: { type: String },
});

module.exports = mongoose.model('AdminSession', adminSessionSchema);
