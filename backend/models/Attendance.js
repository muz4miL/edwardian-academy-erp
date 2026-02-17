const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    studentNumericId: {
      type: String,
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    class: {
      type: String,
    },
    classRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    group: {
      type: String,
    },
    // "check-in" or "check-out"
    type: {
      type: String,
      enum: ["check-in", "check-out"],
      default: "check-in",
    },
    // The date portion only (YYYY-MM-DD) for easy daily queries
    date: {
      type: String,
      required: true,
      index: true,
    },
    // Full timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Status derived from gate scan
    status: {
      type: String,
      enum: ["present", "late", "early-leave"],
      default: "present",
    },
    // What session was active when they scanned
    currentSession: {
      subject: String,
      teacher: String,
      startTime: String,
      endTime: String,
      room: String,
    },
    // How they were identified
    scanMethod: {
      type: String,
      enum: ["barcode", "manual", "token"],
      default: "barcode",
    },
    // The raw barcode/ID that was scanned
    scannedValue: {
      type: String,
    },
    // Who was operating the scanner
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Fee status at time of scan
    feeStatus: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient daily attendance queries
attendanceSchema.index({ date: 1, studentId: 1 });
attendanceSchema.index({ date: 1, classRef: 1 });
attendanceSchema.index({ studentId: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
