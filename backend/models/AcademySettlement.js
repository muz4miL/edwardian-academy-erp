/**
 * AcademySettlement Model - Tracks deferred academy share for partners
 * 
 * Purpose: When teachers (non-partners) teach, 30% goes to academy pool.
 * This 30% is split among Owner/Partners per config, but partners DON'T
 * receive it until Waqar (Owner) manually releases it.
 * 
 * This model tracks:
 * - Pending academy share for each partner
 * - When it was released
 * - Detailed calculation breakdown
 */

const mongoose = require("mongoose");

const academySettlementSchema = new mongoose.Schema(
  {
    // The partner who will receive this settlement
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Partner ID is required"],
      index: true,
    },
    partnerName: {
      type: String,
      required: true,
      trim: true,
    },
    partnerRole: {
      type: String,
      enum: ["OWNER", "PARTNER"],
      required: true,
    },

    // Configured percentage for this partner
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Amount to be paid
    amount: {
      type: Number,
      required: [true, "Settlement amount is required"],
      min: 0,
    },

    // Status of the settlement
    status: {
      type: String,
      enum: ["PENDING", "RELEASED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },

    // When was this created (fee collection date)
    sourceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Source details - which fee/student/class generated this
    sourceDetails: {
      feeRecordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FeeRecord",
      },
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
      studentName: String,
      classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
      className: String,
      subject: String,
      teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
      teacherName: String,
      // The total academy share that was split (before percentage)
      totalAcademyShare: Number,
      // Calculation proof for audit
      calculationProof: String,
    },

    // Session/batch this belongs to (for batch release)
    sessionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    sessionName: String,

    // Release information (when status = RELEASED)
    releasedAt: Date,
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    releasedByName: String,
    releaseNotes: String,

    // If cancelled (e.g., student withdrawal reversal)
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: String,

    // Link to DailyRevenue entry created on release
    dailyRevenueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyRevenue",
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
academySettlementSchema.index({ partnerId: 1, status: 1 });
academySettlementSchema.index({ status: 1, sourceDate: -1 });
academySettlementSchema.index({ "sourceDetails.feeRecordId": 1 });
academySettlementSchema.index({ sessionRef: 1, status: 1 });

// Virtual for formatted date
academySettlementSchema.virtual("formattedSourceDate").get(function () {
  return this.sourceDate?.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

// Virtual for formatted release date
academySettlementSchema.virtual("formattedReleaseDate").get(function () {
  return this.releasedAt?.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

// Static: Get pending settlements for a partner
academySettlementSchema.statics.getPendingForPartner = async function (partnerId) {
  return this.find({ partnerId, status: "PENDING" }).sort({ sourceDate: -1 });
};

// Static: Get total pending amount for a partner
academySettlementSchema.statics.getPendingTotal = async function (partnerId) {
  const result = await this.aggregate([
    { $match: { partnerId: new mongoose.Types.ObjectId(partnerId), status: "PENDING" } },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  return result[0] || { total: 0, count: 0 };
};

// Static: Get pending settlements summary for all partners
academySettlementSchema.statics.getAllPendingSummary = async function () {
  return this.aggregate([
    { $match: { status: "PENDING" } },
    {
      $group: {
        _id: "$partnerId",
        partnerName: { $first: "$partnerName" },
        partnerRole: { $first: "$partnerRole" },
        percentage: { $first: "$percentage" },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
        oldestDate: { $min: "$sourceDate" },
        newestDate: { $max: "$sourceDate" },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};

// Instance method: Release this settlement
academySettlementSchema.methods.release = async function (releasedBy, notes = "") {
  if (this.status !== "PENDING") {
    throw new Error(`Cannot release settlement with status: ${this.status}`);
  }

  this.status = "RELEASED";
  this.releasedAt = new Date();
  this.releasedBy = releasedBy._id || releasedBy;
  this.releasedByName = releasedBy.fullName || "System";
  this.releaseNotes = notes;

  await this.save();
  return this;
};

// Instance method: Cancel this settlement
academySettlementSchema.methods.cancel = async function (cancelledBy, reason = "") {
  if (this.status !== "PENDING") {
    throw new Error(`Cannot cancel settlement with status: ${this.status}`);
  }

  this.status = "CANCELLED";
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy._id || cancelledBy;
  this.cancellationReason = reason;

  await this.save();
  return this;
};

// Ensure virtuals in JSON
academySettlementSchema.set("toJSON", { virtuals: true });
academySettlementSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("AcademySettlement", academySettlementSchema);
