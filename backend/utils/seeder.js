const Category = require('../models/Category');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');

const categories = [
  { name: 'Blenders & Juicers', slug: 'blenders-juicers', description: 'High-performance blenders and juicers for smoothies, sauces, and soups.', icon: '🧃' },
  { name: 'Rice Cookers', slug: 'rice-cookers', description: 'Smart rice cookers for perfect texture every time.', icon: '🍚' },
  { name: 'Pots & Pans', slug: 'pots-pans', description: 'Premium nonstick cookware sets for every kitchen.', icon: '🍳' },
  { name: 'Water Dispensers', slug: 'water-dispensers', description: 'Hot and cold water dispensers for home and office.', icon: '🚰' },
  { name: 'Irons & Steamers', slug: 'irons-steamers', description: 'Professional steam irons and garment steamers.', icon: '👔' },
  { name: 'Toasters & Grills', slug: 'toasters-grills', description: 'Electric toasters, sandwich makers, and grill pans.', icon: '🍞' },
  { name: 'Fans & Coolers', slug: 'fans-coolers', description: 'Standing fans, table fans, and air coolers.', icon: '💨' },
  { name: 'Food Processors', slug: 'food-processors', description: 'Multi-function food processors and choppers.', icon: '⚙️' },
];

const products = [
  // Blenders & Juicers
  {
    name: 'Binatone 4-in-1 Blender Set',
    description: 'Powerful 4-in-1 blender with multiple speed settings, easy-clean design, and stainless steel blades.',
    price: 320, wholesalePrice: 260, wholesaleMinQty: 5,
    stock: 15, discount: 10, rating: 4.8, featured: true, bestseller: true,
    categorySlug: 'blenders-juicers',
    images: ['https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80'],
  },
  {
    name: 'Kenwood Juice Extractor 800W',
    description: 'High-speed juicer with wide feed chute, pulp collector and easy assembly for fresh juice every morning.',
    price: 280, wholesalePrice: 220, wholesaleMinQty: 4,
    stock: 10, discount: 5, rating: 4.6, featured: true, bestseller: false,
    categorySlug: 'blenders-juicers',
    images: ['https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?auto=format&fit=crop&w=800&q=80'],
  },
  // Rice Cookers
  {
    name: 'Midea Digital Rice Cooker 1.8L',
    description: 'Automatic digital rice cooker with keep-warm feature, non-stick inner pot, and 8-hour delay timer.',
    price: 210, wholesalePrice: 170, wholesaleMinQty: 5,
    stock: 20, discount: 8, rating: 4.7, featured: true, bestseller: true,
    categorySlug: 'rice-cookers',
    images: ['https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80'],
  },
  {
    name: 'Philips Rice Cooker 2.5L Fuzzy Logic',
    description: 'Fuzzy logic technology ensures perfectly cooked rice every time with a 10-cup capacity.',
    price: 390, wholesalePrice: 320, wholesaleMinQty: 3,
    stock: 8, discount: 0, rating: 4.9, featured: false, bestseller: true,
    categorySlug: 'rice-cookers',
    images: ['https://images.unsplash.com/photo-1593359677879-a4bb92f4834f?auto=format&fit=crop&w=800&q=80'],
  },
  // Pots & Pans
  {
    name: 'Ceramic Nonstick 5-Piece Cookware Set',
    description: 'Premium ceramic nonstick coating, compatible with all stovetops including induction. Includes 3 pots and 2 frying pans.',
    price: 450, wholesalePrice: 370, wholesaleMinQty: 3,
    stock: 12, discount: 12, rating: 4.7, featured: true, bestseller: false,
    categorySlug: 'pots-pans',
    images: ['https://images.unsplash.com/photo-1585837575652-267f7b83f3a3?auto=format&fit=crop&w=800&q=80'],
  },
  {
    name: 'Hard-Anodised Frying Pan 28cm',
    description: 'Commercial-grade hard-anodised frying pan with ergonomic handle and even heat distribution.',
    price: 150, wholesalePrice: 118, wholesaleMinQty: 6,
    stock: 30, discount: 0, rating: 4.5, featured: false, bestseller: false,
    categorySlug: 'pots-pans',
    images: ['https://images.unsplash.com/photo-1618385418049-3cb8e8c2e2d2?auto=format&fit=crop&w=800&q=80'],
  },
  // Water Dispensers
  {
    name: 'Midea Top-Load Water Dispenser',
    description: 'Hot, warm and cold water dispenser with child-safety lock, energy-saving mode, and stainless steel tank.',
    price: 580, wholesalePrice: 480, wholesaleMinQty: 2,
    stock: 7, discount: 5, rating: 4.6, featured: true, bestseller: true,
    categorySlug: 'water-dispensers',
    images: ['https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80'],
  },
  {
    name: 'Ramtons Countertop Water Dispenser',
    description: 'Compact countertop dispenser for small offices and homes. Provides instant hot and cold water.',
    price: 320, wholesalePrice: 260, wholesaleMinQty: 3,
    stock: 11, discount: 0, rating: 4.4, featured: false, bestseller: false,
    categorySlug: 'water-dispensers',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80'],
  },
  // Irons & Steamers
  {
    name: 'Philips GC4886 Steam Iron 2800W',
    description: 'High-pressure steam iron with SteamGlide Elite soleplate, vertical steam, and anti-calc system.',
    price: 340, wholesalePrice: 275, wholesaleMinQty: 4,
    stock: 14, discount: 0, rating: 4.8, featured: true, bestseller: true,
    categorySlug: 'irons-steamers',
    images: ['https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80'],
  },
  {
    name: 'Handheld Garment Steamer 1500W',
    description: 'Quick-heat portable steamer removes wrinkles in seconds. Works on all fabrics including delicate materials.',
    price: 180, wholesalePrice: 140, wholesaleMinQty: 5,
    stock: 18, discount: 10, rating: 4.5, featured: false, bestseller: false,
    categorySlug: 'irons-steamers',
    images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'],
  },
  // Toasters & Grills
  {
    name: 'Breville 4-Slice Toaster',
    description: 'Extra-wide slots for all bread types, 6 browning settings, and high-lift lever for smaller slices.',
    price: 220, wholesalePrice: 175, wholesaleMinQty: 4,
    stock: 16, discount: 8, rating: 4.7, featured: false, bestseller: true,
    categorySlug: 'toasters-grills',
    images: ['https://images.unsplash.com/photo-1607477745023-ccecb0af7a48?auto=format&fit=crop&w=800&q=80'],
  },
  {
    name: 'Electric Contact Grill & Sandwich Maker',
    description: 'Non-stick dual contact grill for sandwiches, paninis, and grilled meat. Removable plates for easy cleaning.',
    price: 185, wholesalePrice: 145, wholesaleMinQty: 5,
    stock: 22, discount: 0, rating: 4.6, featured: true, bestseller: false,
    categorySlug: 'toasters-grills',
    images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'],
  },
  // Fans & Coolers
  {
    name: 'Binatone 18" Standing Fan',
    description: '3-speed settings, oscillating head, quiet motor and adjustable height. Perfect for bedrooms and living rooms.',
    price: 260, wholesalePrice: 210, wholesaleMinQty: 5,
    stock: 25, discount: 5, rating: 4.6, featured: true, bestseller: true,
    categorySlug: 'fans-coolers',
    images: ['https://images.unsplash.com/photo-1563207153-f403bf289096?auto=format&fit=crop&w=800&q=80'],
  },
  {
    name: 'Evaporative Air Cooler 40L',
    description: 'Portable air cooler with 3 wind speeds, 8-hour timer, remote control, and large 40L water tank.',
    price: 620, wholesalePrice: 510, wholesaleMinQty: 2,
    stock: 6, discount: 0, rating: 4.7, featured: false, bestseller: false,
    categorySlug: 'fans-coolers',
    images: ['https://images.unsplash.com/photo-1508873535684-277a3cbcc4e8?auto=format&fit=crop&w=800&q=80'],
  },
  // Food Processors
  {
    name: 'Kenwood 800W Food Processor',
    description: 'Multi-function food processor with chopping, slicing, grating and kneading attachments. 2.1L bowl capacity.',
    price: 480, wholesalePrice: 390, wholesaleMinQty: 3,
    stock: 9, discount: 10, rating: 4.8, featured: true, bestseller: true,
    categorySlug: 'food-processors',
    images: ['https://images.unsplash.com/photo-1606914501449-5a96b6196615?auto=format&fit=crop&w=800&q=80'],
  },
  {
    name: 'Mini Electric Chopper 500W',
    description: 'Compact electric chopper ideal for onions, garlic, herbs and nuts. Easy one-button operation.',
    price: 130, wholesalePrice: 100, wholesaleMinQty: 6,
    stock: 28, discount: 0, rating: 4.5, featured: false, bestseller: false,
    categorySlug: 'food-processors',
    images: ['https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80'],
  },
];

const seedData = async (req, res) => {
  await Category.deleteMany();
  await Product.deleteMany();

  const createdCategories = await Category.insertMany(categories);

  const createdProducts = products.map((product) => {
    const { categorySlug, ...rest } = product;
    const category = createdCategories.find((cat) => cat.slug === categorySlug);
    return { ...rest, category: category?._id };
  });

  await Product.insertMany(createdProducts);

  await PromoCode.deleteMany();
  await PromoCode.insertMany([
    {
      code: 'SAVE10',
      description: 'Save 10% on orders over ₵100',
      discountType: 'percent',
      discountValue: 10,
      minAmount: 100,
      active: true,
    },
    {
      code: 'WELCOME20',
      description: 'New customer 20% discount',
      discountType: 'percent',
      discountValue: 20,
      minAmount: 50,
      active: true,
    },
    {
      code: 'FLAT50',
      description: 'Flat ₵50 off orders over ₵300',
      discountType: 'fixed',
      discountValue: 50,
      minAmount: 300,
      active: true,
    },
  ]);

  res.json({ message: 'Database seeded successfully', categories: createdCategories.length, products: createdProducts.length });
};

module.exports = { seedData };
