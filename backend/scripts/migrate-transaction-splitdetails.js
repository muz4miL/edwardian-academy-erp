/**
 * ================================================================
 * TRANSACTION SPLIT DETAILS MIGRATION SCRIPT
 * ================================================================
 * Adds missing splitDetails.teacherId to existing Transaction records
 * This ensures Teacher Payroll Reports can find transactions correctly
 *
 * Updates:
 * - INCOME transactions with category "Tuition" or "Academy Share"
 * - Adds splitDetails.teacherId if missing
 * - Attempts to resolve teacherId from description or other fields
 *
 * Usage: node backend/scripts/migrate-transaction-splitdetails.js
 * ================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const Transaction = require("../models/Transaction");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const FeeRecord = require("../models/FeeRecord");

async function migrateTransactionSplitDetails() {
  try {
    console.log("🔍 Starting Transaction SplitDetails Migration...\n");

    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database\n");

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Find transactions that need migration
    // ═══════════════════════════════════════════════════════════════
    const transactionsToMigrate = await Transaction.find({
      type: "INCOME",
      category: { $in: ["Tuition", "Academy Share"] },
      $or: [
        { "splitDetails.teacherId": { $exists: false } },
        { "splitDetails.teacherId": null },
      ],
    }).lean();

    console.log(`📊 Found ${transactionsToMigrate.length} transactions without splitDetails.teacherId\n`);

    if (transactionsToMigrate.length === 0) {
      console.log("🎉 All transactions already have splitDetails.teacherId!\n");
      await mongoose.connection.close();
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Load all teachers and users for faster lookups
    // ═══════════════════════════════════════════════════════════════
    const allTeachers = await Teacher.find().lean();
    const allUsers = await User.find().lean();

    // Create lookup maps
    const teachersByName = new Map();
    const usersByTeacherId = new Map();
    const usersByName = new Map();

    for (const teacher of allTeachers) {
      const nameLower = (teacher.name || "").toLowerCase().trim();
      if (nameLower) {
        teachersByName.set(nameLower, teacher);
      }
    }

    for (const user of allUsers) {
      if (user.teacherId) {
        usersByTeacherId.set(user.teacherId.toString(), user);
      }
      const nameLower = (user.fullName || "").toLowerCase().trim();
      if (nameLower) {
        usersByName.set(nameLower, user);
      }
    }

    console.log(`📚 Loaded ${allTeachers.length} teachers and ${allUsers.length} users\n`);

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Migrate each transaction
    // ═══════════════════════════════════════════════════════════════
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const tx of transactionsToMigrate) {
      const txInfo = `Transaction ${tx._id} (${tx.category}, ${tx.amount} PKR)`;

      try {
        let teacherId = null;
        let teacherName = null;
        let resolutionMethod = null;

        // Try method 1: Extract from description
        // Example: "Biology teacher share: Kashif Ullah (March 2026)"
        // Example: "Tuition: Ali Hassan (Jan 2026) → Dr. Zahid Khan"
        const desc = tx.description || "";

        // Pattern 1: "teacher share: StudentName" - no explicit teacher name
        if (desc.includes("teacher share:")) {
          const subjectMatch = desc.match(/^(.+?) teacher share:/);
          if (subjectMatch) {
            const subject = subjectMatch[1].trim();
            // Try to find teacher by subject
            const matchingTeacher = allTeachers.find(
              (t) => t.subject && t.subject.toLowerCase().trim() === subject.toLowerCase()
            );
            if (matchingTeacher) {
              teacherId = matchingTeacher._id;
              teacherName = matchingTeacher.name;
              resolutionMethod = `Subject match: ${subject}`;
            }
          }
        }

        // Pattern 2: "→ TeacherName" format
        if (!teacherId && desc.includes("→")) {
          const parts = desc.split("→");
          if (parts.length >= 2) {
            const possibleName = parts[1].trim();
            const teacher = teachersByName.get(possibleName.toLowerCase());
            if (teacher) {
              teacherId = teacher._id;
              teacherName = teacher.name;
              resolutionMethod = `Description arrow: ${possibleName}`;
            }
          }
        }

        // Try method 2: Use existing splitDetails data
        if (!teacherId && tx.splitDetails) {
          if (tx.splitDetails.teacherName) {
            const name = tx.splitDetails.teacherName.toLowerCase().trim();
            const teacher = teachersByName.get(name);
            if (teacher) {
              teacherId = teacher._id;
              teacherName = teacher.name;
              resolutionMethod = `splitDetails.teacherName: ${tx.splitDetails.teacherName}`;
            }
          }

          // Check if there's a userId that links to a teacher
          if (!teacherId && tx.splitDetails.userId) {
            const user = allUsers.find((u) => u._id.toString() === tx.splitDetails.userId.toString());
            if (user && user.teacherId) {
              const teacher = allTeachers.find((t) => t._id.toString() === user.teacherId.toString());
              if (teacher) {
                teacherId = teacher._id;
                teacherName = teacher.name;
                resolutionMethod = `splitDetails.userId → User.teacherId`;
              }
            }
          }
        }

        // Try method 3: Look up from related FeeRecord
        if (!teacherId && tx.splitDetails?.studentId) {
          const feeRecord = await FeeRecord.findOne({
            student: tx.splitDetails.studentId,
            status: "PAID",
          })
            .sort({ createdAt: -1 })
            .lean();

          if (feeRecord) {
            // Check teachers array (new multi-teacher format)
            if (Array.isArray(feeRecord.teachers) && feeRecord.teachers.length > 0) {
              const firstTeacher = feeRecord.teachers[0];
              if (firstTeacher.teacherId) {
                const teacher = allTeachers.find((t) => t._id.toString() === firstTeacher.teacherId.toString());
                if (teacher) {
                  teacherId = teacher._id;
                  teacherName = teacher.name;
                  resolutionMethod = `FeeRecord.teachers array`;
                }
              }
            }
            // Check legacy teacher field
            else if (feeRecord.teacher) {
              const teacher = allTeachers.find((t) => t._id.toString() === feeRecord.teacher.toString());
              if (teacher) {
                teacherId = teacher._id;
                teacherName = teacher.name;
                resolutionMethod = `FeeRecord.teacher (legacy)`;
              }
            }
          }
        }

        // Update transaction if teacherId was resolved
        if (teacherId) {
          await Transaction.findByIdAndUpdate(tx._id, {
            $set: {
              "splitDetails.teacherId": teacherId,
              ...(teacherName && !tx.splitDetails?.teacherName
                ? { "splitDetails.teacherName": teacherName }
                : {}),
            },
          });
          console.log(`   ✅ ${txInfo} → teacherId: ${teacherId} (${resolutionMethod})`);
          updated++;
        } else {
          // For Academy Share transactions, this is OK (they go to Owner/Partner, not regular teacher)
          if (tx.category === "Academy Share") {
            console.log(`   ℹ️  ${txInfo} - No teacherId (Academy Share - OK)`);
            skipped++;
          } else {
            console.log(`   ⚠️  ${txInfo} - Could not resolve teacherId`);
            failed++;
          }
        }
      } catch (error) {
        console.error(`   ❌ ${txInfo} - Error: ${error.message}`);
        failed++;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Summary Report
    // ═══════════════════════════════════════════════════════════════
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("📊 MIGRATION COMPLETE");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`✅ Updated: ${updated}`);
    console.log(`⚠️  Failed to resolve: ${failed}`);
    console.log(`ℹ️  Skipped (Academy Share): ${skipped}`);
    console.log(`📊 Total processed: ${transactionsToMigrate.length}`);
    console.log("═══════════════════════════════════════════════════════════════\n");

    await mongoose.connection.close();
    console.log("✅ Database connection closed\n");
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  migrateTransactionSplitDetails()
    .then(() => {
      console.log("🎉 Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}

module.exports = migrateTransactionSplitDetails;
