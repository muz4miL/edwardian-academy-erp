/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  EDWARDIAN ACADEMY ERP — DATABASE RESET SCRIPT                          ║
 * ║  Completely resets the database to a clean state for production deploy  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   npm run db:reset           — Full reset with core users + config only
 *   npm run db:reset -- --demo — Full reset with demo data (for testing)
 *   npm run db:reset -- --dry  — Preview what would be deleted (no changes)
 *
 * WARNING: This script DELETES ALL DATA. Use with caution!
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// MODELS — Import all models for complete reset
// ═══════════════════════════════════════════════════════════════════════════
const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const FeeRecord = require("../models/FeeRecord");
const FinanceRecord = require("../models/FinanceRecord");
const Expense = require("../models/Expense");
const Exam = require("../models/Exam");
const ExamResult = require("../models/ExamResult");
const Lead = require("../models/Lead");
const Lecture = require("../models/Lecture");
const Configuration = require("../models/Configuration");
const Settings = require("../models/Settings");
const DailyClosing = require("../models/DailyClosing");
const DailyRevenue = require("../models/DailyRevenue");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const Settlement = require("../models/Settlement");
const TeacherPayment = require("../models/TeacherPayment");
const Transaction = require("../models/Transaction");
const PayoutRequest = require("../models/PayoutRequest");
const Timetable = require("../models/Timetable");
const Video = require("../models/Video");
const WebsiteConfig = require("../models/WebsiteConfig");

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CORE_USERS = [
  {
    userId: "OWNER-001",
    username: "waqar",
    fullName: "Sir Waqar Baig",
    password: "admin123",
    role: "OWNER",
    permissions: ["dashboard", "admissions", "students", "finance", "teachers", "configuration", "classes", "sessions", "timetable", "users", "website", "payroll", "settlement", "gatekeeper", "frontdesk", "inquiries", "reports", "lectures"],
    canBeDeleted: false,
  },
  {
    userId: "PARTNER-001",
    username: "zahid",
    fullName: "Dr. Zahid",
    password: "admin123",
    role: "PARTNER",
    permissions: ["dashboard", "admissions", "students", "finance", "settlement", "reports"],
    canBeDeleted: false,
  },
  {
    userId: "PARTNER-002",
    username: "saud",
    fullName: "Sir Shah Saud",
    password: "admin123",
    role: "PARTNER",
    permissions: ["dashboard", "admissions", "students", "finance", "settlement", "reports"],
    canBeDeleted: false,
  },
];

const DEFAULT_CONFIGURATION = {
  academyName: "Edwardian Academy",
  academyAddress: "Peshawar, Pakistan",
  academyPhone: "+92 300 1234567",
  academyOwner: "Sir Waqar Baig",

  // Teacher/Academy Split (for non-owner teachers)
  salaryConfig: {
    teacherShare: 70,
    academyShare: 30,
  },

  // Partner 100% Rule
  partner100Rule: true,

  // Expense Split (must total 100%)
  expenseSplit: {
    waqar: 40,
    zahid: 30,
    saud: 30,
  },

  // Tuition Pool Split (for Owner/Partner teaching - must total 100%)
  tuitionPoolSplit: {
    waqar: 50,
    zahid: 30,
    saud: 20,
  },

  // ETEA Pool Split (must total 100%)
  eteaPoolSplit: {
    waqar: 40,
    zahid: 30,
    saud: 30,
  },

  // Legacy pool distribution
  poolDistribution: {
    waqar: 50,
    zahid: 30,
    saud: 20,
  },

  // ETEA Config
  eteaConfig: {
    perStudentCommission: 3000,
    englishFixedSalary: 80000,
  },

  // Default Subject Fees (Peshawar Standard)
  defaultSubjectFees: [
    { name: "Biology", fee: 3000 },
    { name: "Physics", fee: 3000 },
    { name: "Chemistry", fee: 2500 },
    { name: "Mathematics", fee: 2500 },
    { name: "English", fee: 2000 },
    { name: "Urdu", fee: 1500 },
    { name: "Islamiat", fee: 1500 },
    { name: "Pakistan Studies", fee: 1500 },
    { name: "Computer Science", fee: 2500 },
  ],

  // Session Prices (will be populated when sessions are created)
  sessionPrices: [],

  // Precision for monetary calculations (0 = no decimals, PKR standard)
  precision: 0,
};

const DEFAULT_SESSIONS = [
  { name: "MDCAT 2026", status: "active", year: 2026, type: "MDCAT" },
  { name: "ECAT 2026", status: "active", year: 2026, type: "ECAT" },
  { name: "ETEA 2026", status: "active", year: 2026, type: "ETEA" },
  { name: "Class 9th 2026", status: "active", year: 2026, type: "Regular" },
  { name: "Class 10th 2026", status: "active", year: 2026, type: "Regular" },
  { name: "Class 11th 2026", status: "active", year: 2026, type: "Regular" },
  { name: "Class 12th 2026", status: "active", year: 2026, type: "Regular" },
];

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const log = {
  info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
  section: (msg) => console.log(`\n\x1b[35m═══ ${msg} ═══\x1b[0m`),
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RESET FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function resetDatabase(options = {}) {
  const { dryRun = false, includeDemo = false } = options;

  try {
    // Connect to MongoDB
    log.section("CONNECTING TO DATABASE");
    await mongoose.connect(process.env.MONGODB_URI);
    log.success("Connected to MongoDB");

    if (dryRun) {
      log.warn("DRY RUN MODE — No changes will be made");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: COUNT EXISTING DATA
    // ═══════════════════════════════════════════════════════════════════════
    log.section("ANALYZING CURRENT DATA");

    const counts = {
      users: await User.countDocuments(),
      students: await Student.countDocuments(),
      teachers: await Teacher.countDocuments(),
      classes: await Class.countDocuments(),
      sessions: await Session.countDocuments(),
      feeRecords: await FeeRecord.countDocuments(),
      transactions: await Transaction.countDocuments(),
      dailyRevenues: await DailyRevenue.countDocuments(),
      dailyClosings: await DailyClosing.countDocuments(),
      expenses: await Expense.countDocuments(),
      settlements: await Settlement.countDocuments(),
      teacherPayments: await TeacherPayment.countDocuments(),
      configurations: await Configuration.countDocuments(),
    };

    console.log("\nCurrent database contents:");
    Object.entries(counts).forEach(([key, count]) => {
      if (count > 0) console.log(`  • ${key}: ${count} documents`);
    });

    const totalDocs = Object.values(counts).reduce((a, b) => a + b, 0);
    log.info(`Total documents to be deleted: ${totalDocs}`);

    if (dryRun) {
      log.warn("DRY RUN — Exiting without making changes");
      await mongoose.disconnect();
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: DELETE ALL DATA
    // ═══════════════════════════════════════════════════════════════════════
    log.section("CLEARING ALL COLLECTIONS");

    // Order matters - delete dependent collections first
    await Promise.all([
      FeeRecord.deleteMany({}),
      Transaction.deleteMany({}),
      DailyRevenue.deleteMany({}),
      DailyClosing.deleteMany({}),
      Expense.deleteMany({}),
      Settlement.deleteMany({}),
      TeacherPayment.deleteMany({}),
      PayoutRequest.deleteMany({}),
      FinanceRecord.deleteMany({}),
      Attendance.deleteMany({}),
      ExamResult.deleteMany({}),
      Exam.deleteMany({}),
      Lecture.deleteMany({}),
      Notification.deleteMany({}),
      Lead.deleteMany({}),
      Inventory.deleteMany({}),
      Video.deleteMany({}),
      Timetable.deleteMany({}),
    ]);
    log.success("Cleared financial and dependent collections");

    await Promise.all([
      Student.deleteMany({}),
      Teacher.deleteMany({}),
      Class.deleteMany({}),
    ]);
    log.success("Cleared students, teachers, and classes");

    await Promise.all([
      Session.deleteMany({}),
      Configuration.deleteMany({}),
      Settings.deleteMany({}),
      WebsiteConfig.deleteMany({}),
      User.deleteMany({}),
    ]);
    log.success("Cleared sessions, configuration, and users");

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: CREATE CORE USERS
    // ═══════════════════════════════════════════════════════════════════════
    log.section("CREATING CORE USERS");

    const createdUsers = {};
    for (const userData of CORE_USERS) {
      const user = await User.create({
        ...userData,
        totalCash: 0,
        walletBalance: { floating: 0, verified: 0 },
        expenseDebt: 0,
        debtToOwner: 0,
      });
      createdUsers[userData.username] = user;
      log.success(`Created ${userData.role}: ${userData.username} (${userData.fullName})`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: CREATE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    log.section("CREATING CONFIGURATION");

    // Link partner IDs to configuration
    const config = await Configuration.create({
      ...DEFAULT_CONFIGURATION,
      partnerIds: {
        waqar: createdUsers.waqar._id,
        zahid: createdUsers.zahid._id,
        saud: createdUsers.saud._id,
      },
      // Dynamic academy share split (same as expense split for now)
      academyShareSplit: [
        { userId: createdUsers.waqar._id, fullName: "Sir Waqar Baig", role: "OWNER", percentage: 50 },
        { userId: createdUsers.zahid._id, fullName: "Dr. Zahid", role: "PARTNER", percentage: 30 },
        { userId: createdUsers.saud._id, fullName: "Sir Shah Saud", role: "PARTNER", percentage: 20 },
      ],
      // Dynamic expense shares
      expenseShares: [
        { userId: createdUsers.waqar._id, fullName: "Sir Waqar Baig", percentage: 40 },
        { userId: createdUsers.zahid._id, fullName: "Dr. Zahid", percentage: 30 },
        { userId: createdUsers.saud._id, fullName: "Sir Shah Saud", percentage: 30 },
      ],
    });
    log.success("Created academy configuration with partner links");

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: CREATE DEFAULT SESSIONS
    // ═══════════════════════════════════════════════════════════════════════
    log.section("CREATING SESSIONS");

    for (const sessionData of DEFAULT_SESSIONS) {
      await Session.create(sessionData);
      log.success(`Created session: ${sessionData.name}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: CREATE DEMO DATA (OPTIONAL)
    // ═══════════════════════════════════════════════════════════════════════
    if (includeDemo) {
      log.section("CREATING DEMO DATA");
      await createDemoData(createdUsers);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    log.section("RESET COMPLETE");
    console.log("\n🎉 Database has been reset to a clean state!\n");
    console.log("Login Credentials:");
    console.log("─────────────────────────────────────");
    CORE_USERS.forEach(user => {
      console.log(`  ${user.role.padEnd(8)} │ ${user.username.padEnd(10)} │ ${user.password}`);
    });
    console.log("─────────────────────────────────────\n");

    if (!includeDemo) {
      console.log("💡 Run with --demo flag to include sample data for testing:\n");
      console.log("   npm run db:reset -- --demo\n");
    }

    await mongoose.disconnect();
    log.success("Disconnected from MongoDB");

  } catch (error) {
    log.error(`Reset failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO DATA CREATION
// ═══════════════════════════════════════════════════════════════════════════

async function createDemoData(users) {
  // Create a few demo teachers
  const demoTeachers = [
    { name: "Mr. Ahmed Khan", subject: "Physics", phone: "03001234567" },
    { name: "Ms. Fatima Ali", subject: "Chemistry", phone: "03001234568" },
    { name: "Mr. Hassan Raza", subject: "Biology", phone: "03001234569" },
  ];

  for (const t of demoTeachers) {
    const teacher = await Teacher.create({
      teacherId: `TCH-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: t.name,
      phone: t.phone,
      subjects: [t.subject],
      status: "active",
      balance: { floating: 0, verified: 0, pending: 0 },
      totalEarnings: 0,
      totalWithdrawn: 0,
    });
    log.success(`Created demo teacher: ${t.name}`);
  }

  // Create a demo class
  const sessions = await Session.find({});
  if (sessions.length > 0) {
    const mdcatSession = sessions.find(s => s.name.includes("MDCAT")) || sessions[0];

    const demoClass = await Class.create({
      classId: "CLS-DEMO-001",
      name: "MDCAT Batch 2026 - A",
      session: mdcatSession._id,
      subjects: ["Biology", "Physics", "Chemistry", "English"],
      timing: "Morning (9 AM - 1 PM)",
      status: "active",
    });
    log.success(`Created demo class: ${demoClass.name}`);
  }

  log.success("Demo data created successfully");
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const options = {
  dryRun: args.includes("--dry"),
  includeDemo: args.includes("--demo"),
};

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║  EDWARDIAN ACADEMY ERP — DATABASE RESET                                   ║
╚═══════════════════════════════════════════════════════════════════════════╝

Usage:
  npm run db:reset              Full reset (core users + config only)
  npm run db:reset -- --demo    Full reset with demo data for testing
  npm run db:reset -- --dry     Preview what would be deleted (no changes)
  npm run db:reset -- --help    Show this help message

This script will:
  1. Delete ALL data from the database
  2. Create core users (Owner: waqar, Partners: zahid, saud)
  3. Create default configuration with proper splits
  4. Create default sessions (MDCAT, ECAT, ETEA, etc.)
  5. (Optional) Create demo data if --demo flag is used

⚠️  WARNING: This is a DESTRUCTIVE operation. All data will be lost!
`);
  process.exit(0);
}

resetDatabase(options);
