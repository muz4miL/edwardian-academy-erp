require("dotenv").config();
const mongoose = require("mongoose");

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const ClassModel = require("../models/Class");

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
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI/MONGODB_URI missing in backend/.env");
  }

  await mongoose.connect(mongoUri);
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

  const studentDelete = await Student.deleteMany({});
  const classReset = await ClassModel.updateMany({}, { $set: { enrolledCount: 0 } });

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

