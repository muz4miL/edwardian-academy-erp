const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load Environment Variables
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");
const Teacher = require("../models/Teacher");

const createOwnerTeacher = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");

    // Owner credentials
    const ownerCredentials = {
      username: "owner",
      password: "Owner@2024",
      fullName: "Academy Owner",
      phone: "03001234567",
      subject: "administration"
    };

    // Check if OWNER user already exists
    let ownerUser = await User.findOne({ role: "OWNER" });

    if (ownerUser) {
      console.log("⚠️  OWNER user already exists, updating...");
      // Update password (will be hashed by pre-save hook)
      ownerUser.username = ownerCredentials.username;
      ownerUser.password = ownerCredentials.password;
      ownerUser.fullName = ownerCredentials.fullName;
      ownerUser.phone = ownerCredentials.phone;
      ownerUser.isActive = true;
      ownerUser.canBeDeleted = false;
      await ownerUser.save();
    } else {
      // Create new OWNER user
      ownerUser = await User.create({
        userId: "OWNER-001",
        username: ownerCredentials.username,
        password: ownerCredentials.password,
        fullName: ownerCredentials.fullName,
        role: "OWNER",
        phone: ownerCredentials.phone,
        isActive: true,
        canBeDeleted: false,
        totalCash: 0,
        walletBalance: { floating: 0, verified: 0 },
        permissions: [
          "dashboard", "admissions", "students", "teachers", "finance",
          "classes", "timetable", "sessions", "configuration", "users",
          "website", "payroll", "settlement", "gatekeeper", "frontdesk",
          "inquiries", "reports", "lectures"
        ]
      });
      console.log("✅ OWNER user created");
    }

    // Check if Teacher record exists for this owner
    let ownerTeacher = await Teacher.findOne({ userId: ownerUser._id });

    if (ownerTeacher) {
      console.log("⚠️  Owner Teacher record already exists, updating...");
      ownerTeacher.name = ownerCredentials.fullName;
      ownerTeacher.phone = ownerCredentials.phone;
      ownerTeacher.subject = ownerCredentials.subject;
      ownerTeacher.status = "active";
      ownerTeacher.role = "OWNER";
      ownerTeacher.username = ownerCredentials.username;
      ownerTeacher.plainPassword = ownerCredentials.password;
      ownerTeacher.compensation = {
        type: "percentage",
        teacherShare: 100,
        academyShare: 0
      };
      await ownerTeacher.save();
    } else {
      // Create Teacher record linked to Owner
      ownerTeacher = await Teacher.create({
        name: ownerCredentials.fullName,
        phone: ownerCredentials.phone,
        subject: ownerCredentials.subject,
        status: "active",
        role: "OWNER",
        userId: ownerUser._id,
        username: ownerCredentials.username,
        plainPassword: ownerCredentials.password,
        balance: { floating: 0, verified: 0, pending: 0 },
        totalPaid: 0,
        compensation: {
          type: "percentage",
          teacherShare: 100,
          academyShare: 0
        }
      });
      console.log("✅ Owner Teacher record created");

      // Link teacher to user
      ownerUser.teacherId = ownerTeacher._id;
      await ownerUser.save();
      console.log("✅ User-Teacher linkage established");
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 OWNER ACCOUNT READY!");
    console.log("=".repeat(50));
    console.log("\n📋 LOGIN CREDENTIALS:");
    console.log("-".repeat(30));
    console.log(`   Username: ${ownerCredentials.username}`);
    console.log(`   Password: ${ownerCredentials.password}`);
    console.log("-".repeat(30));
    console.log(`\n👤 Full Name: ${ownerCredentials.fullName}`);
    console.log(`📱 Phone: ${ownerCredentials.phone}`);
    console.log(`🔑 Role: OWNER (Full Access)`);
    console.log("=".repeat(50) + "\n");

    await mongoose.disconnect();
    console.log("✅ Database disconnected");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createOwnerTeacher();
