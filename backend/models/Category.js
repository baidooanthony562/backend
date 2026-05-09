const mongoose = require('mongoose');

const categorySchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    slug: { type: String, required: true, unique: true },
    icon: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
