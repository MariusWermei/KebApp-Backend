const express = require("express");
const router = express.Router();
const Order = require("../models/commande");
const verifyToken = require("../modules/checkToken");

// ————————————————————————————————————————
// GET /commandes
// Récupérer toutes les commandes de l'utilisateur connecté
//   - isFinalized: false → « Commandes en cours »
//   - isFinalized: true → « Commandes précédentes »
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
// Générer un numéro de commande unique
// Format: CMD + YYYYMMDD + 4 random digits
// ————————————————————————————————————————
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toLocaleDateString("en-CA").replace(/-/g, "");
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `CMD${dateStr}${random}`;
};

// ————————————————————————————————————————
// POST /commandes
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

    // Convertir les éléments au format modèle
    const orderItems = items.map((item) => ({
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    }));

    // Créer et enregistrer une commande avec le numéro de commande
    const order = await new Order({
      orderNumber: generateOrderNumber(),
      userId: req.user._id,
      restaurant,
      items: orderItems,
      totalPrice,
    }).save();

    console.log("✅ Order created:", order._id, "Number:", order.orderNumber);
    res.status(201).json({ result: true, order });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
});

// ————————————————————————————————————————
// PUT /commandes/:id
// Mise à jour du statut de la commande
// Si le statut est « LIVRÉ », la commande est automatiquement finalisée.
// ————————————————————————————————————————
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;

    const update = {
      "orderStatus.step": status,
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
