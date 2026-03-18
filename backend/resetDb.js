/**
 * Database Reset Script
 * Clears test data while preserving the OWNER account (Sir Waqar Baig)
 *
 * Usage: node resetDb.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const Student = require("./models/Student");
const Class = require("./models/Class");
const Session = require("./models/Session");
const FeeRecord = require("./models/FeeRecord");
const Transaction = require("./models/Transaction");
const DailyRevenue = require("./models/DailyRevenue");
const Teacher = require("./models/Teacher");
const User = require("./models/User");

async function resetDatabase() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║         DATABASE RESET SCRIPT - Edwardian Academy      ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing from .env file");
    }

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB successfully!\n");

    // 1. Delete all Students
    console.log("🗑️  Deleting all Students...");
    const studentsResult = await Student.deleteMany({});
    console.log(`   ✅ Deleted ${studentsResult.deletedCount} students\n`);

    // 2. Delete all Classes
    console.log("🗑️  Deleting all Classes...");
    const classesResult = await Class.deleteMany({});
    console.log(`   ✅ Deleted ${classesResult.deletedCount} classes\n`);

    // 3. Delete all Sessions (AcademicSessions)
    console.log("🗑️  Deleting all Sessions (AcademicSessions)...");
    const sessionsResult = await Session.deleteMany({});
    console.log(`   ✅ Deleted ${sessionsResult.deletedCount} sessions\n`);

    // 4. Delete all FeeRecords
    console.log("🗑️  Deleting all FeeRecords...");
    const feeRecordsResult = await FeeRecord.deleteMany({});
    console.log(`   ✅ Deleted ${feeRecordsResult.deletedCount} fee records\n`);

    // 5. Delete all Transactions
    console.log("🗑️  Deleting all Transactions...");
    const transactionsResult = await Transaction.deleteMany({});
    console.log(`   ✅ Deleted ${transactionsResult.deletedCount} transactions\n`);

    // 6. Delete all DailyRevenues
    console.log("🗑️  Deleting all DailyRevenues...");
    const dailyRevenuesResult = await DailyRevenue.deleteMany({});
    console.log(`   ✅ Deleted ${dailyRevenuesResult.deletedCount} daily revenues\n`);

    // 7. Delete all Teachers
    console.log("🗑️  Deleting all Teachers...");
    const teachersResult = await Teacher.deleteMany({});
    console.log(`   ✅ Deleted ${teachersResult.deletedCount} teachers\n`);

    // 8. Delete non-OWNER Users (preserve OWNER account)
    console.log("🗑️  Deleting non-OWNER Users (preserving Sir Waqar Baig)...");

    // First, let's see which OWNER accounts will be preserved
    const ownersToKeep = await User.find({ role: "OWNER" }).select("username fullName role");
    if (ownersToKeep.length > 0) {
      console.log("   🛡️  Preserving OWNER accounts:");
      ownersToKeep.forEach((owner) => {
        console.log(`      - ${owner.fullName} (${owner.username})`);
      });
    }

    // Delete all non-OWNER users
    const usersResult = await User.deleteMany({ role: { $ne: "OWNER" } });
    console.log(`   ✅ Deleted ${usersResult.deletedCount} non-owner users\n`);

    // Summary
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║                    RESET COMPLETE                      ║");
    console.log("╠════════════════════════════════════════════════════════╣");
    console.log(`║  Students deleted:      ${String(studentsResult.deletedCount).padStart(6)}                       ║`);
    console.log(`║  Classes deleted:       ${String(classesResult.deletedCount).padStart(6)}                       ║`);
    console.log(`║  Sessions deleted:      ${String(sessionsResult.deletedCount).padStart(6)}                       ║`);
    console.log(`║  FeeRecords deleted:    ${String(feeRecordsResult.deletedCount).padStart(6)}                       ║`);
    console.log(`║  Transactions deleted:  ${String(transactionsResult.deletedCount).padStart(6)}                       ║`);
    console.log(`║  DailyRevenues deleted: ${String(dailyRevenuesResult.deletedCount).padStart(6)}                       ║`);
    console.log(`║  Teachers deleted:      ${String(teachersResult.deletedCount).padStart(6)}                       ║`);
    console.log(`║  Users deleted:         ${String(usersResult.deletedCount).padStart(6)}                       ║`);
    console.log(`║  OWNER accounts kept:   ${String(ownersToKeep.length).padStart(6)}                       ║`);
    console.log("╚════════════════════════════════════════════════════════╝\n");

    console.log("🎉 Database reset complete! Ready for testing the new finance engine.\n");

  } catch (error) {
    console.error("\n❌ Error during database reset:", error.message);
    process.exit(1);
  } finally {
    // Close the connection
    console.log("🔌 Closing MongoDB connection...");
    await mongoose.connection.close();
    console.log("✅ Connection closed.\n");
  }
}

// Run the reset
resetDatabase();
