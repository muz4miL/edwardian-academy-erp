/**
 * ================================================================
 * GHOST PARTNER PURGE SCRIPT
 * ================================================================
 * One-time cleanup script to purge orphaned User records
 *
 * Scans:
 * - Users with role: 'PARTNER' or 'OWNER'
 * - Checks if each has a corresponding ACTIVE Teacher record
 * - Deletes or downgrades any User without an active Teacher
 * - Purges their IDs from Configuration splits
 *
 * Usage: node backend/scripts/purge-ghost-partners.js
 * ================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Configuration = require("../models/Configuration");

async function purgeGhostPartners() {
  try {
    console.log("🔍 Starting Ghost Partner Purge...\n");

    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database\n");

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Find all OWNER and PARTNER users
    // ═══════════════════════════════════════════════════════════════
    const allStakeholders = await User.find({
      role: { $in: ["OWNER", "PARTNER"] },
    }).lean();

    console.log(`📊 Found ${allStakeholders.length} stakeholder users (OWNER + PARTNER)\n`);

    const ghostUsers = [];
    const validUsers = [];
    const ownersWithoutTeacher = [];

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Validate each user against Teachers collection
    // ═══════════════════════════════════════════════════════════════
    for (const user of allStakeholders) {
      const userInfo = `${user.fullName} (${user._id}) - Role: ${user.role}`;

      if (!user.teacherId) {
        if (user.role === "OWNER") {
          // OWNER without teacherId is ALLOWED (Super Admin)
          console.log(`✅ VALID: ${userInfo} - OWNER without Teacher (Super Admin)`);
          validUsers.push(user);
          ownersWithoutTeacher.push(user);
        } else {
          // PARTNER without teacherId is GHOST
          console.log(`👻 GHOST: ${userInfo} - No teacherId`);
          ghostUsers.push({ user, reason: "No teacherId" });
        }
        continue;
      }

      // User has teacherId - check if Teacher exists and is Active
      const teacher = await Teacher.findById(user.teacherId);

      if (!teacher) {
        console.log(`👻 GHOST: ${userInfo} - Teacher not found (ID: ${user.teacherId})`);
        ghostUsers.push({ user, reason: "Teacher not found" });
        continue;
      }

      const teacherStatus = (teacher.status || "active").toLowerCase();
      if (teacherStatus !== "active") {
        console.log(`👻 GHOST: ${userInfo} - Teacher status is "${teacherStatus}" (not Active)`);
        ghostUsers.push({ user, reason: `Teacher status: ${teacherStatus}` });
        continue;
      }

      // Valid user with active teacher
      console.log(`✅ VALID: ${userInfo} - Active Teacher: ${teacher.name}`);
      validUsers.push(user);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Valid users: ${validUsers.length}`);
    console.log(`   👻 Ghost users: ${ghostUsers.length}`);
    console.log(`   🔓 Owners without Teacher: ${ownersWithoutTeacher.length}\n`);

    if (ghostUsers.length === 0) {
      console.log("🎉 No ghost users found! Database is clean.\n");
      await mongoose.connection.close();
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Delete ghost users
    // ═══════════════════════════════════════════════════════════════
    console.log("🗑️  Deleting ghost users...\n");

    const deletedUserIds = [];
    for (const { user, reason } of ghostUsers) {
      try {
        await User.findByIdAndDelete(user._id);
        deletedUserIds.push(user._id.toString());
        console.log(`   ✅ Deleted: ${user.fullName} (${user._id}) - ${reason}`);
      } catch (error) {
        console.error(`   ❌ Failed to delete ${user.fullName}: ${error.message}`);
      }
    }

    console.log(`\n✅ Deleted ${deletedUserIds.length} ghost users\n`);

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Purge deleted IDs from Configuration splits
    // ═══════════════════════════════════════════════════════════════
    console.log("🧹 Cleaning Configuration splits...\n");

    const config = await Configuration.findOne();
    if (!config) {
      console.log("⚠️  No Configuration found - skipping split cleanup\n");
      await mongoose.connection.close();
      return;
    }

    let configModified = false;

    // Clean expenseShares
    if (config.expenseShares && config.expenseShares.length > 0) {
      const originalLength = config.expenseShares.length;
      config.expenseShares = config.expenseShares.filter((s) => {
        const shouldKeep = !deletedUserIds.includes(s.userId?.toString());
        if (!shouldKeep) {
          console.log(`   🧹 Purging from expenseShares: ${s.fullName} (${s.userId})`);
          configModified = true;
        }
        return shouldKeep;
      });
      const removed = originalLength - config.expenseShares.length;
      if (removed > 0) {
        console.log(`   ✅ Removed ${removed} entries from expenseShares`);
      }
    }

    // Clean academyShareSplit
    if (config.academyShareSplit && config.academyShareSplit.length > 0) {
      const originalLength = config.academyShareSplit.length;
      config.academyShareSplit = config.academyShareSplit.filter((s) => {
        const shouldKeep = !deletedUserIds.includes(s.userId?.toString());
        if (!shouldKeep) {
          console.log(`   🧹 Purging from academyShareSplit: ${s.fullName} (${s.userId})`);
          configModified = true;
        }
        return shouldKeep;
      });
      const removed = originalLength - config.academyShareSplit.length;
      if (removed > 0) {
        console.log(`   ✅ Removed ${removed} entries from academyShareSplit`);
      }
    }

    // Auto-redistribute if needed
    if (configModified) {
      // Check if totals add up to 100%
      const expenseTotal = (config.expenseShares || []).reduce((sum, s) => sum + (s.percentage || 0), 0);
      const academyTotal = (config.academyShareSplit || []).reduce((sum, s) => sum + (s.percentage || 0), 0);

      if (expenseTotal !== 100 && config.expenseShares.length > 0) {
        console.log(`\n⚠️  Expense shares total: ${expenseTotal}% (not 100%) - auto-redistributing...`);
        const equalShare = Math.floor(100 / config.expenseShares.length);
        const remainder = 100 - equalShare * config.expenseShares.length;
        config.expenseShares.forEach((s, i) => {
          s.percentage = equalShare + (i === 0 ? remainder : 0);
        });
        console.log(`   ✅ Redistributed equally among ${config.expenseShares.length} users`);
      }

      if (academyTotal !== 100 && config.academyShareSplit.length > 0) {
        console.log(`\n⚠️  Academy shares total: ${academyTotal}% (not 100%) - auto-redistributing...`);
        const equalShare = Math.floor(100 / config.academyShareSplit.length);
        const remainder = 100 - equalShare * config.academyShareSplit.length;
        config.academyShareSplit.forEach((s, i) => {
          s.percentage = equalShare + (i === 0 ? remainder : 0);
        });
        console.log(`   ✅ Redistributed equally among ${config.academyShareSplit.length} users`);
      }

      // Handle single OWNER case - auto 100%
      if (config.academyShareSplit.length === 1 && config.academyShareSplit[0].role === "OWNER") {
        config.academyShareSplit[0].percentage = 100;
        console.log(`\n✅ Single OWNER detected - auto-assigned 100% share`);
      }

      await config.save();
      console.log("\n✅ Configuration splits cleaned and saved\n");
    } else {
      console.log("   ℹ️  No changes needed to Configuration splits\n");
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Summary Report
    // ═══════════════════════════════════════════════════════════════
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("📊 GHOST PURGE COMPLETE");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`✅ Valid stakeholders: ${validUsers.length}`);
    console.log(`🗑️  Deleted ghost users: ${deletedUserIds.length}`);
    console.log(`🧹 Configuration splits cleaned: ${configModified ? "Yes" : "No"}`);
    console.log("═══════════════════════════════════════════════════════════════\n");

    if (validUsers.length > 0) {
      console.log("✅ Remaining valid stakeholders:");
      for (const user of validUsers) {
        const teacherInfo = user.teacherId
          ? await Teacher.findById(user.teacherId).select("name status")
          : null;
        console.log(
          `   - ${user.fullName} (${user.role})${teacherInfo ? ` → Teacher: ${teacherInfo.name}` : " (Super Admin)"}`
        );
      }
      console.log("");
    }

    await mongoose.connection.close();
    console.log("✅ Database connection closed\n");
  } catch (error) {
    console.error("❌ Error during ghost purge:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  purgeGhostPartners()
    .then(() => {
      console.log("🎉 Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = purgeGhostPartners;
