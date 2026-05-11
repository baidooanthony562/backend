const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  res.json(categories);
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, slug, icon } = req.body;
  if (!name) { res.status(400); throw new Error('Category name is required'); }
  const category = await Category.create({ name, description, slug, icon });
  res.status(201).json(category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) { res.status(404); throw new Error('Category not found'); }
  const { name, description, slug, icon } = req.body;
  if (name) category.name = name;
  if (description !== undefined) category.description = description;
  if (slug) category.slug = slug;
  if (icon) category.icon = icon;
  const updated = await category.save();
  res.json(updated);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (category) res.json({ message: 'Category deleted' });
  else { res.status(404); throw new Error('Category not found'); }
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
