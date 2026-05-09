const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  res.json(categories);
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, slug, icon } = req.body;
  const category = await Category.create({ name, description, slug, icon });
  res.status(201).json(category);
});

module.exports = { getCategories, createCategory };
