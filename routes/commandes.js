const express = require("express");
const router = express.Router();
const Order = require("../models/commande");
const User = require("../models/user");

// ————————————————————————————————————————
// Authentication Middleware
// Verify token in header and attach user to request
// ————————————————————————————————————————
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ result: false, message: "Token missing" });

  const user = await User.findOne({ token });
  if (!user)
    return res.status(401).json({ result: false, message: "Invalid token" });

  req.user = user;
  next();
};

// ————————————————————————————————————————
// GET /commandes
// Retrieve all orders for connected user
// Frontend handles separation:
//   - isFinalized: false → "Ongoing orders"
//   - isFinalized: true  → "Previous orders"
// ————————————————————————————————————————
router.get("/", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user._id,
    }).sort({ orderDate: -1 });
    res.json({ result: true, orders });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});

// ————————————————————————————————————————
// POST /commandes
// Create a new order
// ————————————————————————————————————————
router.post("/", verifyToken, async (req, res) => {
  try {
    const { restaurant, items, totalPrice } = req.body;

    // Simple validation
    if (!restaurant || !restaurant.name) {
      return res.status(400).json({
        result: false,
        message: "Restaurant name required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        result: false,
        message: "At least one item required",
      });
    }

    // Convert items to model format
    const orderItems = items.map((item) => ({
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    }));

    // Create and save order
    const order = await new Order({
      userId: req.user._id,
      restaurant,
      items: orderItems,
      totalPrice,
    }).save();

    console.log("✅ Order created:", order._id);
    res.status(201).json({ result: true, order });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
});

// ————————————————————————————————————————
// PUT /commandes/:id
// Update order status
// If status is "DELIVERED", order is automatically finalized
// ————————————————————————————————————————
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;

    const update = {
      "orderStatus.status": status,
      "orderStatus.isFinalized": status === "DELIVERED",
    };

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: update },
      { new: true },
    );

    if (!updatedOrder)
      return res
        .status(404)
        .json({ result: false, message: "Order not found" });

    res.json({ result: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = router;
