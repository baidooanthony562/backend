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
  const safeLimit = Math.min(Number(limit) || 200, 200);
  query = query.limit(safeLimit);

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

async function resolveCategory(input) {
  if (!input) return undefined;
  if (/^[a-f\d]{24}$/i.test(input)) return input;
  const cat = await Category.findOne({ name: input }) || await Category.findOne({ slug: input });
  return cat?._id;
}

function validateProductFields(fields, res) {
  const { price, stock, discount, wholesalePrice, wholesaleMinQty } = fields;
  const priceNum = Number(price);
  const stockNum = Number(stock);
  const discountNum = Number(discount) || 0;

  if (isNaN(priceNum) || priceNum <= 0) {
    res.status(400);
    throw new Error('Price must be greater than 0');
  }
  if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
    res.status(400);
    throw new Error('Stock must be a non-negative integer');
  }
  if (discountNum < 0 || discountNum > 100) {
    res.status(400);
    throw new Error('Discount must be between 0 and 100');
  }
  if (wholesalePrice !== undefined && Number(wholesalePrice) < 0) {
    res.status(400);
    throw new Error('Wholesale price cannot be negative');
  }
  if (wholesaleMinQty !== undefined && Number(wholesaleMinQty) < 0) {
    res.status(400);
    throw new Error('Wholesale minimum quantity cannot be negative');
  }
  return { priceNum, stockNum, discountNum };
}

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, images, image, price, stock, discount, wholesalePrice, wholesaleMinQty, featured, bestseller } = req.body;
  if (!name || !price || stock === undefined) {
    res.status(400);
    throw new Error('Name, price and stock are required');
  }
  const { priceNum, stockNum, discountNum } = validateProductFields({ price, stock, discount, wholesalePrice, wholesaleMinQty }, res);

  const productImages = images?.length ? images : image ? [image] : [];
  const categoryId = await resolveCategory(category);
  const product = new Product({
    name: String(name).trim().slice(0, 200),
    description: description ? String(description).trim().slice(0, 5000) : '',
    category: categoryId,
    images: productImages,
    price: priceNum,
    stock: stockNum,
    discount: discountNum,
    wholesalePrice: Number(wholesalePrice) || 0,
    wholesaleMinQty: Number(wholesaleMinQty) || 0,
    featured: Boolean(featured),
    bestseller: Boolean(bestseller),
    active: true,
  });
  const created = await product.save();
  res.status(201).json(created);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (req.body.price !== undefined || req.body.stock !== undefined) {
    validateProductFields({
      price: req.body.price ?? product.price,
      stock: req.body.stock ?? product.stock,
      discount: req.body.discount ?? product.discount,
      wholesalePrice: req.body.wholesalePrice,
      wholesaleMinQty: req.body.wholesaleMinQty,
    }, res);
  }

  if (req.body.name !== undefined) product.name = String(req.body.name).trim().slice(0, 200);
  if (req.body.description !== undefined) product.description = String(req.body.description).trim().slice(0, 5000);
  if (req.body.price !== undefined) product.price = Number(req.body.price);
  if (req.body.stock !== undefined) product.stock = Number(req.body.stock);
  if (req.body.discount !== undefined) product.discount = Number(req.body.discount);
  if (req.body.category) product.category = await resolveCategory(req.body.category) || product.category;
  if (req.body.images !== undefined) product.images = req.body.images;
  if (req.body.wholesalePrice !== undefined) product.wholesalePrice = Number(req.body.wholesalePrice);
  if (req.body.wholesaleMinQty !== undefined) product.wholesaleMinQty = Number(req.body.wholesaleMinQty);
  if (req.body.featured !== undefined) product.featured = Boolean(req.body.featured);
  if (req.body.bestseller !== undefined) product.bestseller = Boolean(req.body.bestseller);

  const updated = await product.save();
  res.json(updated);
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
