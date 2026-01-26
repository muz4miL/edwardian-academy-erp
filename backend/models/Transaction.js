const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["INCOME", "EXPENSE", "PARTNER_WITHDRAWAL", "REFUND"],
      required: [true, "Transaction type is required"],
    },
    category: {
      type: String,
      enum: [
        "Chemistry",
        "Tuition",
        "Pool",
        "Rent",
        "Utilities",
        "Salaries",
        "Miscellaneous",
        "Refund",
      ],
      required: [true, "Category is required"],
    },
    // SRS 3.0: Financial Stream (Which revenue pool does this belong to?)
    stream: {
      type: String,
      enum: [
        "ACADEMY_POOL", // 30% from staff tuition → Waqar's Academy
        "PARTNER_CHEMISTRY", // Saud's Chemistry income
        "PARTNER_PHYSICS", // Zahid's Physics income
        "PARTNER_ETEA", // ETEA prep courses
        "STAFF_TUITION", // Staff-taught subjects (70/30 split)
        "JOINT_POOL", // Shared expenses pool
      ],
      default: "ACADEMY_POOL",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    description: {
      type: String,
      maxlength: 500,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["FLOATING", "VERIFIED", "CANCELLED", "REFUNDED"],
      default: "FLOATING",
    },
    // SRS 3.0: Split Details (for 70/30 staff logic)
    splitDetails: {
      teacherShare: { type: Number, default: 0 }, // Amount (e.g., 7000)
      academyShare: { type: Number, default: 0 }, // Amount (e.g., 3000)
      teacherPercentage: { type: Number, default: 0 }, // Percentage (e.g., 70)
      academyPercentage: { type: Number, default: 0 }, // Percentage (e.g., 30)
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
      teacherName: { type: String },
      isPaid: { type: Boolean, default: false }, // Has teacher been paid?
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    // For refund tracking
    originalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    // Tracking if this transaction was part of a daily closing
    closingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyClosing",
    },
  },
  {
    timestamps: true,
  },
);

// INDEXES: For faster queries
transactionSchema.index({ collectedBy: 1, status: 1 });
transactionSchema.index({ type: 1, category: 1 });
transactionSchema.index({ date: -1 });

// INSTANCE METHOD: Get transaction summary
transactionSchema.methods.getSummary = function () {
  return {
    id: this._id,
    type: this.type,
    category: this.category,
    amount: this.amount,
    status: this.status,
    date: this.date,
  };
};

module.exports = mongoose.model("Transaction", transactionSchema);
