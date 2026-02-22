/**
 * ================================================================
 * LINK PARTNERS & OWNER AS TEACHERS
 * ================================================================
 * 
 * This script finds existing PARTNER/OWNER User accounts that 
 * don't have Teacher records, creates Teacher documents for them,
 * and links them bidirectionally (user.teacherId ↔ teacher.userId).
 * 
 * This makes them appear in the Teachers tab with their actual roles.
 * No data is deleted or lost.
 * 
 * Usage: node scripts/link-partners-as-teachers.js
 * ================================================================
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Teacher = require("../models/Teacher");

dotenv.config();

// Map of username → subject they teach
// Adjust these to match your actual academy setup
const PARTNER_SUBJECTS = {
  waqar: "chemistry",   // Sir Waqar teaches Chemistry
  zahid: "biology",     // Dr. Zahid teaches Biology
  saud: "physics",      // Sir Shah Saud teaches Physics
};

const linkPartnersAsTeachers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected\n");

    // Find all PARTNER and OWNER users who don't have a teacherId yet
    const users = await User.find({
      role: { $in: ["PARTNER", "OWNER"] },
      $or: [
        { teacherId: null },
        { teacherId: { $exists: false } },
      ],
    });

    if (users.length === 0) {
      console.log("✅ All PARTNER/OWNER users already have Teacher records. Nothing to do.");
      process.exit(0);
    }

    console.log(`Found ${users.length} PARTNER/OWNER user(s) without Teacher records:\n`);

    for (const user of users) {
      const subject = PARTNER_SUBJECTS[user.username] || "general";
      
      console.log(`👤 ${user.fullName} (@${user.username}) — ${user.role}`);
      console.log(`   Subject: ${subject}`);

      // Check if a Teacher already exists with this userId (safety check)
      const existingTeacher = await Teacher.findOne({ userId: user._id });
      if (existingTeacher) {
        console.log(`   ⚠️  Teacher record already exists (${existingTeacher._id}), just linking...`);
        user.teacherId = existingTeacher._id;
        await user.save();
        console.log(`   ✅ Linked user.teacherId → ${existingTeacher._id}\n`);
        continue;
      }

      // Create Teacher record
      const teacher = new Teacher({
        name: user.fullName,
        phone: user.phone || "N/A",
        subject: subject,
        joiningDate: user.createdAt || new Date(),
        status: "active",
        profileImage: user.profileImage || null,
        userId: user._id,
        username: user.username,
        plainPassword: "admin123", // Same as seed password
        compensation: {
          type: "percentage",
          teacherShare: 70,
          academyShare: 30,
        },
      });

      await teacher.save();
      console.log(`   ✅ Created Teacher record: ${teacher._id}`);

      // Link back to User
      user.teacherId = teacher._id;
      await user.save();
      console.log(`   ✅ Linked user.teacherId → ${teacher._id}\n`);
    }

    console.log("========================================");
    console.log("🎉 All PARTNER/OWNER users now have Teacher records!");
    console.log("   They will appear in the Teachers tab.");
    console.log("   They will see their timetable on the dashboard.");
    console.log("========================================");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

linkPartnersAsTeachers();
