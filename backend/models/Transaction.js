const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["INCOME", "EXPENSE", "PARTNER_WITHDRAWAL"],
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
      ],
      required: [true, "Category is required"],
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
      enum: ["FLOATING", "VERIFIED", "CANCELLED"],
      default: "FLOATING",
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
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
