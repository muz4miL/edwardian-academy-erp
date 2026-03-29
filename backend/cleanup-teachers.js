/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  EDWARDIAN ACADEMY — TEACHER DATA CLEANUP SCRIPT             ║
 * ║  Removes all teacher records and related data                ║
 * ║  PRESERVES: Classes and Finance Infrastructure               ║
 * ║  Run: node cleanup-teachers.js                               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

// ─── Models ──────────────────────────────────────────────
const Teacher = require("./models/Teacher");
const TeacherPayment = require("./models/TeacherPayment");
const Lecture = require("./models/Lecture");
const Session = require("./models/Session");
const Timetable = require("./models/Timetable");
const Transaction = require("./models/Transaction");
const PayoutRequest = require("./models/PayoutRequest");
const Expense = require("./models/Expense");
const DailyRevenue = require("./models/DailyRevenue");
const Class = require("./models/Class");

async function cleanupTeachers() {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  🧹 TEACHER DATA CLEANUP — INITIATED       ║");
  console.log("╚════════════════════════════════════════════╝\n");

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected\n");

    // Get all teacher IDs first (for reference cleanup)
    const allTeachers = await Teacher.find({}, "_id").lean();
    const teacherIds = allTeachers.map(t => t._id);
    
    console.log(`📊 Found ${teacherIds.length} teachers to remove\n`);

    // ━━━ STEP 1: Delete Teacher Records ━━━
    console.log("🧹 Step 1: Removing Teacher records...");
    const teacherDeleteResult = await Teacher.deleteMany({});
    console.log(`   ✓ Deleted ${teacherDeleteResult.deletedCount} teacher records\n`);

    // ━━━ STEP 2: Delete Teacher Payment Records ━━━
    console.log("🧹 Step 2: Removing TeacherPayment records...");
    const paymentDeleteResult = await TeacherPayment.deleteMany({
      $or: [
        { teacher: { $in: teacherIds } },
        { teacherId: { $in: teacherIds } }
      ]
    });
    console.log(`   ✓ Deleted ${paymentDeleteResult.deletedCount} payment records\n`);

    // ━━━ STEP 3: Delete Lectures (taught by teachers) ━━━
    console.log("🧹 Step 3: Removing Lecture records...");
    const lectureDeleteResult = await Lecture.deleteMany({
      $or: [
        { teacher: { $in: teacherIds } },
        { teacherId: { $in: teacherIds } }
      ]
    });
    console.log(`   ✓ Deleted ${lectureDeleteResult.deletedCount} lecture records\n`);

    // ━━━ STEP 4: Delete Sessions (taught by teachers) ━━━
    console.log("🧹 Step 4: Removing Session records...");
    const sessionDeleteResult = await Session.deleteMany({
      $or: [
        { teacher: { $in: teacherIds } },
        { teacherId: { $in: teacherIds } }
      ]
    });
    console.log(`   ✓ Deleted ${sessionDeleteResult.deletedCount} session records\n`);

    // ━━━ STEP 5: Delete Timetable Entries ━━━
    console.log("🧹 Step 5: Removing Timetable entries...");
    const timetableDeleteResult = await Timetable.deleteMany({
      $or: [
        { teacher: { $in: teacherIds } },
        { teacherId: { $in: teacherIds } }
      ]
    });
    console.log(`   ✓ Deleted ${timetableDeleteResult.deletedCount} timetable entries\n`);

    // ━━━ STEP 6: Delete Teacher-Related Transactions ━━━
    console.log("🧹 Step 6: Removing Teacher-related transactions...");
    const transactionDeleteResult = await Transaction.deleteMany({
      $or: [
        { teacher: { $in: teacherIds } },
        { teacherId: { $in: teacherIds } }
      ]
    });
    console.log(`   ✓ Deleted ${transactionDeleteResult.deletedCount} transaction records\n`);

    // ━━━ STEP 7: Delete Payout Requests ━━━
    console.log("🧹 Step 7: Removing PayoutRequest records...");
    const payoutDeleteResult = await PayoutRequest.deleteMany({
      $or: [
        { teacher: { $in: teacherIds } },
        { teacherId: { $in: teacherIds } }
      ]
    });
    console.log(`   ✓ Deleted ${payoutDeleteResult.deletedCount} payout request records\n`);

    // ━━━ STEP 8: Remove Teachers from Class Subject References ━━━
    console.log("🧹 Step 8: Removing teacher references from Classes...");
    const classUpdateResult = await Class.updateMany(
      { "subjects.teacherId": { $in: teacherIds } },
      { $pull: { subjects: { teacherId: { $in: teacherIds } } } }
    );
    console.log(`   ✓ Updated ${classUpdateResult.modifiedCount} class records\n`);

    // ━━━ STEP 9: Clean DailyRevenue Teacher References ━━━
    console.log("🧹 Step 9: Cleaning DailyRevenue teacher payroll...");
    const dailyRevenueUpdateResult = await DailyRevenue.updateMany(
      { "teacherPayroll": { $exists: true } },
      { $set: { "teacherPayroll": [] } }
    );
    console.log(`   ✓ Updated ${dailyRevenueUpdateResult.modifiedCount} daily revenue records\n`);

    // ━━━ STEP 10: Clean Expenses (if linked to teachers) ━━━
    console.log("🧹 Step 10: Cleaning teacher-related expenses...");
    const expenseUpdateResult = await Expense.updateMany(
      { "approvedBy": { $in: teacherIds } },
      { $unset: { "approvedBy": "" } }
    );
    console.log(`   ✓ Updated ${expenseUpdateResult.modifiedCount} expense records\n`);

    // ━━━ SUMMARY ━━━
    console.log("╔════════════════════════════════════════════╗");
    console.log("║  ✅ CLEANUP COMPLETE                       ║");
    console.log("╚════════════════════════════════════════════╝\n");
    console.log("📋 Summary of Deletions:");
    console.log(`   • Teachers:           ${teacherDeleteResult.deletedCount}`);
    console.log(`   • Payments:           ${paymentDeleteResult.deletedCount}`);
    console.log(`   • Lectures:           ${lectureDeleteResult.deletedCount}`);
    console.log(`   • Sessions:           ${sessionDeleteResult.deletedCount}`);
    console.log(`   • Timetable:          ${timetableDeleteResult.deletedCount}`);
    console.log(`   • Transactions:       ${transactionDeleteResult.deletedCount}`);
    console.log(`   • Payout Requests:    ${payoutDeleteResult.deletedCount}`);
    console.log(`\n✅ Classes and Finance Infrastructure remain intact!`);
    console.log(`✅ Ready for new teacher setup!\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Cleanup Failed:", error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

cleanupTeachers();
