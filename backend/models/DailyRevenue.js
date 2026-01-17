const mongoose = require("mongoose");

const dailyRevenueSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: ["TUITION", "ADMISSION"],
      default: "TUITION",
    },
    status: {
      type: String,
      enum: ["UNCOLLECTED", "COLLECTED"],
      default: "UNCOLLECTED",
    },
    collectedAt: { type: Date },
  },
  { timestamps: true },
);

dailyRevenueSchema.index({ partner: 1, date: 1, status: 1 });

module.exports = mongoose.model("DailyRevenue", dailyRevenueSchema);
