const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Target User
    recipientRole: { type: String, enum: ["OWNER", "PARTNER", "STAFF"] }, // Target Role
    message: { type: String, required: true },
    type: { type: String, enum: ["FINANCE", "SYSTEM"], default: "SYSTEM" },
    isRead: { type: Boolean, default: false },
    relatedId: { type: String }, // Transaction ID or related document reference
  },
  { timestamps: true },
);

// Index for fast lookups by recipient and read status
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipientRole: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
