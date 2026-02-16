const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");

// Load Environment Variables
dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected for Seeding"))
  .catch((err) => console.log(err));

const seedUsers = async () => {
  try {
    // 1. Wipe the current Users
    await User.deleteMany({});
    console.log("🧹 Old users cleared.");

    // NOTE: We are sending PLAIN TEXT passwords. 
    // The User.js model's "pre-save" hook will handle the encryption automatically.
    
    // 2. Create Sir Waqar (Owner)
    const waqar = await User.create({
      userId: "OWNER-001",
      username: "waqar",
      fullName: "Sir Waqar Baig",
      password: "admin123", // <--- SENT AS PLAIN TEXT
      role: "OWNER",
      totalCash: 0,
      walletBalance: { floating: 0, verified: 0 },
      permissions: ["dashboard", "admissions", "students", "finance", "teachers", "configuration"]
    });

    // 3. Create Sir Saud (Partner)
    const saud = await User.create({
      userId: "PARTNER-002",
      username: "saud",
      fullName: "Sir Shah Saud",
      password: "admin123", // <--- SENT AS PLAIN TEXT
      role: "PARTNER",
      totalCash: 0,
      walletBalance: { floating: 0, verified: 0 },
      permissions: ["dashboard", "admissions", "students", "finance"]
    });
    
     // 4. Create Sir Zahid (Partner)
    const zahid = await User.create({
      userId: "PARTNER-001",
      username: "zahid",
      fullName: "Dr. Zahid",
      password: "admin123", // <--- SENT AS PLAIN TEXT
      role: "PARTNER",
      totalCash: 0,
      walletBalance: { floating: 0, verified: 0 },
      permissions: ["dashboard", "admissions", "students", "finance"]
    });

    console.log("🎉 Users Created Successfully (Single Hashed)!");
    console.log("-----------------------------------------");
    console.log("👤 OWNER:   waqar / admin123");
    console.log("👤 PARTNER: saud  / admin123");
    console.log("-----------------------------------------");

    process.exit();
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    process.exit(1);
  }
};

seedUsers();