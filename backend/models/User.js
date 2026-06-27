const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    isAdmin: { type: Boolean, default: false },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    isVerified: { type: Boolean, default: false },
    verifyToken: { type: String },
    verifyTokenExpiry: { type: Date },
    verifyAttempts: { type: Number, default: 0 },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    resetAttempts: { type: Number, default: 0 },
    // Bumped whenever the password changes; embedded in the auth JWT so that
    // previously-issued sessions (e.g. on a stolen device) stop validating
    // after a password reset or change.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
