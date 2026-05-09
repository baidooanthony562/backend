const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, subtotalPrice, discountPrice, promoCode, totalPrice } = req.body;
  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('Order items required');
  }
  const order = new Order({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    subtotalPrice: subtotalPrice || 0,
    discountPrice: discountPrice || 0,
    promoCode: promoCode || '',
    totalPrice,
  });
  const created = await order.save();
  await Promise.all(
    orderItems.map(async (item) => {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock = Math.max(product.stock - item.quantity, 0);
        await product.save();
      }
    })
  );
  const userDoc = await User.findById(req.user._id);
  if (userDoc) {
    userDoc.orders = userDoc.orders || [];
    userDoc.orders.push(created._id);
    await userDoc.save();
  }
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

  if (req.user.isAdmin || order.user._id.toString() === req.user._id.toString()) {
    res.json(order);
  } else {
    res.status(403);
    throw new Error('Access denied');
  }
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).populate('orderItems.product', 'name price images');
  res.json(orders);
});

const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'name email');
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
