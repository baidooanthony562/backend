const mongoose = require('mongoose');

const productSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    images: [{ type: String }],
    price: { type: Number, required: true, default: 0 },
    wholesalePrice: { type: Number, default: 0 },
    wholesaleMinQty: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    stock: { type: Number, required: true, default: 0 },
    sku: { type: String },
    rating: { type: Number, default: 4.5 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    featured: { type: Boolean, default: false },
    bestseller: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
