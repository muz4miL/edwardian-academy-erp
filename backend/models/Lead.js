const mongoose = require("mongoose");

/**
 * Lead Model - CRM Module for Tracking Inquiries
 * 
 * This tracks potential students before they are formally admitted.
 * Status flow: New -> FollowUp -> Converted (or Dead)
 */

const leadSchema = new mongoose.Schema(
  {
    // Lead Information
    name: {
      type: String,
      required: [true, "Lead name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    
    // Inquiry Details
    source: {
      type: String,
      enum: ["Walk-in", "Phone", "Referral", "Social Media", "Website", "Other"],
      default: "Walk-in",
    },
    interest: {
      type: String,
      required: [true, "Interest/Class is required"],
      trim: true,
      // e.g., "10th Biology", "11th Pre-Medical", "MDCAT"
    },
    
    // Status Tracking
    status: {
      type: String,
      enum: ["New", "FollowUp", "Converted", "Dead"],
      default: "New",
    },
    
    // Notes & History
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    
    // Follow-up tracking
    lastContactDate: {
      type: Date,
    },
    nextFollowUp: {
      type: Date,
    },
    
    // If converted, link to student record
    convertedToStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    
    // Tracking who created/modified
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ source: 1 });

// Virtual for days since inquiry
leadSchema.virtual("daysSinceInquiry").get(function () {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Ensure virtuals are included in JSON
leadSchema.set("toJSON", { virtuals: true });
leadSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Lead", leadSchema);
