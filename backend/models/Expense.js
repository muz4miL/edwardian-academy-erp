const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Expense title is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Generator Fuel",
        "Electricity Bill",
        "Staff Tea & Refreshments",
        "Marketing / Ads",
        "Stationery",
        "Rent",
        "Salaries",
        "Utilities",
        "Equipment/Asset",
        "Misc",
      ],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    // Payment Status Tracking (NEW!)
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },

    // Date Tracking (ENHANCED!)
    expenseDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    paidDate: {
      type: Date,
      default: null,
    },

    // Vendor Information (NEW!)
    vendorName: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },

    // Optional fields
    description: {
      type: String,
      trim: true,
    },
    billNumber: {
      type: String,
      trim: true,
    },

    // Partner Expense Split Logic (Module 3)
    // WHO actually paid for this expense
    paidByType: {
      type: String,
      enum: ["ACADEMY_CASH", "WAQAR", "ZAHID", "SAUD", "JOINT_POOL"],
      default: "ACADEMY_CASH",
    },
    // Reference to user who paid (if partner paid out-of-pocket)
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // The split ratio AT THE TIME of expense (locked for historical accuracy)
    splitRatio: {
      waqar: { type: Number, default: 40 }, // 40%
      zahid: { type: Number, default: 30 }, // 30%
      saud: { type: Number, default: 30 }, // 30%
    },
    // Individual partner shares with settlement tracking
    shares: [
      {
        partner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        partnerName: { type: String },
        partnerKey: { type: String, enum: ["waqar", "zahid", "saud"] }, // For quick lookups
        percentage: { type: Number }, // The percentage used (e.g., 30)
        amount: { type: Number, required: true }, // Calculated debt (e.g., 30,000)
        status: {
          type: String,
          enum: ["UNPAID", "PAID", "N/A"],
          default: "UNPAID",
        },
        // NEW: Repayment workflow status (Partner marks paid → Owner confirms)
        repaymentStatus: {
          type: String,
          enum: ["PENDING", "PROCESSING", "PAID"],
          default: "PENDING",
        },
        // Timestamp when partner marked as "PROCESSING"
        markedPaidAt: { type: Date },
        // Timestamp when owner confirmed receipt
        confirmedAt: { type: Date },
        paidAt: { type: Date },
        settlementId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Settlement",
        },
      },
    ],
    // Flag for quick filtering
    hasPartnerDebt: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// Virtual to check if expense is overdue
ExpenseSchema.virtual("isOverdue").get(function () {
  if (this.status === "paid") return false;
  if (!this.dueDate) return false;
  return new Date() > this.dueDate;
});

// Pre-save hook to auto-update status to overdue
ExpenseSchema.pre("save", function () {
  if (this.status === "pending" && this.dueDate && new Date() > this.dueDate) {
    this.status = "overdue";
  }
});

// Indexes for faster queries
ExpenseSchema.index({ expenseDate: -1 });
ExpenseSchema.index({ dueDate: 1 });
ExpenseSchema.index({ status: 1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ paidByType: 1 }); // For finding partner-paid expenses
ExpenseSchema.index({ hasPartnerDebt: 1 }); // For settlement queries
ExpenseSchema.index({ "shares.partner": 1, "shares.status": 1 }); // For partner-specific debts

module.exports = mongoose.model("Expense", ExpenseSchema);
