const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Product = require('../models/Product');

const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.id }).populate('user', 'name');
  res.json(reviews);
});

const createProductReview = asyncHandler(async (req, res) => {
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
  const reviews = await Review.find({ product: product._id });
  product.rating = reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length;
  await product.save();
  res.status(201).json(review);
});

module.exports = {
  getProductReviews,
  createProductReview,
};
