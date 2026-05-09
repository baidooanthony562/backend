const Category = require('../models/Category');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');

const categories = [
  { name: 'Blenders', slug: 'blenders', description: 'High-performance blenders for smoothies, sauces, and soups.', icon: '🧃' },
  { name: 'Rice Cookers', slug: 'rice-cookers', description: 'Smart rice cookers for perfect texture every time.', icon: '🍚' },
  { name: 'Pots & Pans', slug: 'pots-pans', description: 'Nonstick cookware sets for every kitchen.', icon: '🍳' },
  { name: 'Drink Dispensers', slug: 'drink-dispensers', description: 'Stylish dispensers for tea and beverages.', icon: '🫖' },
];

const products = [
  {
    name: 'Premium 4-in-1 Blender',
    description: 'Powerful blender with multiple speed settings and easy-clean design.',
    price: 129.99,
    stock: 12,
    discount: 10,
    categorySlug: 'blenders',
    images: ['https://images.unsplash.com/photo-1510414696678-2415ad8474aa?auto=format&fit=crop&w=800&q=80'],
    rating: 4.8,
    featured: true,
    bestseller: true,
  },
  {
    name: 'Smart Rice Cooker',
    description: 'Automatic rice cooker with keep-warm feature and digital controls.',
    price: 89.99,
    stock: 6,
    discount: 5,
    categorySlug: 'rice-cookers',
    images: ['https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80'],
    rating: 4.6,
    featured: true,
    bestseller: true,
  },
  {
    name: 'Nonstick Frying Pan Set',
    description: 'Durable ceramic nonstick pan set for healthy cooking.',
    price: 74.5,
    stock: 18,
    discount: 8,
    categorySlug: 'pots-pans',
    images: ['https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=800&q=80'],
    rating: 4.7,
    featured: false,
    bestseller: false,
  },
];

const seedData = async (req, res) => {
  await Category.deleteMany();
  await Product.deleteMany();

  const createdCategories = await Category.insertMany(categories);

  const createdProducts = products.map((product) => {
    const category = createdCategories.find((cat) => cat.slug === product.categorySlug);
    return { ...product, category: category._id };
  });

  await Product.insertMany(createdProducts);
  await PromoCode.deleteMany();
  await PromoCode.insertMany([
    {
      code: 'SAVE10',
      description: 'Save 10% on orders over $50',
      discountType: 'percent',
      discountValue: 10,
      minAmount: 50,
      active: true,
    },
    {
      code: 'FREESHIP',
      description: 'Flat $15 discount for your next order',
      discountType: 'fixed',
      discountValue: 15,
      minAmount: 75,
      active: true,
    },
  ]);

  res.json({ message: 'Database seeded successfully' });
};

module.exports = { seedData };
