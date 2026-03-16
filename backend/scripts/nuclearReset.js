const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

// Import ALL models
const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Session = require("../models/Session");
const FeeRecord = require("../models/FeeRecord");
const FinanceRecord = require("../models/FinanceRecord");
const Transaction = require("../models/Transaction");
const DailyRevenue = require("../models/DailyRevenue");
const DailyClosing = require("../models/DailyClosing");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const TeacherPayment = require("../models/TeacherPayment");
const PayoutRequest = require("../models/PayoutRequest");
const Configuration = require("../models/Configuration");
const Settings = require("../models/Settings");
const Attendance = require("../models/Attendance");
const { Inventory, InventoryTransaction, MaintenanceLog } = require("../models/Inventory");
const Exam = require("../models/Exam");
const ExamResult = require("../models/ExamResult");
const Lecture = require("../models/Lecture");
const Video = require("../models/Video");
const Lead = require("../models/Lead");
const Notification = require("../models/Notification");
const Timetable = require("../models/Timetable");
const WebsiteConfig = require("../models/WebsiteConfig");

const nuclearReset = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    // ========================================
    // STEP 1: WIPE EVERY COLLECTION
    // ========================================
    console.log("STEP 1: WIPING ALL COLLECTIONS...\n");

    const collections = [
      { name: "Students", model: Student },
      { name: "Teachers", model: Teacher },
      { name: "Classes", model: Class },
      { name: "Sessions", model: Session },
      { name: "FeeRecords", model: FeeRecord },
      { name: "FinanceRecords", model: FinanceRecord },
      { name: "Transactions", model: Transaction },
      { name: "DailyRevenue", model: DailyRevenue },
      { name: "DailyClosing", model: DailyClosing },
      { name: "Expenses", model: Expense },
      { name: "Settlements", model: Settlement },
      { name: "TeacherPayments", model: TeacherPayment },
      { name: "PayoutRequests", model: PayoutRequest },
      { name: "Attendance", model: Attendance },
      { name: "Inventory", model: Inventory },
      { name: "InventoryTransactions", model: InventoryTransaction },
      { name: "MaintenanceLogs", model: MaintenanceLog },
      { name: "Exams", model: Exam },
      { name: "ExamResults", model: ExamResult },
      { name: "Lectures", model: Lecture },
      { name: "Videos", model: Video },
      { name: "Leads", model: Lead },
      { name: "Notifications", model: Notification },
      { name: "Timetables", model: Timetable },
      { name: "WebsiteConfig", model: WebsiteConfig },
      { name: "Settings", model: Settings },
      { name: "Configuration", model: Configuration },
      { name: "Users", model: User },
    ];

    for (const { name, model } of collections) {
      const result = await model.deleteMany({});
      console.log(`  Deleted ${result.deletedCount} ${name}`);
    }

    console.log("\n  ALL COLLECTIONS WIPED!\n");

    // ========================================
    // STEP 2: RE-SEED OWNER & PARTNERS
    // ========================================
    console.log("STEP 2: CREATING OWNER & PARTNERS...\n");

    const waqar = await User.create({
      userId: "OWNER-001",
      username: "waqar",
      fullName: "Sir Waqar Baig",
      password: "admin123",
      role: "OWNER",
      totalCash: 0,
      walletBalance: { floating: 0, verified: 0 },
      permissions: ["dashboard", "admissions", "students", "finance", "teachers", "configuration"],
    });
    console.log("  Created OWNER:   waqar / admin123");

    const saud = await User.create({
      userId: "PARTNER-002",
      username: "saud",
      fullName: "Sir Shah Saud",
      password: "admin123",
      role: "PARTNER",
      totalCash: 0,
      walletBalance: { floating: 0, verified: 0 },
      permissions: ["dashboard", "admissions", "students", "finance"],
    });
    console.log("  Created PARTNER: saud  / admin123");

    const zahid = await User.create({
      userId: "PARTNER-001",
      username: "zahid",
      fullName: "Dr. Zahid",
      password: "admin123",
      role: "PARTNER",
      totalCash: 0,
      walletBalance: { floating: 0, verified: 0 },
      permissions: ["dashboard", "admissions", "students", "finance"],
    });
    console.log("  Created PARTNER: zahid / admin123");

    // ========================================
    // STEP 3: RE-SEED CONFIGURATION
    // ========================================
    console.log("\nSTEP 3: CREATING DEFAULT CONFIGURATION...\n");

    await Configuration.create({
      academyName: "Edwardian Academy",
      address: "Peshawar, Pakistan",
      phone: "+92 300 1234567",
      teacherSharePercentage: 70,
      academySharePercentage: 30,
      partnerStructure: {
        type: "percentage",
        splits: {
          waqar: 50,
          zahid: 30,
          saud: 20,
        },
      },
      sessionPrices: [],
      expenseCategories: ["Utilities", "Rent", "Salaries", "Maintenance", "Tea/Entertainment"],
    });
    console.log("  Configuration created (70/30 split, partner splits 50/30/20)");

    // ========================================
    // STEP 4: CREATE STAFF USER FOR FEE COLLECTION
    // ========================================
    console.log("\nSTEP 4: CREATING STAFF USER...\n");

    await User.create({
      userId: "STAFF-001",
      username: "staff",
      fullName: "Reception Staff",
      password: "admin123",
      role: "STAFF",
      totalCash: 0,
      walletBalance: { floating: 0, verified: 0 },
      permissions: ["dashboard", "admissions", "students", "finance"],
    });
    console.log("  Created STAFF:   staff / admin123");

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n========================================");
    console.log("NUCLEAR RESET COMPLETE!");
    console.log("========================================");
    console.log("All data has been wiped.");
    console.log("Fresh users created:");
    console.log("  OWNER:   waqar / admin123");
    console.log("  PARTNER: saud  / admin123");
    console.log("  PARTNER: zahid / admin123");
    console.log("  STAFF:   staff / admin123");
    console.log("Config: 70/30 teacher/academy split, partners 50/30/20");
    console.log("========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Error during nuclear reset:", error);
    process.exit(1);
  }
};

nuclearReset();
