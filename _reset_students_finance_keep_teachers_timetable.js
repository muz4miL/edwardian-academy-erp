/**
 * Production reset script
 * Clears student + finance transactional data while preserving:
 * - teachers
 * - timetable
 * - classes
 * - sessions
 * - users
 * - configuration
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });
const mongoose = require("mongoose");

const Student = require("./backend/models/Student");
const Teacher = require("./backend/models/Teacher");
const User = require("./backend/models/User");
const ClassModel = require("./backend/models/Class");

async function safeDeleteCollection(db, name, report) {
  const exists = await db.listCollections({ name }).hasNext();
  if (!exists) {
    report[name] = { existed: false, deleted: 0 };
    return;
  }
  const res = await db.collection(name).deleteMany({});
  report[name] = { existed: true, deleted: res.deletedCount || 0 };
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI missing in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const before = {
    students: await Student.countDocuments(),
    feeRecords: (await db.listCollections({ name: "feerecords" }).hasNext())
      ? await db.collection("feerecords").countDocuments()
      : 0,
    expenses: (await db.listCollections({ name: "expenses" }).hasNext())
      ? await db.collection("expenses").countDocuments()
      : 0,
    transactions: (await db.listCollections({ name: "transactions" }).hasNext())
      ? await db.collection("transactions").countDocuments()
      : 0,
    teachers: await Teacher.countDocuments(),
    timetables: (await db.listCollections({ name: "timetables" }).hasNext())
      ? await db.collection("timetables").countDocuments()
      : 0,
    classes: await ClassModel.countDocuments(),
  };

  const deleted = {};

  // Finance + reporting/operational transaction collections to clear
  const collectionsToClear = [
    "dailyrevenues",
    "academysettlements",
    "teacherdeposits",
    "transactions",
    "closeddays",
    "expenses",
    "feerecords",
    "financerecords",
    "teacherpayments",
    "dailyclosings",
    "settlements",
    "payoutrequests",
    "attendances",
    "notifications",
    "examresults",
  ];

  for (const name of collectionsToClear) {
    await safeDeleteCollection(db, name, deleted);
  }

  // Delete all students (includes pending/active/inactive)
  const studentDelete = await Student.deleteMany({});

  // Reset class enrollment counters to avoid stale UI counts
  const classReset = await ClassModel.updateMany({}, { $set: { enrolledCount: 0 } });

  // Reset teacher balances but keep teacher master data
  const teacherReset = await Teacher.updateMany(
    {},
    {
      $set: {
        "balance.floating": 0,
        "balance.verified": 0,
        "balance.pending": 0,
        "balance.totalEarned": 0,
        "balance.totalPaid": 0,
        "balance.lastUpdated": new Date(),
      },
    },
  );

  // Reset user financial balances/debts (preserve account identities/permissions)
  const userReset = await User.updateMany(
    {},
    {
      $set: {
        "walletBalance.floating": 0,
        "walletBalance.verified": 0,
        totalCash: 0,
        expenseDebt: 0,
        debtToOwner: 0,
        pendingDebt: 0,
        manualBalance: 0,
      },
      $unset: {
        payoutHistory: 1,
      },
    },
  );

  const after = {
    students: await Student.countDocuments(),
    feeRecords: (await db.listCollections({ name: "feerecords" }).hasNext())
      ? await db.collection("feerecords").countDocuments()
      : 0,
    expenses: (await db.listCollections({ name: "expenses" }).hasNext())
      ? await db.collection("expenses").countDocuments()
      : 0,
    transactions: (await db.listCollections({ name: "transactions" }).hasNext())
      ? await db.collection("transactions").countDocuments()
      : 0,
    teachers: await Teacher.countDocuments(),
    timetables: (await db.listCollections({ name: "timetables" }).hasNext())
      ? await db.collection("timetables").countDocuments()
      : 0,
    classes: await ClassModel.countDocuments(),
  };

  console.log(
    JSON.stringify(
      {
        success: true,
        before,
        deletedCollections: deleted,
        studentsDeleted: studentDelete.deletedCount || 0,
        classEnrollmentReset: classReset.modifiedCount || 0,
        teacherBalanceReset: teacherReset.modifiedCount || 0,
        userFinancialReset: userReset.modifiedCount || 0,
        after,
        preserved: {
          teachers: true,
          timetables: true,
          classes: true,
          sessions: true,
          users: true,
          configuration: true,
        },
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("RESET_FAILED", err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

