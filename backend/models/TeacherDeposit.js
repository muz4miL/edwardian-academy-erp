/**
 * TeacherDeposit Model - Tracks arbitrary deposits to teachers
 * 
 * Purpose: Allow Waqar (Owner) to deposit money to teachers for:
 * - Advance salary payments
 * - Bonuses/rewards
 * - Expense reimbursements
 * - Any other reason
 * 
 * This is SEPARATE from the automated fee distribution system.
 * These are manual, one-time payments.
 */

const mongoose = require("mongoose");

const teacherDepositSchema = new mongoose.Schema(
  {
    // The teacher receiving the deposit
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher ID is required"],
      index: true,
    },
    teacherName: {
      type: String,
      required: true,
      trim: true,
    },

    // Amount deposited
    amount: {
      type: Number,
      required: [true, "Deposit amount is required"],
      min: [1, "Deposit amount must be at least 1"],
    },

    // Type/category of deposit
    depositType: {
      type: String,
      enum: ["ADVANCE", "BONUS", "REIMBURSEMENT", "ADJUSTMENT", "OTHER"],
      default: "OTHER",
    },

    // Reason/note for the deposit
    reason: {
      type: String,
      required: [true, "Reason for deposit is required"],
      trim: true,
      maxlength: 500,
    },

    // Who made the deposit (should be OWNER)
    depositedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    depositedByName: {
      type: String,
      required: true,
      trim: true,
    },

    // Payment method
    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK_TRANSFER", "ADJUSTMENT"],
      default: "CASH",
    },

    // Status
    status: {
      type: String,
      enum: ["COMPLETED", "PENDING", "REVERSED"],
      default: "COMPLETED",
    },

    // If reversed (e.g., mistake)
    reversedAt: Date,
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reversalReason: String,

    // Whether this was deducted from next payout
    deductedFromPayout: {
      type: Boolean,
      default: false,
    },
    deductedPayoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayoutRequest",
    },

    // Reference to Transaction record (if created)
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
teacherDepositSchema.index({ teacherId: 1, createdAt: -1 });
teacherDepositSchema.index({ depositedBy: 1, createdAt: -1 });
teacherDepositSchema.index({ status: 1 });
teacherDepositSchema.index({ depositType: 1 });

// Virtual for formatted date
teacherDepositSchema.virtual("formattedDate").get(function () {
  return this.createdAt?.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

// Static: Get deposits for a teacher
teacherDepositSchema.statics.getDepositsForTeacher = async function (teacherId, options = {}) {
  const query = { teacherId, status: { $ne: "REVERSED" } };
  
  if (options.startDate && options.endDate) {
    query.createdAt = { $gte: options.startDate, $lte: options.endDate };
  }
  
  return this.find(query).sort({ createdAt: -1 }).limit(options.limit || 100);
};

// Static: Get total deposits for a teacher
teacherDepositSchema.statics.getTotalDeposited = async function (teacherId) {
  const result = await this.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId), status: "COMPLETED" } },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  return result[0] || { total: 0, count: 0 };
};

// Static: Get all deposits summary by type
teacherDepositSchema.statics.getSummaryByType = async function (startDate, endDate) {
  const match = { status: "COMPLETED" };
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$depositType",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);
};

// Instance method: Reverse deposit
teacherDepositSchema.methods.reverse = async function (reversedBy, reason = "") {
  if (this.status !== "COMPLETED") {
    throw new Error(`Cannot reverse deposit with status: ${this.status}`);
  }

  this.status = "REVERSED";
  this.reversedAt = new Date();
  this.reversedBy = reversedBy._id || reversedBy;
  this.reversalReason = reason;

  await this.save();
  return this;
};

// Ensure virtuals in JSON
teacherDepositSchema.set("toJSON", { virtuals: true });
teacherDepositSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("TeacherDeposit", teacherDepositSchema);
