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
    // Check-in time (alias for display)
    checkInTime: {
      type: Date,
    },
    // Status derived from gate scan
    status: {
      type: String,
      enum: ["present", "late", "early-leave", "Present", "Late", "Absent", "Excused"],
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
    // Who marked this attendance
    markedBy: {
      type: String,
      enum: ["Gatekeeper", "Admin", "System", null],
      default: "Gatekeeper",
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
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index — one attendance record per student per day
// Prevents duplicate attendance even with race conditions
attendanceSchema.index({ date: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ date: 1, classRef: 1 });
attendanceSchema.index({ date: 1, status: 1 });

// Static: Get today's date string in PKT (YYYY-MM-DD)
attendanceSchema.statics.getTodayDateStr = function () {
  const now = new Date();
  const pkt = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
  return `${pkt.getFullYear()}-${String(pkt.getMonth() + 1).padStart(2, "0")}-${String(pkt.getDate()).padStart(2, "0")}`;
};

// Static: Check if student already checked in today
attendanceSchema.statics.isCheckedInToday = async function (studentObjectId) {
  const today = this.getTodayDateStr();
  return await this.findOne({ studentId: studentObjectId, date: today });
};

module.exports = mongoose.model("Attendance", attendanceSchema);
