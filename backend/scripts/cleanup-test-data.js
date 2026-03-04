/**
 * CLEANUP — Remove test data created by test-full-sync.js
 */
const mongoose = require("mongoose");
require("dotenv").config();

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected\n");

  const Student = require("../models/Student");
  const Transaction = require("../models/Transaction");
  const Expense = require("../models/Expense");
  const Teacher = require("../models/Teacher");
  const Notification = require("../models/Notification");
  const TeacherPayment = require("../models/TeacherPayment");

  // 1. Remove test students
  const del = await Student.deleteMany({ studentName: "TEST SYNC STUDENT" });
  console.log(`🗑  Removed ${del.deletedCount} test students`);

  // 2. Remove test transactions (INCOME + REFUND from test admissions)
  const txDel = await Transaction.deleteMany({
    description: { $regex: "TEST SYNC STUDENT", $options: "i" },
  });
  console.log(`🗑  Removed ${txDel.deletedCount} test transactions`);

  // 3. Remove test-run teacher payout transactions (from Teacher Payout category, today, description matches test vouchers TP-202603-0004 and 0005)
  const payTxDel = await Transaction.deleteMany({
    category: "Teacher Payout",
    description: { $regex: "TP-202603-000[45]" },
  });
  console.log(`🗑  Removed ${payTxDel.deletedCount} test payout transactions`);

  // 4. Remove test liability transactions (Teacher Credit from test runs)
  const liabDel = await Transaction.deleteMany({
    type: "LIABILITY",
    description: { $regex: "Test sync credit", $options: "i" },
  });
  console.log(`🗑  Removed ${liabDel.deletedCount} test credit transactions`);

  // 5. Remove test salary expenses
  const expDel = await Expense.deleteMany({
    description: { $regex: "Test sync payout|Test sync credit", $options: "i" },
  });
  console.log(`🗑  Removed ${expDel.deletedCount} test salary expenses`);

  // 6. Remove test TeacherPayments (vouchers TP-202603-0004/0005)
  const tpDel = await TeacherPayment.deleteMany({
    voucherId: { $in: ["TP-202603-0004", "TP-202603-0005"] },
  });
  console.log(`🗑  Removed ${tpDel.deletedCount} test teacher payments`);

  // 7. Reset Sir Zahid's wallet to pre-test state
  // Before test: walletBalance=0, totalCredited=2500, totalDebited=2500
  // - Two credits of 5000 PKR each = 10000 added
  // - Two debits of 2000 PKR each = 4000 removed from pending, 4000 added to totalPaid
  const zahid = await Teacher.findOne({ name: /zahid/i });
  if (zahid) {
    const testCredits = 5000 * 2;  // 10000
    const testDebits = 2000 * 2;   // 4000
    zahid.balance.pending = Math.max(0, (zahid.balance.pending || 0) - (testCredits - testDebits));
    zahid.totalPaid = Math.max(0, (zahid.totalPaid || 0) - testDebits);
    await zahid.save();
    console.log(`✅ Sir Zahid wallet reset: balance=${zahid.balance.pending}, totalPaid=${zahid.totalPaid}`);
  }

  // 8. Remove test notifications
  const notifDel = await Notification.deleteMany({
    message: { $regex: "TEST SYNC STUDENT|Test sync", $options: "i" },
  });
  console.log(`🗑  Removed ${notifDel.deletedCount} test notifications`);

  console.log("\n✅ Cleanup complete — database restored to pre-test state");
  process.exit(0);
}

cleanup().catch((e) => { console.error(e); process.exit(1); });
