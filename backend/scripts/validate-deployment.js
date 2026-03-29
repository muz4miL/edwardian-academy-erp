/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  EDWARDIAN ACADEMY ERP — PRE-DEPLOYMENT VALIDATION                      ║
 * ║  Validates database integrity and finance system before deployment      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   npm run validate           — Run all validation checks
 *   npm run validate -- --fix  — Attempt to auto-fix issues where possible
 *
 * Checks performed:
 *   1. Core users exist (Owner + Partners)
 *   2. Configuration exists and is valid
 *   3. Split percentages total 100%
 *   4. No orphaned financial records
 *   5. Student fee totals match paid amounts
 *   6. Teacher balances are non-negative
 *   7. DailyRevenue entries are consistent
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

// Models
const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Configuration = require("../models/Configuration");
const FeeRecord = require("../models/FeeRecord");
const Transaction = require("../models/Transaction");
const DailyRevenue = require("../models/DailyRevenue");
const DailyClosing = require("../models/DailyClosing");
const Session = require("../models/Session");

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const log = {
  pass: (msg) => console.log(`\x1b[32m  ✓ ${msg}\x1b[0m`),
  fail: (msg) => console.log(`\x1b[31m  ✗ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m  ⚠ ${msg}\x1b[0m`),
  info: (msg) => console.log(`\x1b[36m  ℹ ${msg}\x1b[0m`),
  section: (msg) => console.log(`\n\x1b[35m══ ${msg} ══\x1b[0m`),
};

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

function check(condition, passMsg, failMsg, isWarning = false) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    log.pass(passMsg);
    return true;
  } else {
    if (isWarning) {
      warnings++;
      log.warn(failMsg);
    } else {
      failedChecks++;
      log.fail(failMsg);
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION CHECKS
// ═══════════════════════════════════════════════════════════════════════════

async function validateCoreUsers() {
  log.section("CORE USERS");

  const owner = await User.findOne({ role: "OWNER" });
  check(owner, "Owner user exists", "CRITICAL: No owner user found!");

  const partners = await User.find({ role: "PARTNER" });
  check(partners.length >= 2, `${partners.length} partner users found`, "Less than 2 partners found", true);

  // Check for waqar, zahid, saud specifically
  const waqar = await User.findOne({ username: "waqar" });
  const zahid = await User.findOne({ username: "zahid" });
  const saud = await User.findOne({ username: "saud" });

  check(waqar, "User 'waqar' exists", "User 'waqar' not found");
  check(zahid, "User 'zahid' exists", "User 'zahid' not found");
  check(saud, "User 'saud' exists", "User 'saud' not found");

  // Check wallet balances are not corrupted - use raw MongoDB to avoid Mongoose cast errors
  const allUsers = await mongoose.connection.db.collection('users').find({}).toArray();
  const usersWithBadBalances = allUsers.filter(u => {
    const f = u.walletBalance?.floating;
    const v = u.walletBalance?.verified;
    // NaN !== NaN trick, or check for non-number types
    return (f !== f) || (v !== v) || (typeof f !== 'number' && f !== undefined) || (typeof v !== 'number' && v !== undefined);
  });
  check(usersWithBadBalances.length === 0, "No users with invalid wallet balances", `${usersWithBadBalances.length} users have invalid wallet balances`);
}

async function validateConfiguration() {
  log.section("CONFIGURATION");

  const config = await Configuration.findOne();
  if (!check(config, "Configuration document exists", "CRITICAL: No configuration found!")) {
    return;
  }

  // Validate salary split
  const salaryTotal = config.salaryConfig.teacherShare + config.salaryConfig.academyShare;
  check(salaryTotal === 100, `Salary split totals 100% (Teacher: ${config.salaryConfig.teacherShare}%, Academy: ${config.salaryConfig.academyShare}%)`, `Salary split totals ${salaryTotal}% (should be 100%)`);

  // Validate expense split
  const expenseTotal = config.expenseSplit.waqar + config.expenseSplit.zahid + config.expenseSplit.saud;
  check(expenseTotal === 100, `Expense split totals 100%`, `Expense split totals ${expenseTotal}% (should be 100%)`);

  // Validate tuition pool split
  const tuitionTotal = config.tuitionPoolSplit.waqar + config.tuitionPoolSplit.zahid + config.tuitionPoolSplit.saud;
  check(tuitionTotal === 100, `Tuition pool split totals 100%`, `Tuition pool split totals ${tuitionTotal}% (should be 100%)`);

  // Validate ETEA pool split
  const eteaTotal = config.eteaPoolSplit.waqar + config.eteaPoolSplit.zahid + config.eteaPoolSplit.saud;
  check(eteaTotal === 100, `ETEA pool split totals 100%`, `ETEA pool split totals ${eteaTotal}% (should be 100%)`);

  // Validate academy share split if configured
  if (config.academyShareSplit && config.academyShareSplit.length > 0) {
    const academyTotal = config.academyShareSplit.reduce((sum, s) => sum + (s.percentage || 0), 0);
    check(academyTotal === 100, `Academy share split totals 100%`, `Academy share split totals ${academyTotal}% (should be 100%)`);
  }

  // Validate partner IDs are linked
  check(config.partnerIds && config.partnerIds.waqar, "Partner IDs linked in configuration", "Partner IDs not linked in configuration", true);

  // Validate default subject fees exist
  check(config.defaultSubjectFees && config.defaultSubjectFees.length > 0, `${config.defaultSubjectFees?.length || 0} default subject fees configured`, "No default subject fees configured", true);
}

async function validateSessions() {
  log.section("SESSIONS");

  const sessions = await Session.find({});
  check(sessions.length > 0, `${sessions.length} sessions found`, "No sessions found", true);

  const activeSessions = sessions.filter(s => s.status === "active");
  check(activeSessions.length > 0, `${activeSessions.length} active sessions`, "No active sessions", true);
}

async function validateStudentFinances() {
  log.section("STUDENT FINANCES");

  const totalStudents = await Student.countDocuments();
  log.info(`Total students: ${totalStudents}`);

  if (totalStudents === 0) {
    log.info("No students to validate");
    return;
  }

  // Check for students with negative paid amounts
  const negativePayments = await Student.find({ paidAmount: { $lt: 0 } });
  check(negativePayments.length === 0, "No students with negative paid amounts", `${negativePayments.length} students have negative paid amounts`);

  // Check for students where paidAmount > totalFee
  const overpaid = await Student.find({ $expr: { $gt: ["$paidAmount", "$totalFee"] } });
  check(overpaid.length === 0, "No overpaid students", `${overpaid.length} students have paid more than their total fee`, true);

  // Validate fee status consistency
  const incorrectStatus = await Student.aggregate([
    {
      $match: {
        $or: [
          // Status is 'paid' but paidAmount < totalFee
          { feeStatus: "paid", $expr: { $lt: ["$paidAmount", "$totalFee"] } },
          // Status is 'pending' but paidAmount > 0
          { feeStatus: "pending", paidAmount: { $gt: 0 } },
        ]
      }
    }
  ]);
  check(incorrectStatus.length === 0, "Fee statuses are consistent", `${incorrectStatus.length} students have inconsistent fee status`, true);

  // Check fee records match student paid amounts
  const studentsWithFees = await Student.find({ paidAmount: { $gt: 0 } }).limit(100);
  let mismatchCount = 0;

  for (const student of studentsWithFees) {
    const feeRecordTotal = await FeeRecord.aggregate([
      { $match: { student: student._id, status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const recordedAmount = feeRecordTotal[0]?.total || 0;

    // Allow small variance for floating point
    if (Math.abs(recordedAmount - student.paidAmount) > 1) {
      mismatchCount++;
    }
  }
  check(mismatchCount === 0, "Student paid amounts match fee records (sampled 100)", `${mismatchCount} students have mismatched fee records`, true);
}

async function validateTeacherFinances() {
  log.section("TEACHER FINANCES");

  const teachers = await Teacher.find({});
  log.info(`Total teachers: ${teachers.length}`);

  if (teachers.length === 0) {
    log.info("No teachers to validate");
    return;
  }

  // Check for negative balances
  const negativeBalances = teachers.filter(t =>
    (t.balance?.floating < 0) ||
    (t.balance?.verified < 0) ||
    (t.balance?.pending < 0)
  );
  check(negativeBalances.length === 0, "No teachers with negative balances", `${negativeBalances.length} teachers have negative balances`);

  // Check total withdrawn doesn't exceed total earnings
  const overWithdrawn = teachers.filter(t => t.totalWithdrawn > t.totalEarnings);
  check(overWithdrawn.length === 0, "No teachers have withdrawn more than earned", `${overWithdrawn.length} teachers have withdrawn more than earned`, true);
}

async function validateTransactions() {
  log.section("TRANSACTIONS");

  const transactions = await Transaction.countDocuments();
  log.info(`Total transactions: ${transactions}`);

  if (transactions === 0) {
    log.info("No transactions to validate");
    return;
  }

  // Check for transactions with invalid types
  const validTypes = ["INCOME", "EXPENSE", "CREDIT", "DEBIT", "REFUND", "LIABILITY", "TRANSFER"];
  const invalidTypeTransactions = await Transaction.find({ type: { $nin: validTypes } });
  check(invalidTypeTransactions.length === 0, "All transactions have valid types", `${invalidTypeTransactions.length} transactions have invalid types`);

  // Check for transactions without amounts
  const noAmount = await Transaction.find({ $or: [{ amount: null }, { amount: { $exists: false } }] });
  check(noAmount.length === 0, "All transactions have amounts", `${noAmount.length} transactions missing amounts`);

  // Validate income transactions equal fee records (monthly)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyIncomeFromTxn = await Transaction.aggregate([
    { $match: { type: "INCOME", date: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const monthlyFeeRecords = await FeeRecord.aggregate([
    { $match: { createdAt: { $gte: startOfMonth }, status: "PAID" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const txnTotal = monthlyIncomeFromTxn[0]?.total || 0;
  const feeTotal = monthlyFeeRecords[0]?.total || 0;

  // They might not match exactly due to misc payments, but should be close
  const variance = Math.abs(txnTotal - feeTotal);
  check(variance < txnTotal * 0.2 || txnTotal === 0, `Monthly income transactions (${txnTotal}) roughly match fee records (${feeTotal})`, `Large variance between transactions (${txnTotal}) and fee records (${feeTotal})`, true);
}

async function validateDailyRevenue() {
  log.section("DAILY REVENUE TRACKING");

  const dailyRevenues = await DailyRevenue.countDocuments();
  log.info(`Total daily revenue entries: ${dailyRevenues}`);

  if (dailyRevenues === 0) {
    log.info("No daily revenue entries to validate");
    return;
  }

  // Check for orphaned entries (referencing deleted users via 'partner' field)
  const orphanedEntries = await DailyRevenue.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "partner",
        foreignField: "_id",
        as: "user"
      }
    },
    { $match: { user: { $size: 0 } } },
    { $count: "total" }
  ]);
  const orphanCount = orphanedEntries[0]?.total || 0;
  check(orphanCount === 0, "No orphaned daily revenue entries", `${orphanCount} daily revenue entries reference deleted users`, true);

  // Check status distribution
  const statusCounts = await DailyRevenue.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  log.info(`Status distribution: ${JSON.stringify(statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}))}`);
}

async function validateDataIntegrity() {
  log.section("DATA INTEGRITY");

  // Check for any documents with null _id (shouldn't happen but critical if it does)
  const nullIdCollections = ["users", "students", "teachers", "transactions", "feerecords"];
  for (const collection of nullIdCollections) {
    const count = await mongoose.connection.db.collection(collection).countDocuments({ _id: null });
    check(count === 0, `No null _id documents in ${collection}`, `${count} null _id documents in ${collection}`);
  }

  // Check for duplicate userIds
  const duplicateUserIds = await User.aggregate([
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  check(duplicateUserIds.length === 0, "No duplicate user IDs", `${duplicateUserIds.length} duplicate user IDs found`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function runValidation() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  EDWARDIAN ACADEMY ERP — PRE-DEPLOYMENT VALIDATION                       ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log.info(`Connected to: ${process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, "//<hidden>@")}`);

    await validateCoreUsers();
    await validateConfiguration();
    await validateSessions();
    await validateStudentFinances();
    await validateTeacherFinances();
    await validateTransactions();
    await validateDailyRevenue();
    await validateDataIntegrity();

    // Summary
    log.section("VALIDATION SUMMARY");
    console.log(`
  Total Checks:  ${totalChecks}
  Passed:        \x1b[32m${passedChecks}\x1b[0m
  Failed:        \x1b[31m${failedChecks}\x1b[0m
  Warnings:      \x1b[33m${warnings}\x1b[0m
`);

    if (failedChecks > 0) {
      console.log("\x1b[31m❌ VALIDATION FAILED — Fix critical issues before deployment!\x1b[0m\n");
      process.exit(1);
    } else if (warnings > 0) {
      console.log("\x1b[33m⚠️  VALIDATION PASSED WITH WARNINGS — Review before deployment\x1b[0m\n");
      process.exit(0);
    } else {
      console.log("\x1b[32m✅ VALIDATION PASSED — System is ready for deployment!\x1b[0m\n");
      process.exit(0);
    }

  } catch (error) {
    console.error("\x1b[31mValidation error:", error.message, "\x1b[0m");
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runValidation();
