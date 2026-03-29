/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  EDWARDIAN ACADEMY — COMPLETE DATABASE RESET                ║
 * ║  Clears ALL collections - Complete Fresh Start              ║
 * ║  Run: node reset-database.js                                ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

// ─── Import ALL Models ──────────────────────────────────────────
const User = require("./models/User");
const Student = require("./models/Student");
const Teacher = require("./models/Teacher");
const Class = require("./models/Class");
const Session = require("./models/Session");
const Attendance = require("./models/Attendance");
const FeeRecord = require("./models/FeeRecord");
const FinanceRecord = require("./models/FinanceRecord");
const Expense = require("./models/Expense");
const Exam = require("./models/Exam");
const ExamResult = require("./models/ExamResult");
const Lead = require("./models/Lead");
const Lecture = require("./models/Lecture");
const Configuration = require("./models/Configuration");
const Settings = require("./models/Settings");
const DailyClosing = require("./models/DailyClosing");
const DailyRevenue = require("./models/DailyRevenue");
const Notification = require("./models/Notification");
const Settlement = require("./models/Settlement");
const TeacherPayment = require("./models/TeacherPayment");
const PayoutRequest = require("./models/PayoutRequest");
const Transaction = require("./models/Transaction");
const Timetable = require("./models/Timetable");
const Video = require("./models/Video");
const WebsiteConfig = require("./models/WebsiteConfig");

async function resetDatabase() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║  🗑️  COMPLETE DATABASE RESET — INITIATED            ║");
  console.log("║     WARNING: This will DELETE ALL DATA              ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected\n");

    console.log("🧹 Clearing ALL collections...\n");

    // Delete all documents from all collections
    const deletionResults = await Promise.all([
      { name: "Users", result: User.deleteMany({}) },
      { name: "Students", result: Student.deleteMany({}) },
      { name: "Teachers", result: Teacher.deleteMany({}) },
      { name: "Classes", result: Class.deleteMany({}) },
      { name: "Sessions", result: Session.deleteMany({}) },
      { name: "Attendance", result: Attendance.deleteMany({}) },
      { name: "FeeRecords", result: FeeRecord.deleteMany({}) },
      { name: "FinanceRecords", result: FinanceRecord.deleteMany({}) },
      { name: "Expenses", result: Expense.deleteMany({}) },
      { name: "Exams", result: Exam.deleteMany({}) },
      { name: "ExamResults", result: ExamResult.deleteMany({}) },
      { name: "Leads", result: Lead.deleteMany({}) },
      { name: "Lectures", result: Lecture.deleteMany({}) },
      { name: "Configuration", result: Configuration.deleteMany({}) },
      { name: "Settings", result: Settings.deleteMany({}) },
      { name: "DailyClosing", result: DailyClosing.deleteMany({}) },
      { name: "DailyRevenue", result: DailyRevenue.deleteMany({}) },
      { name: "Notifications", result: Notification.deleteMany({}) },
      { name: "Settlements", result: Settlement.deleteMany({}) },
      { name: "TeacherPayments", result: TeacherPayment.deleteMany({}) },
      { name: "PayoutRequests", result: PayoutRequest.deleteMany({}) },
      { name: "Transactions", result: Transaction.deleteMany({}) },
      { name: "Timetables", result: Timetable.deleteMany({}) },
      { name: "Videos", result: Video.deleteMany({}) },
      { name: "WebsiteConfig", result: WebsiteConfig.deleteMany({}) },
    ]);

    // Process results
    const results = [];
    for (const item of deletionResults) {
      const result = await item.result;
      results.push({ collection: item.name, deleted: result.deletedCount });
    }

    // Display summary
    console.log("╔════════════════════════════════════════════════════╗");
    console.log("║  ✅ DATABASE RESET COMPLETE                        ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    console.log("📋 Collections Cleared:\n");
    let totalDeleted = 0;
    results.forEach((r) => {
      if (r.deleted > 0) {
        console.log(`   • ${r.collection}: ${r.deleted} documents deleted`);
        totalDeleted += r.deleted;
      } else {
        console.log(`   • ${r.collection}: (empty)`);
      }
    });

    console.log(`\n✅ Total Documents Deleted: ${totalDeleted}`);
    console.log("\n🚀 Database is now completely empty and ready for fresh start!\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Reset Failed:", error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

resetDatabase();
