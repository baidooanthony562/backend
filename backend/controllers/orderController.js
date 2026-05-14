const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');
const User = require('../models/User');

const VALID_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const MAX_ORDER_ITEMS = 50;

const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, promoCode } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('Order items required');
  }
  if (orderItems.length > MAX_ORDER_ITEMS) {
    res.status(400);
    throw new Error(`Order cannot exceed ${MAX_ORDER_ITEMS} items`);
  }

  const validatedItems = [];
  // Track items whose stock was already decremented so we can roll back on failure
  const decremented = [];

  const rollback = async () => {
    if (decremented.length > 0) {
      await Promise.allSettled(
        decremented.map((d) => Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } }))
      );
    }
  };

  try {
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
        throw new Error('One or more products are no longer available');
      }

      // Atomic check-and-decrement — prevents overselling under concurrent load
      const reserved = await Product.findOneAndUpdate(
        { _id: product._id, active: true, stock: { $gte: qty } },
        { $inc: { stock: -qty } }
      );
      if (!reserved) {
        res.status(400);
        throw new Error(`"${product.name}" is out of stock or has insufficient quantity`);
      }
      decremented.push({ id: product._id, qty });

      // Server-side price — wholesale if quantity qualifies, otherwise discounted retail
      const isWholesale =
        product.wholesalePrice > 0 &&
        product.wholesaleMinQty > 0 &&
        qty >= product.wholesaleMinQty;
      // Use integer arithmetic to avoid floating-point accumulation errors
      const serverPrice = isWholesale
        ? product.wholesalePrice
        : Math.round(product.price * (1 - (product.discount || 0) / 100) * 100) / 100;

      validatedItems.push({
        product: product._id,
        name: product.name,
        quantity: qty,
        price: serverPrice,
        image: product.images?.[0] || item.image || '',
      });
    }

    // Server-side subtotal using integer arithmetic to avoid float drift
    const serverSubtotal =
      Math.round(validatedItems.reduce((sum, i) => sum + i.price * i.quantity * 100, 0)) / 100;

    // Re-validate promo code server-side
    let serverDiscount = 0;
    let validPromoCode = '';
    if (promoCode) {
      const promo = await PromoCode.findOne({
        code: String(promoCode).toUpperCase().trim(),
        active: true,
      });
      if (
        promo &&
        (!promo.expiresAt || promo.expiresAt > Date.now()) &&
        (!promo.minAmount || serverSubtotal >= promo.minAmount)
      ) {
        validPromoCode = promo.code;
        serverDiscount =
          promo.discountType === 'fixed'
            ? promo.discountValue
            : Math.round(serverSubtotal * (promo.discountValue / 100) * 100) / 100;
      }
    }

    const serverTotal = Math.max(0, Math.round((serverSubtotal - serverDiscount) * 100) / 100);

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

    // Record order on user profile
    await User.findByIdAndUpdate(req.user._id, { $push: { orders: created._id } });

    res.status(201).json(created);
  } catch (err) {
    // If an error occurred after some stock was decremented, restore it
    await rollback();
    throw err;
  }
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
  const { status } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.status = status || order.status;
  order.isDelivered = order.status === 'Delivered';
  if (order.isDelivered && !order.deliveredAt) order.deliveredAt = Date.now();
  const updated = await order.save();
  res.json(updated);
});

module.exports = { createOrder, getOrderById, getMyOrders, getOrders, updateOrderStatus };
