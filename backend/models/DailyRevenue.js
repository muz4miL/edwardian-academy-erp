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
    // Distinguishes revenue type for dashboard breakdown
    revenueType: {
      type: String,
      enum: ["TUITION_SHARE", "ACADEMY_SHARE", "WITHDRAWAL_ADJUSTMENT"],
      default: "TUITION_SHARE",
    },
    status: {
      type: String,
      enum: ["UNCOLLECTED", "COLLECTED"],
      default: "UNCOLLECTED",
    },
    collectedAt: { type: Date },
    // Audit trail: which class/student generated this revenue
    classRef: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    className: { type: String, trim: true },
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    studentName: { type: String, trim: true },
    feeRecordRef: { type: mongoose.Schema.Types.ObjectId, ref: "FeeRecord" },
    subject: { type: String, trim: true },
    transactionReference: { type: String, trim: true },
    description: { type: String, trim: true }, // Added for UI display
    // For tuition: how many owner/partners shared, what was total fee
    splitDetails: {
      totalFee: { type: Number },
      subjectFee: { type: Number },
      splitCount: { type: Number },
      perPersonShare: { type: Number },
      description: { type: String },
    },
  },
  { timestamps: true },
);

dailyRevenueSchema.index({ partner: 1, date: 1, status: 1 });

module.exports = mongoose.model("DailyRevenue", dailyRevenueSchema);
