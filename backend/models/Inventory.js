const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    investorName: {
      type: String,
      default: "Academy",
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: [true, "Purchase date is required"],
    },
    originalCost: {
      type: Number,
      required: [true, "Original cost is required"],
      min: 0,
    },
    depreciationRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
