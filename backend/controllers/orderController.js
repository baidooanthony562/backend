const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');
const User = require('../models/User');

const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, promoCode } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('Order items required');
  }

  // Validate items and recalculate ALL prices server-side — never trust client prices
  const validatedItems = [];
  for (const item of orderItems) {
    if (!item.product || !/^[a-f\d]{24}$/i.test(String(item.product))) {
      res.status(400);
      throw new Error('Invalid product ID in order');
    }
    const qty = Math.floor(Number(item.quantity));
    if (!qty || qty < 1) {
      res.status(400);
      throw new Error('Quantity must be at least 1');
    }

    const product = await Product.findById(item.product);
    if (!product || !product.active) {
      res.status(400);
      throw new Error(`Product not available: ${item.product}`);
    }
    if (product.stock < qty) {
      res.status(400);
      throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}`);
    }

    // Server-side price — wholesale if quantity qualifies, otherwise discounted retail
    const isWholesale =
      product.wholesalePrice > 0 &&
      product.wholesaleMinQty > 0 &&
      qty >= product.wholesaleMinQty;
    const serverPrice = isWholesale
      ? product.wholesalePrice
      : Number((product.price * (1 - (product.discount || 0) / 100)).toFixed(2));

    validatedItems.push({
      product: product._id,
      name: product.name,
      quantity: qty,
      price: serverPrice,
      image: product.images?.[0] || item.image || '',
    });
  }

  // Server-side subtotal
  const serverSubtotal = Number(
    validatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)
  );

  // Re-validate promo code server-side if provided
  let serverDiscount = 0;
  let validPromoCode = '';
  if (promoCode) {
    const promo = await PromoCode.findOne({ code: String(promoCode).toUpperCase(), active: true });
    if (
      promo &&
      (!promo.expiresAt || promo.expiresAt > Date.now()) &&
      (!promo.minAmount || serverSubtotal >= promo.minAmount)
    ) {
      validPromoCode = promo.code;
      serverDiscount =
        promo.discountType === 'fixed'
          ? promo.discountValue
          : Number((serverSubtotal * (promo.discountValue / 100)).toFixed(2));
    }
  }

  const serverTotal = Math.max(0, Number((serverSubtotal - serverDiscount).toFixed(2)));

  const order = new Order({
    user: req.user._id,
    orderItems: validatedItems,
    shippingAddress,
    paymentMethod,
    subtotalPrice: serverSubtotal,
    discountPrice: serverDiscount,
    promoCode: validPromoCode,
    totalPrice: serverTotal,
  });

  const created = await order.save();

  // Decrement stock atomically after order saved
  await Promise.all(
    validatedItems.map((item) =>
      Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
    )
  );

  // Record order on user profile
  await User.findByIdAndUpdate(req.user._id, { $push: { orders: created._id } });

  res.status(201).json(created);
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('orderItems.product', 'name price images')
    .populate('user', 'name email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Admins can see any order; users can only see their own
  if (req.user.isAdmin) {
    return res.json(order);
  }
  if (!req.user._id || order.user._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Access denied');
  }
  res.json(order);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('orderItems.product', 'name price images')
    .sort({ createdAt: -1 });
  res.json(orders);
});

const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(500);
  res.json(orders);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.status = req.body.status || order.status;
    order.isDelivered = order.status === 'Delivered';
    if (order.isDelivered) order.deliveredAt = Date.now();
    const updated = await order.save();
    res.json(updated);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

module.exports = { createOrder, getOrderById, getMyOrders, getOrders, updateOrderStatus };
