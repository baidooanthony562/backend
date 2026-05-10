const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Category = require('../models/Category');

const getProducts = asyncHandler(async (req, res) => {
  const { search, category, minPrice, maxPrice, sort, featured, limit } = req.query;
  let filter = { active: true };
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = { $regex: escaped, $options: 'i' };
  }
  if (category) {
    if (category.match(/^[0-9a-fA-F]{24}$/)) {
      filter.category = category;
    } else {
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) filter.category = categoryDoc._id;
    }
  }
  if (featured === 'true') filter.featured = true;
  if (minPrice || maxPrice) filter.price = {};
  if (minPrice) filter.price.$gte = Number(minPrice);
  if (maxPrice) filter.price.$lte = Number(maxPrice);

  let query = Product.find(filter).populate('category');
  if (sort === 'cheapest') query = query.sort({ price: 1 });
  else if (sort === 'newest') query = query.sort({ createdAt: -1 });
  else if (sort === 'popular') query = query.sort({ rating: -1 });
  if (limit) query = query.limit(Number(limit));

  const products = await query;
  res.json(products);
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category')
    .populate({ path: 'reviews', populate: { path: 'user', select: 'name' } });
  if (product) res.json(product);
  else {
    res.status(404);
    throw new Error('Product not found');
  }
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, images, image, price, stock, discount, featured, bestseller } = req.body;
  if (!name || !price || !stock) {
    res.status(400);
    throw new Error('Name, price and stock are required');
  }
  const productImages = images?.length ? images : image ? [image] : [];
  const product = new Product({
    name,
    description: description || '',
    category: category || undefined,
    images: productImages,
    price: Number(price),
    stock: Number(stock),
    discount: Number(discount) || 0,
    featured: Boolean(featured),
    bestseller: Boolean(bestseller),
    active: true,
  });
  const created = await product.save();
  res.status(201).json(created);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    product.name = req.body.name || product.name;
    product.description = req.body.description || product.description;
    product.price = req.body.price || product.price;
    product.stock = req.body.stock || product.stock;
    product.discount = req.body.discount || product.discount;
    product.category = req.body.category || product.category;
    product.images = req.body.images || product.images;
    product.featured = req.body.featured ?? product.featured;
    product.bestseller = req.body.bestseller ?? product.bestseller;
    const updated = await product.save();
    res.json(updated);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (product) {
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
