const mongoose = require("mongoose");

// Schema for an item in the order
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
});

// Main order schema
const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    restaurant: {
      name: { type: String, required: true },
      logoUrl: { type: String, default: null },
    },
    items: [itemSchema],
    totalPrice: { type: Number, required: true },
    orderStatus: {
      // false = order in progress | true = order finalized (delivered)
      isFinalized: { type: Boolean, default: false },
      step: {
        type: String,
        enum: ["ACCEPTED", "PREPARING", "READY", "DELIVERED"],
        default: "PREPARING",
      },
    },
    estimatedArrivalTime: { type: Date, default: null },
  },
  { timestamps: { createdAt: "orderDate" } },
);

module.exports = mongoose.model("Order", orderSchema);
