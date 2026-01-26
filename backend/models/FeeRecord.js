const mongoose = require("mongoose");

/**
 * FeeRecord Model
 * Tracks every fee payment made by a student.
 * Enables the auto-split between Teacher (70%) and Academy (30%).
 */
const feeRecordSchema = new mongoose.Schema(
  {
    // Reference to the student who paid
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
    },
    // Student name (denormalized for quick access)
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    // Reference to the class
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    // Class name (denormalized)
    className: {
      type: String,
      required: true,
      trim: true,
    },
    // Subject for which fee is paid (optional, for per-subject tracking)
    subject: {
      type: String,
      trim: true,
    },
    // Amount paid
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be at least 1"],
    },
    // Discount applied (scholarship/special pricing)
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Month for which the fee is paid (e.g., "January 2026")
    month: {
      type: String,
      required: [true, "Month is required"],
      trim: true,
    },
    // Payment status
    status: {
      type: String,
      enum: ["PAID", "PENDING", "REFUNDED"],
      default: "PAID",
    },
    // Who collected the fee
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    collectedByName: {
      type: String,
      trim: true,
    },
    // Teacher who gets the share (if applicable)
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    teacherName: {
      type: String,
      trim: true,
    },
    // Flag: Is this teacher a Partner/Owner? (gets 100% instead of split)
    isPartnerTeacher: {
      type: Boolean,
      default: false,
    },
    // Split breakdown
    splitBreakdown: {
      teacherShare: { type: Number, default: 0 },
      academyShare: { type: Number, default: 0 },
      teacherPercentage: { type: Number, default: 70 },
      academyPercentage: { type: Number, default: 30 },
    },
    // Payment method
    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK", "ONLINE"],
      default: "CASH",
    },
    // Optional receipt number
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Notes
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Refund tracking (SRS 3.0 Module 5)
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundDate: {
      type: Date,
    },
    refundReason: {
      type: String,
      trim: true,
    },
    // Source of revenue rule (for audit)
    revenueSource: {
      type: String,
      enum: [
        "class-partner-mode",
        "partner-100-rule",
        "partner-standard-split",
        "standard-split",
        "configuration",
      ],
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save hook to generate receipt number
feeRecordSchema.pre("save", async function () {
  if (this.isNew && !this.receiptNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.receiptNumber = `FEE-${year}${month}-${random}`;
  }
});

// Indexes for faster queries
feeRecordSchema.index({ student: 1, month: 1 });
feeRecordSchema.index({ teacher: 1 });
feeRecordSchema.index({ collectedBy: 1 });
feeRecordSchema.index({ createdAt: -1 });
feeRecordSchema.index({ status: 1 });

module.exports = mongoose.model("FeeRecord", feeRecordSchema);
