const mongoose = require("mongoose");
require("dotenv").config();

// Import all models
const FinanceRecord = require("../models/FinanceRecord");
const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");
const DailyClosing = require("../models/DailyClosing");
const DailyRevenue = require("../models/DailyRevenue");
const FeeRecord = require("../models/FeeRecord");
const Attendance = require("../models/Attendance");
const ExamResult = require("../models/ExamResult");
const TeacherPayment = require("../models/TeacherPayment");
const Settlement = require("../models/Settlement");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Class = require("../models/Class");
const User = require("../models/User");

/**
 * ========================================
 * RESET ACADEMY DATABASE SCRIPT
 * ========================================
 * Purpose: Clean mock/test data and reset financial counters
 * Usage: node scripts/resetAcademy.js [--keep-students]
 */

const resetAcademy = async () => {
    // Initialize result variables at function scope
    let studentResult = { deletedCount: 0 };

    try {
        console.log("🔧 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB\n");

        const keepStudents = process.argv.includes("--keep-students");

        // ========================================
        // 1. DELETE FINANCE RECORDS
        // ========================================
        console.log("🗑️  Step 1: Deleting Finance Records...");
        const financeResult = await FinanceRecord.deleteMany({});
        console.log(`   ✅ Deleted ${financeResult.deletedCount} FinanceRecord documents`);

        const transactionResult = await Transaction.deleteMany({});
        console.log(`   ✅ Deleted ${transactionResult.deletedCount} Transaction documents`);

        const expenseResult = await Expense.deleteMany({});
        console.log(`   ✅ Deleted ${expenseResult.deletedCount} Expense documents`);

        const closingResult = await DailyClosing.deleteMany({});
        console.log(`   ✅ Deleted ${closingResult.deletedCount} DailyClosing documents`);

        const revenueResult = await DailyRevenue.deleteMany({});
        console.log(`   ✅ Deleted ${revenueResult.deletedCount} DailyRevenue documents`);

        const feeRecordResult = await FeeRecord.deleteMany({});
        console.log(`   ✅ Deleted ${feeRecordResult.deletedCount} FeeRecord documents`);

        const paymentResult = await TeacherPayment.deleteMany({});
        console.log(`   ✅ Deleted ${paymentResult.deletedCount} TeacherPayment documents`);

        const settlementResult = await Settlement.deleteMany({});
        console.log(`   ✅ Deleted ${settlementResult.deletedCount} Settlement documents\n`);

        // ========================================
        // 2. RESET TEACHER BALANCES
        // ========================================
        console.log("🔄 Step 2: Resetting Teacher Balances...");
        const teachers = await Teacher.find({});
        let teacherUpdateCount = 0;

        for (const teacher of teachers) {
            // Reset earned amounts and balances
            teacher.earnedThisMonth = 0;
            teacher.totalEarned = 0;
            teacher.pendingPayout = 0;
            await teacher.save();
            teacherUpdateCount++;
        }
        console.log(`   ✅ Reset balances for ${teacherUpdateCount} teachers\n`);

        // ========================================
        // 3. RESET USER WALLET BALANCES
        // ========================================
        console.log("💰 Step 3: Resetting User Wallet Balances...");
        const users = await User.find({});
        let userUpdateCount = 0;

        for (const user of users) {
            // Reset wallet balances - always use the proper object structure
            user.walletBalance = { floating: 0, verified: 0 };

            // Reset debts
            user.debtToOwner = 0;
            user.pendingDebt = 0;

            await user.save();
            userUpdateCount++;
        }
        console.log(`   ✅ Reset balances for ${userUpdateCount} users\n`);

        // ========================================
        // 4. OPTIONAL: DELETE STUDENTS
        // ========================================
        if (!keepStudents) {
            console.log("👨‍🎓 Step 4: Deleting Student Records...");
            const attendanceResult = await Attendance.deleteMany({});
            console.log(`   ✅ Deleted ${attendanceResult.deletedCount} Attendance documents`);

            const examResultDeleteResult = await ExamResult.deleteMany({});
            console.log(`   ✅ Deleted ${examResultDeleteResult.deletedCount} ExamResult documents`);

            studentResult = await Student.deleteMany({});
            console.log(`   ✅ Deleted ${studentResult.deletedCount} Student documents`);

            const classResetResult = await Class.updateMany({}, { $set: { enrolledCount: 0 } });
            console.log(`   ✅ Reset enrolledCount for ${classResetResult.modifiedCount} classes`);

            console.log(`   ⚠️  Note: Use --keep-students flag to preserve student data\n`);
        } else {
            console.log("👨‍🎓 Step 4: Keeping Student Records");
            console.log(`   ℹ️  Resetting student fee status to 'pending'...\n`);
            const students = await Student.find({});
            let studentUpdateCount = 0;

            for (const student of students) {
                student.paidAmount = 0;
                student.feeStatus = "pending";
                await student.save();
                studentUpdateCount++;
            }
            console.log(`   ✅ Reset fee status for ${studentUpdateCount} students\n`);
        }

        // ========================================
        // 5. SUMMARY
        // ========================================
        console.log("📊 ========================================");
        console.log("📊 RESET SUMMARY");
        console.log("📊 ========================================");
        console.log(`✅ Finance Records Deleted: ${financeResult.deletedCount}`);
        console.log(`✅ Transactions Deleted: ${transactionResult.deletedCount}`);
        console.log(`✅ Expenses Deleted: ${expenseResult.deletedCount}`);
        console.log(`✅ Daily Closings Deleted: ${closingResult.deletedCount}`);
        console.log(`✅ Daily Revenues Deleted: ${revenueResult.deletedCount}`);
        console.log(`✅ Fee Records Deleted: ${feeRecordResult.deletedCount}`);
        console.log(`✅ Teacher Payments Deleted: ${paymentResult.deletedCount}`);
        console.log(`✅ Settlements Deleted: ${settlementResult.deletedCount}`);
        console.log(`✅ Teachers Reset: ${teacherUpdateCount}`);
        console.log(`✅ Users Reset: ${userUpdateCount}`);
        if (!keepStudents) {
            console.log(`✅ Students Deleted: ${studentResult.deletedCount}`);
        } else {
            console.log(`✅ Students Reset (Kept): ${await Student.countDocuments()}`);
        }
        console.log("📊 ========================================\n");

        console.log("🎉 DATABASE RESET COMPLETE!");
        console.log("💡 The academy is now ready for fresh data entry.\n");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error resetting academy:", error);
        process.exit(1);
    }
};

// Run the reset
resetAcademy();
