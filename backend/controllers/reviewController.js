const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Product = require('../models/Product');

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const getProductReviews = asyncHandler(async (req, res) => {
  if (!OBJECT_ID_RE.test(req.params.id)) {
    res.status(400);
    throw new Error('Invalid product ID');
  }
  const reviews = await Review.find({ product: req.params.id }).populate('user', 'name');
  res.json(reviews);
});

const createProductReview = asyncHandler(async (req, res) => {
  if (!OBJECT_ID_RE.test(req.params.id)) {
    res.status(400);
    throw new Error('Invalid product ID');
  }

  const { rating, comment } = req.body;
  const ratingNum = Number(rating);
  if (!rating || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    res.status(400);
    throw new Error('Rating must be a whole number between 1 and 5');
  }
  if (comment && String(comment).length > 1000) {
    res.status(400);
    throw new Error('Comment must be under 1000 characters');
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  const existingReview = await Review.findOne({ product: product._id, user: req.user._id });
  if (existingReview) {
    res.status(400);
    throw new Error('You have already reviewed this product');
  }

  const review = new Review({
    user: req.user._id,
    product: product._id,
    rating: ratingNum,
    comment: comment ? String(comment).trim().slice(0, 1000) : '',
  });
  await review.save();

  product.reviews.push(review._id);

  // Single aggregation query instead of fetching all reviews to compute average
  const [stats] = await Review.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  product.rating = stats?.avg || ratingNum;
  await product.save();

  res.status(201).json(review);
});

module.exports = {
  getProductReviews,
  createProductReview,
};
