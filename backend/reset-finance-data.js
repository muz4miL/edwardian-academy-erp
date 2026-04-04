/**
 * Complete Finance Data Reset Script
 * 
 * Options:
 * - Run with --delete-students to also delete all students
 * - Default: keeps students but resets their fee status
 * 
 * Run: node reset-finance-data.js [--delete-students]
 */
require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/edwardianAcademyDB";
const deleteStudents = process.argv.includes("--delete-students");

async function resetFinanceData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
    console.log("\n=== COMPLETE FINANCE RESET ===\n");
    if (deleteStudents) {
      console.log("🗑️  Mode: DELETE ALL STUDENTS\n");
    }

    const db = mongoose.connection.db;

    // ALL finance-related collections to clear
    const collectionsToDelete = [
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
    ];

    for (const col of collectionsToDelete) {
      try {
        const result = await db.collection(col).deleteMany({});
        console.log(`Cleared ${col}: ${result.deletedCount} documents`);
      } catch (e) {
        console.log(`Skipped ${col} (not found)`);
      }
    }

    // Handle students
    if (deleteStudents) {
      const studentDeleteResult = await db.collection("students").deleteMany({});
      console.log(`DELETED ${studentDeleteResult.deletedCount} students`);
    } else {
      // Just reset fee payment status
      const studentResult = await db.collection("students").updateMany(
        {},
        {
          $set: {
            feePaid: false,
            feePaymentDate: null,
            lastFeeAmount: 0,
            feeStatus: "PENDING",
          },
          $unset: {
            lastTransactionId: 1,
            paidAmount: 1,
            lastPaymentDate: 1,
          }
        }
      );
      console.log(`Reset ${studentResult.modifiedCount} students fee status`);
    }

    // Reset teacher wallet balances
    const teacherResult = await db.collection("teachers").updateMany(
      {},
      {
        $set: {
          "balance.floating": 0,
          "balance.verified": 0,
          "balance.pending": 0,
          "balance.totalEarned": 0,
          "balance.totalPaid": 0,
          "balance.lastUpdated": new Date(),
        }
      }
    );
    console.log(`Reset ${teacherResult.modifiedCount} teacher balances`);

    // Reset user wallet balances (owners, partners)
    const userResult = await db.collection("users").updateMany(
      {},
      {
        $set: {
          "walletBalance.floating": 0,
          "walletBalance.verified": 0,
          "walletBalance.pending": 0,
          "walletBalance.lastUpdated": new Date(),
        }
      }
    );
    console.log(`Reset ${userResult.modifiedCount} user wallet balances`);

    console.log("\n✅ COMPLETE FINANCE RESET DONE!");
    console.log("All money calculations are now at 0.");
    if (deleteStudents) {
      console.log("All students have been DELETED.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error resetting finance data:", error);
    process.exit(1);
  }
}

resetFinanceData();
