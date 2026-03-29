/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  EDWARDIAN ACADEMY — STUDENT DATA CLEANUP SCRIPT             ║
 * ║  Removes all student records and related data                ║
 * ║  PRESERVES: Teachers, Classes, and Finance Infrastructure    ║
 * ║  Run: node cleanup-students.js                               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

// ─── Models ──────────────────────────────────────────────
const Student = require("./models/Student");
const FeeRecord = require("./models/FeeRecord");
const FinanceRecord = require("./models/FinanceRecord");
const Attendance = require("./models/Attendance");
const ExamResult = require("./models/ExamResult");
const Exam = require("./models/Exam");
const Lecture = require("./models/Lecture");
const DailyRevenue = require("./models/DailyRevenue");
const Transaction = require("./models/Transaction");
const Lead = require("./models/Lead");

async function cleanupStudents() {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  🧹 STUDENT DATA CLEANUP — INITIATED       ║");
  console.log("╚════════════════════════════════════════════╝\n");

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected\n");

    // Get all student IDs first (for reference cleanup)
    const allStudents = await Student.find({}, "_id").lean();
    const studentIds = allStudents.map(s => s._id);
    
    console.log(`📊 Found ${studentIds.length} students to remove\n`);

    // ━━━ STEP 1: Delete Student Records ━━━
    console.log("🧹 Step 1: Removing Student records...");
    const studentDeleteResult = await Student.deleteMany({});
    console.log(`   ✓ Deleted ${studentDeleteResult.deletedCount} student records\n`);

    // ━━━ STEP 2: Delete Fee Records (linked to students) ━━━
    console.log("🧹 Step 2: Removing FeeRecord entries...");
    const feeDeleteResult = await FeeRecord.deleteMany({
      student: { $in: studentIds }
    });
    console.log(`   ✓ Deleted ${feeDeleteResult.deletedCount} fee records\n`);

    // ━━━ STEP 3: Delete Finance Records (student-based tracking) ━━━
    console.log("🧹 Step 3: Removing FinanceRecord entries...");
    const financeDeleteResult = await FinanceRecord.deleteMany({
      studentId: { $in: studentIds }
    });
    console.log(`   ✓ Deleted ${financeDeleteResult.deletedCount} finance records\n`);

    // ━━━ STEP 4: Delete Attendance Records ━━━
    console.log("🧹 Step 4: Removing Attendance records...");
    const attendanceDeleteResult = await Attendance.deleteMany({
      student: { $in: studentIds }
    });
    console.log(`   ✓ Deleted ${attendanceDeleteResult.deletedCount} attendance records\n`);

    // ━━━ STEP 5: Delete Exam Results ━━━
    console.log("🧹 Step 5: Removing ExamResult records...");
    const examResultDeleteResult = await ExamResult.deleteMany({
      studentId: { $in: studentIds }
    });
    console.log(`   ✓ Deleted ${examResultDeleteResult.deletedCount} exam result records\n`);

    // ━━━ STEP 6: Delete Lecture Enrollments ━━━
    console.log("🧹 Step 6: Removing Lecture enrollment records...");
    const lectureUpdateResult = await Lecture.updateMany(
      { "enrolledStudents": { $in: studentIds } },
      { $pull: { enrolledStudents: { $in: studentIds } } }
    );
    console.log(`   ✓ Updated ${lectureUpdateResult.modifiedCount} lecture records\n`);

    // ━━━ STEP 7: Delete Student-Related Transactions ━━━
    console.log("🧹 Step 7: Removing Student-related transactions...");
    const transactionDeleteResult = await Transaction.deleteMany({
      $or: [
        { studentId: { $in: studentIds } },
        { relatedStudent: { $in: studentIds } }
      ]
    });
    console.log(`   ✓ Deleted ${transactionDeleteResult.deletedCount} transaction records\n`);

    // ━━━ STEP 8: Delete Student-Related Leads (admission inquiries) ━━━
    console.log("🧹 Step 8: Removing Student-related leads...");
    const leadDeleteResult = await Lead.deleteMany({
      studentId: { $in: studentIds }
    });
    console.log(`   ✓ Deleted ${leadDeleteResult.deletedCount} lead records\n`);

    // ━━━ STEP 9: Remove From DailyRevenue ━━━
    console.log("🧹 Step 9: Cleaning DailyRevenue student references...");
    const dailyRevenueUpdateResult = await DailyRevenue.updateMany(
      { "studentFees": { $exists: true } },
      { $set: { "studentFees": [] } }
    );
    console.log(`   ✓ Updated ${dailyRevenueUpdateResult.modifiedCount} daily revenue records\n`);

    // ━━━ SUMMARY ━━━
    console.log("╔════════════════════════════════════════════╗");
    console.log("║  ✅ CLEANUP COMPLETE                       ║");
    console.log("╚════════════════════════════════════════════╝\n");
    console.log("📋 Summary of Deletions:");
    console.log(`   • Students:           ${studentDeleteResult.deletedCount}`);
    console.log(`   • Fee Records:        ${feeDeleteResult.deletedCount}`);
    console.log(`   • Finance Records:    ${financeDeleteResult.deletedCount}`);
    console.log(`   • Attendance Records: ${attendanceDeleteResult.deletedCount}`);
    console.log(`   • Exam Results:       ${examResultDeleteResult.deletedCount}`);
    console.log(`   • Transactions:       ${transactionDeleteResult.deletedCount}`);
    console.log(`   • Leads:              ${leadDeleteResult.deletedCount}`);
    console.log(`\n✅ Teachers, Classes, and Finance Infrastructure remain intact!`);
    console.log(`✅ Real-time finance calculations are ready to track academy operations!\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Cleanup Failed:", error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

cleanupStudents();
