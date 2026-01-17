const mongoose = require("mongoose");

const PayoutRequestSchema = new mongoose.Schema(
  {
    // Request ID (Auto-generated)
    requestId: {
      type: String,
      required: true,
      unique: true,
    },

    // Teacher Reference
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    teacherName: {
      type: String,
      required: true,
      trim: true,
    },

    // Request Details
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be at least PKR 1"],
    },

    // Request Status
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    // Request Date
    requestDate: {
      type: Date,
      default: Date.now,
    },

    // Approval Details
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    approvalNotes: {
      type: String,
      trim: true,
    },

    // Rejection Details
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    // Transaction Reference (created on approval)
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save hook to auto-generate requestId
PayoutRequestSchema.pre("save", async function (next) {
  if (this.isNew && !this.requestId) {
    const count = await mongoose.model("PayoutRequest").countDocuments();
    this.requestId = `PR-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

// Indexes for faster queries
PayoutRequestSchema.index({ status: 1 });
PayoutRequestSchema.index({ teacherId: 1 });
PayoutRequestSchema.index({ requestDate: -1 });

module.exports = mongoose.model("PayoutRequest", PayoutRequestSchema);
