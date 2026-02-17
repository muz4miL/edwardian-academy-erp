const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "INCOME",
        "EXPENSE",
        "CREDIT",
        "LIABILITY",
        "PARTNER_WITHDRAWAL",
        "REFUND",
        "DEBT",
        "TRANSFER",
        "DIVIDEND",
        "POOL_DISTRIBUTION",
      ],
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
        "Teacher Payout",
        "Teacher Salary",
        "Teacher Advance",
        "Teacher Share",
        "Academy Share",
        "Unallocated Pool",
        "Electricity Bill",
        "Generator Fuel",
        "Staff Tea & Refreshments",
        "Marketing / Ads",
        "Stationery",
        "Equipment/Asset",
        "Misc",
        "Miscellaneous",
        "Refund",
        "Dividend",
        "ExpenseShare",
        "Teacher_Payout",
        "Pool_Dividend",
        "Expense_Share",
        "Daily_Close",
        "Payroll_Credit",
        "Trip_Fee",
        "Test_Fee",
        "Lab_Fee",
        "Library_Fee",
        "Sports_Fee",
        "Event_Fee",
        "Student_Misc",
      ],
      required: [true, "Category is required"],
    },
    // SRS 3.0: Financial Stream (Which revenue pool does this belong to?)
    stream: {
      type: String,
      enum: [
        "ACADEMY_POOL", // 30% from staff tuition → Waqar's Academy
        "OWNER_CHEMISTRY", // Waqar's Chemistry income (100% verified)
        "PARTNER_CHEMISTRY", // Legacy: Saud's Chemistry income
        "PARTNER_PHYSICS", // Saud's Physics income (100% floating)
        "PARTNER_BIO", // Zahid's Biology/Zoology income (100% floating)
        "PARTNER_ETEA", // ETEA prep courses
        "STAFF_TUITION", // Staff-taught subjects (70/30 split)
        "TEACHER_LEDGER", // ETEA teacher bonus entries
        "UNALLOCATED_POOL", // 30% from staff tuition awaiting distribution
        "JOINT_POOL", // Shared expenses pool
        "DIVIDEND", // Partner dividend from pool distribution (legacy)
        // Waqar's Protocol: Additional streams
        "TUITION_POOL", // Regular tuition pool (50/30/20 split)
        "ETEA_POOL", // ETEA pool (40/30/30 split)
        "ETEA_ENGLISH_POOL", // English teacher fixed salary remainder
        "OWNER_DIVIDEND", // Waqar's pool dividend
        "PARTNER_DIVIDEND", // Partner (Zahid/Saud) pool dividend
        "PARTNER_EXPENSE_DEBT", // Partner owes for expense share
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
    // SRS 3.0: Split Details (for 70/30 staff logic + pool dividends)
    splitDetails: {
      teacherShare: { type: Number, default: 0 }, // Amount (e.g., 7000)
      academyShare: { type: Number, default: 0 }, // Amount (e.g., 3000)
      teacherPercentage: { type: Number, default: 0 }, // Percentage (e.g., 70)
      academyPercentage: { type: Number, default: 0 }, // Percentage (e.g., 30)
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
      teacherName: { type: String },
      isPaid: { type: Boolean, default: false }, // Has teacher been paid?
      // Pool dividend tracking (Waqar's Protocol)
      partnerName: { type: String }, // "Waqar", "Zahid", "Saud"
      percentage: { type: Number }, // Partner's percentage (e.g., 50)
      poolType: { type: String, enum: ["TUITION", "ETEA"] }, // Which protocol
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
    // For pool distribution tracking (UNALLOCATED_POOL → DIVIDEND)
    isDistributed: {
      type: Boolean,
      default: false,
    },
    // Reference to distribution transaction (for tracking lineage)
    distributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    // For dividend transactions: which partner received this
    recipientPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    recipientPartnerName: {
      type: String,
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
