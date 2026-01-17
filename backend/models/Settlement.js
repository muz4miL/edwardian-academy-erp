/**
 * Settlement Model - Tracks partner debt repayments
 * Part of the Financial Sovereignty System
 *
 * Purpose: When Sir Waqar pays for an expense out-of-pocket,
 * partners owe him their share. This model tracks when they pay him back.
 */

const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema(
  {
    // The partner who is paying back their debt
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Partner ID is required"],
    },

    // The partner's name (denormalized for quick display)
    partnerName: {
      type: String,
      required: true,
      trim: true,
    },

    // Amount being repaid
    amount: {
      type: Number,
      required: [true, "Repayment amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },

    // Date of repayment
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },

    // Payment method
    method: {
      type: String,
      enum: ["CASH", "BANK_TRANSFER", "ADJUSTMENT"],
      default: "CASH",
    },

    // Who recorded this repayment (always Sir Waqar / OWNER)
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional: Link to the specific expense being settled
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
    },

    // Optional: Link to the specific share being settled
    shareIndex: {
      type: Number,
    },

    // Notes about this settlement
    notes: {
      type: String,
      trim: true,
    },

    // Status of the settlement
    status: {
      type: String,
      enum: ["COMPLETED", "PENDING", "CANCELLED"],
      default: "COMPLETED",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for faster queries
SettlementSchema.index({ partnerId: 1, date: -1 });
SettlementSchema.index({ recordedBy: 1, date: -1 });
SettlementSchema.index({ expenseId: 1 });
SettlementSchema.index({ status: 1 });

// Virtual for formatted date
SettlementSchema.virtual("formattedDate").get(function () {
  return this.date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

// Instance method to get summary
SettlementSchema.methods.getSummary = function () {
  return {
    id: this._id,
    partner: this.partnerName,
    amount: this.amount,
    date: this.date,
    method: this.method,
    status: this.status,
  };
};

module.exports = mongoose.model("Settlement", SettlementSchema);
