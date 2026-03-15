/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  EDWARDIAN ACADEMY — MEGA SEED SCRIPT                       ║
 * ║  Populates the ENTIRE system with realistic demo data        ║
 * ║  Run: node mega-seed.js                                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  WARNING: This will WIPE all existing data and recreate from scratch.
 *  Only run this on a development/demo database.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

// ─── Models ──────────────────────────────────────────────
const User = require("./models/User");
const Student = require("./models/Student");
const Teacher = require("./models/Teacher");
const Class = require("./models/Class");
const Session = require("./models/Session");
const Attendance = require("./models/Attendance");
const FeeRecord = require("./models/FeeRecord");
const FinanceRecord = require("./models/FinanceRecord");
const Expense = require("./models/Expense");
const Exam = require("./models/Exam");
const ExamResult = require("./models/ExamResult");
const Lead = require("./models/Lead");
const Lecture = require("./models/Lecture");
const Configuration = require("./models/Configuration");
const Settings = require("./models/Settings");
const DailyClosing = require("./models/DailyClosing");
const DailyRevenue = require("./models/DailyRevenue");
const Inventory = require("./models/Inventory");
const Notification = require("./models/Notification");
const Settlement = require("./models/Settlement");
const TeacherPayment = require("./models/TeacherPayment");
const PayoutRequest = require("./models/PayoutRequest");
const Transaction = require("./models/Transaction");
const Timetable = require("./models/Timetable");

// ─── Helpers ─────────────────────────────────────────────
const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const padNum = (n, len = 3) => String(n).padStart(len, "0");

// ─── Realistic Pakistani Names ───────────────────────────
const MALE_FIRST = ["Ahmed", "Muhammad", "Ali", "Hassan", "Hamza", "Usman", "Bilal", "Tariq", "Zain", "Saad", "Omar", "Faisal", "Imran", "Kashif", "Danish", "Arslan", "Fahad", "Sohail", "Kamran", "Naveed", "Adeel", "Waqas", "Atif", "Rehan", "Junaid", "Shoaib", "Asad", "Irfan", "Rizwan", "Nadeem", "Shahzad", "Mohsin", "Yasir", "Sajid", "Sameer", "Talha", "Usama", "Haris", "Ubaid", "Mujtaba"];
const FEMALE_FIRST = ["Ayesha", "Fatima", "Zainab", "Amna", "Hira", "Sana", "Nadia", "Rabia", "Maham", "Iqra", "Bushra", "Saima", "Nimra", "Maryam", "Khadija", "Alina", "Mehak", "Laiba", "Anaya", "Farah"];
const FATHER_NAMES = ["Muhammad Khalid", "Abdul Rehman", "Muhammad Ashraf", "Zahoor Ahmed", "Noor Muhammad", "Muhammad Iqbal", "Abdul Basit", "Shah Nawaz", "Gul Zaman", "Muhammad Idrees", "Fazal Karim", "Sher Alam", "Muhammad Nawaz", "Habib Ullah", "Zia Ullah", "Sajjad Ahmed", "Khurram Shahzad", "Riaz Ahmed", "Qamar Din", "Mian Javed", "Hashim Khan", "Akbar Ali", "Sultan Muhammad", "Mehmood Ahmed", "Arif Hussain", "Babar Khan", "Pervaiz Akhtar", "Zulfiqar Ali", "Ghulam Mustafa", "Tariq Mehmood"];
const PHONE_PREFIX = ["0300", "0301", "0302", "0311", "0312", "0313", "0321", "0322", "0331", "0332", "0333", "0345", "0346"];
const AREAS = ["University Town", "Hayatabad Phase 1", "Hayatabad Phase 2", "Hayatabad Phase 3", "Hayatabad Phase 5", "Hayatabad Phase 7", "Saddar", "Cantonment", "Dabgari Garden", "Board Bazaar", "GT Road Peshawar", "Ring Road", "Warsak Road", "Charsadda Road", "Kohat Road", "Gulbahar", "Faqirabad", "Shami Road", "Bara Gate", "Tehkal"];

const genPhone = () => `${randomPick(PHONE_PREFIX)}${randomBetween(1000000, 9999999)}`;
const genEmail = (name) => `${name.toLowerCase().replace(/\s+/g, ".")}${randomBetween(1, 99)}@gmail.com`;

// ─── Subject Data ────────────────────────────────────────
const MEDICAL_SUBJECTS = [
  { name: "Biology", fee: 4000 },
  { name: "Chemistry", fee: 3500 },
  { name: "Physics", fee: 3500 },
  { name: "English", fee: 2500 },
];
const ENGINEERING_SUBJECTS = [
  { name: "Mathematics", fee: 4000 },
  { name: "Chemistry", fee: 3500 },
  { name: "Physics", fee: 3500 },
  { name: "English", fee: 2500 },
];
const CS_SUBJECTS = [
  { name: "Computer Science", fee: 4000 },
  { name: "Mathematics", fee: 3500 },
  { name: "Physics", fee: 3500 },
  { name: "English", fee: 2500 },
];
const MDCAT_SUBJECTS = [
  { name: "Biology", fee: 5000 },
  { name: "Chemistry", fee: 5000 },
  { name: "Physics", fee: 5000 },
  { name: "English", fee: 3000 },
];

// ─── Main Seed ───────────────────────────────────────────
async function megaSeed() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  🚀 EDWARDIAN ACADEMY — MEGA SEED        ║");
  console.log("╚══════════════════════════════════════════╝\n");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB Connected\n");

  // ━━━ STEP 1: WIPE ALL COLLECTIONS ━━━
  console.log("🧹 Wiping all collections...");
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Teacher.deleteMany({}),
    Class.deleteMany({}),
    Session.deleteMany({}),
    Attendance.deleteMany({}),
    FeeRecord.deleteMany({}),
    FinanceRecord.deleteMany({}),
    Expense.deleteMany({}),
    Exam.deleteMany({}),
    ExamResult.deleteMany({}),
    Lead.deleteMany({}),
    Lecture.deleteMany({}),
    Configuration.deleteMany({}),
    Settings.deleteMany({}),
    DailyClosing.deleteMany({}),
    DailyRevenue.deleteMany({}),
    Inventory.deleteMany({}),
    Notification.deleteMany({}),
    Settlement.deleteMany({}),
    TeacherPayment.deleteMany({}),
    PayoutRequest.deleteMany({}),
    Transaction.deleteMany({}),
    Timetable.deleteMany({}),
  ]);
  console.log("  ✓ All collections wiped\n");

  // ━━━ STEP 2: USERS ━━━
  console.log("👥 Creating Users...");
  const waqar = await User.create({
    userId: "OWNER-001", username: "waqar", fullName: "Sir Waqar Baig",
    password: "admin123", role: "OWNER", phone: "03001234567",
    email: "waqar@edwardianacademy.pk", totalCash: 0,
    permissions: ["dashboard","admissions","students","teachers","finance","classes","timetable","sessions","configuration","users","website","payroll","settlement","gatekeeper","frontdesk","inquiries","reports","lectures"],
  });
  const zahid = await User.create({
    userId: "PARTNER-001", username: "zahid", fullName: "Dr. Zahid Khan",
    password: "admin123", role: "PARTNER", phone: "03009876543",
    email: "zahid@edwardianacademy.pk", totalCash: 0,
    permissions: ["dashboard","students","teachers","finance","classes","reports","lectures"],
  });
  const saud = await User.create({
    userId: "PARTNER-002", username: "saud", fullName: "Sir Shah Saud",
    password: "admin123", role: "PARTNER", phone: "03215556677",
    email: "saud@edwardianacademy.pk", totalCash: 0,
    permissions: ["dashboard","students","teachers","finance","classes","reports"],
  });
  const staff1 = await User.create({
    userId: "STAFF-001", username: "frontdesk", fullName: "Asad Ali (Front Desk)",
    password: "admin123", role: "STAFF", phone: "03331112233",
    permissions: ["dashboard","admissions","frontdesk","students","inquiries","gatekeeper","finance"],
  });
  const staff2 = await User.create({
    userId: "STAFF-002", username: "accounts", fullName: "Bilal Ahmed (Accounts)",
    password: "admin123", role: "STAFF", phone: "03451234567",
    permissions: ["dashboard","finance","reports","payroll"],
  });
  console.log("  ✓ 5 users created (waqar/admin123, zahid/admin123, saud/admin123, frontdesk/admin123, accounts/admin123)\n");

  // ━━━ STEP 3: SESSION ━━━
  console.log("📅 Creating Session...");
  const session = await Session.create({
    sessionName: "Academic Year 2025-2026",
    description: "Main academic session running from June 2025 to March 2026",
    startDate: new Date("2025-06-01"),
    endDate: new Date("2026-03-31"),
    status: "active",
  });
  console.log(`  ✓ Session: ${session.sessionName} (${session.sessionId})\n`);

  // ━━━ STEP 4: CONFIGURATION ━━━
  console.log("⚙️  Creating Configuration...");
  await Configuration.create({
    academyName: "Edwardian Academy",
    academyAddress: "Main University Road, Peshawar, KPK, Pakistan",
    academyPhone: "091-5701234",
    salaryConfig: { teacherShare: 70, academyShare: 30 },
    partner100Rule: true,
    expenseSplit: { waqar: 40, zahid: 30, saud: 30 },
    tuitionPoolSplit: { waqar: 50, zahid: 30, saud: 20 },
    eteaPoolSplit: { waqar: 40, zahid: 30, saud: 30 },
    poolDistribution: { waqar: 50, zahid: 30, saud: 20 },
    partnerIds: { waqar: waqar._id, zahid: zahid._id, saud: saud._id },
    eteaConfig: { perStudentCommission: 3000, englishFixedSalary: 80000 },
    defaultSubjectFees: [
      { name: "Biology", fee: 4000 }, { name: "Chemistry", fee: 3500 },
      { name: "Physics", fee: 3500 }, { name: "Mathematics", fee: 4000 },
      { name: "English", fee: 2500 }, { name: "Computer Science", fee: 4000 },
    ],
    sessionPrices: [{ sessionId: session._id, sessionName: session.sessionName, price: 15000 }],
  });
  console.log("  ✓ Configuration seeded\n");

  // ━━━ STEP 5: SETTINGS ━━━
  console.log("🔧 Creating Settings...");
  await Settings.create({
    academyName: "Edwardian Academy",
    contactEmail: "info@edwardianacademy.pk",
    contactPhone: "+92 91 5701234",
    currency: "PKR",
    defaultCompensationMode: "percentage",
    defaultTeacherShare: 70,
    defaultAcademyShare: 30,
    defaultLateFee: 500,
    feeDueDay: "10",
    expenseSplit: { waqar: 40, zahid: 30, saud: 30 },
    defaultSubjectFees: [
      { name: "Biology", fee: 4000 }, { name: "Chemistry", fee: 3500 },
      { name: "Physics", fee: 3500 }, { name: "Mathematics", fee: 4000 },
      { name: "English", fee: 2500 }, { name: "Computer Science", fee: 4000 },
    ],
  });
  console.log("  ✓ Settings seeded\n");

  // ━━━ STEP 6: TEACHERS ━━━
  console.log("👨‍🏫 Creating Teachers...");
  const teacherData = [
    { name: "Prof. Abdullah Shah",    phone: "03001112233", subject: "biology",     comp: { type: "percentage", teacherShare: 70, academyShare: 30 } },
    { name: "Dr. Farooq Ahmed",       phone: "03119876543", subject: "chemistry",   comp: { type: "percentage", teacherShare: 70, academyShare: 30 } },
    { name: "Sir Kamran Afridi",      phone: "03211234567", subject: "physics",     comp: { type: "percentage", teacherShare: 70, academyShare: 30 } },
    { name: "Prof. Sadia Noor",       phone: "03331234567", subject: "mathematics", comp: { type: "percentage", teacherShare: 70, academyShare: 30 } },
    { name: "Ms. Sarah Khan",         phone: "03451234567", subject: "english",     comp: { type: "fixed", fixedSalary: 80000 } },
    { name: "Sir Hamza Durrani",      phone: "03009998877", subject: "physics",     comp: { type: "percentage", teacherShare: 65, academyShare: 35 } },
    { name: "Dr. Asma Bibi",          phone: "03121234567", subject: "biology",     comp: { type: "percentage", teacherShare: 70, academyShare: 30 } },
    { name: "Sir Imtiaz Ali",         phone: "03461234567", subject: "computer science", comp: { type: "percentage", teacherShare: 70, academyShare: 30 } },
    { name: "Madam Nazia Gul",        phone: "03021234567", subject: "chemistry",   comp: { type: "hybrid", baseSalary: 30000, profitShare: 40 } },
    { name: "Prof. Akbar Zaman",      phone: "03321234567", subject: "mathematics", comp: { type: "percentage", teacherShare: 75, academyShare: 25 } },
  ];

  const teachers = [];
  const teacherUsers = [];
  for (let i = 0; i < teacherData.length; i++) {
    const td = teacherData[i];
    const teacher = await Teacher.create({
      name: td.name, phone: td.phone, subject: td.subject,
      joiningDate: new Date("2025-06-01"), status: "active",
      compensation: td.comp,
    });
    const tUser = await User.create({
      userId: `TEACHER-${padNum(i + 1)}`,
      username: td.name.split(" ").pop().toLowerCase() + (i + 1),
      fullName: td.name, password: "teacher123", role: "TEACHER",
      phone: td.phone, teacherId: teacher._id,
      permissions: ["dashboard", "lectures"],
    });
    teacher.userId = tUser._id;
    teacher.username = tUser.username;
    await teacher.save();
    teachers.push(teacher);
    teacherUsers.push(tUser);
  }
  // Link Partner Saud to a Physics teacher record (partners who also teach)
  const saudTeacher = await Teacher.create({
    name: "Sir Shah Saud", phone: "03215556677", subject: "physics",
    joiningDate: new Date("2025-06-01"), status: "active",
    compensation: { type: "percentage", teacherShare: 70, academyShare: 30 },
    balance: { floating: 18500, verified: 42000, pending: 8500 },
    totalPaid: 165000,
    userId: saud._id, username: "saud",
  });
  saud.teacherId = saudTeacher._id;
  await saud.save();
  teachers.push(saudTeacher);

  // Link Partner Zahid to a Chemistry teacher record
  const zahidTeacher = await Teacher.create({
    name: "Dr. Zahid Khan", phone: "03009876543", subject: "chemistry",
    joiningDate: new Date("2025-06-01"), status: "active",
    compensation: { type: "percentage", teacherShare: 70, academyShare: 30 },
    balance: { floating: 12000, verified: 35000, pending: 5000 },
    totalPaid: 140000,
    userId: zahid._id, username: "zahid",
  });
  zahid.teacherId = zahidTeacher._id;
  await zahid.save();
  teachers.push(zahidTeacher);

  // Give some teachers balances for earnings display
  for (let i = 0; i < Math.min(5, teachers.length - 2); i++) {
    teachers[i].balance = {
      floating: randomBetween(5000, 25000),
      verified: randomBetween(20000, 60000),
      pending: randomBetween(2000, 15000),
    };
    teachers[i].totalPaid = randomBetween(80000, 200000);
    await teachers[i].save();
  }

  console.log(`  \u2713 ${teachers.length} teachers created (password: teacher123)`);
  console.log(`  \u2713 Partners Saud & Zahid linked to teacher records\n`);

  // ━━━ STEP 7: CLASSES ━━━
  console.log("🏫 Creating Classes...");
  const classConfigs = [
    { title: "11th Pre-Medical Morning", grade: "11th Grade", group: "Pre-Medical", shift: "Morning", session: "regular", subjects: MEDICAL_SUBJECTS, teacher: 0, room: "A-101", days: ["Mon","Tue","Wed","Thu","Fri","Sat"], start: "08:00", end: "12:00", cap: 35 },
    { title: "11th Pre-Medical Evening", grade: "11th Grade", group: "Pre-Medical", shift: "Evening", session: "regular", subjects: MEDICAL_SUBJECTS, teacher: 6, room: "A-102", days: ["Mon","Tue","Wed","Thu","Fri","Sat"], start: "14:00", end: "18:00", cap: 30 },
    { title: "11th Pre-Engineering",     grade: "11th Grade", group: "Pre-Engineering", shift: "Morning", session: "regular", subjects: ENGINEERING_SUBJECTS, teacher: 2, room: "B-201", days: ["Mon","Tue","Wed","Thu","Fri","Sat"], start: "08:00", end: "12:00", cap: 35 },
    { title: "12th Pre-Medical",         grade: "12th Grade", group: "Pre-Medical", shift: "Morning", session: "regular", subjects: MEDICAL_SUBJECTS, teacher: 0, room: "A-201", days: ["Mon","Tue","Wed","Thu","Fri","Sat"], start: "08:00", end: "13:00", cap: 40 },
    { title: "12th Pre-Engineering",     grade: "12th Grade", group: "Pre-Engineering", shift: "Morning", session: "regular", subjects: ENGINEERING_SUBJECTS, teacher: 2, room: "B-202", days: ["Mon","Tue","Wed","Thu","Fri","Sat"], start: "08:00", end: "13:00", cap: 40 },
    { title: "12th Computer Science",    grade: "12th Grade", group: "Computer Science", shift: "Evening", session: "regular", subjects: CS_SUBJECTS, teacher: 7, room: "C-301", days: ["Mon","Tue","Wed","Thu","Fri"], start: "14:00", end: "18:00", cap: 25 },
    { title: "MDCAT Prep Batch A",       grade: "MDCAT Prep", group: "Pre-Medical", shift: "Batch A", session: "mdcat", subjects: MDCAT_SUBJECTS, teacher: 0, room: "D-401", days: ["Mon","Tue","Wed","Thu","Fri","Sat"], start: "08:00", end: "14:00", cap: 50 },
    { title: "MDCAT Prep Batch B",       grade: "MDCAT Prep", group: "Pre-Medical", shift: "Batch B", session: "mdcat", subjects: MDCAT_SUBJECTS, teacher: 6, room: "D-402", days: ["Mon","Tue","Wed","Thu","Fri","Sat"], start: "14:00", end: "20:00", cap: 50 },
    { title: "ECAT Prep",               grade: "ECAT Prep", group: "Pre-Engineering", shift: "Evening", session: "ecat", subjects: ENGINEERING_SUBJECTS, teacher: 5, room: "E-501", days: ["Mon","Wed","Fri","Sat"], start: "16:00", end: "20:00", cap: 35 },
    { title: "9th Grade Tuition",        grade: "9th Grade", group: "Pre-Medical", shift: "Evening", session: "regular", subjects: [{ name: "Biology", fee: 2500 }, { name: "Chemistry", fee: 2500 }, { name: "Physics", fee: 2500 }, { name: "Mathematics", fee: 2500 }], teacher: 1, room: "F-101", days: ["Mon","Wed","Fri"], start: "15:00", end: "18:00", cap: 30 },
    { title: "10th Grade Tuition",       grade: "10th Grade", group: "Pre-Engineering", shift: "Weekend", session: "regular", subjects: [{ name: "Physics", fee: 3000 }, { name: "Chemistry", fee: 3000 }, { name: "Mathematics", fee: 3000 }], teacher: 3, room: "F-102", days: ["Sat","Sun"], start: "09:00", end: "14:00", cap: 30 },
  ];

  const classes = [];
  for (const cc of classConfigs) {
    const subjectTeachers = cc.subjects.map((s) => {
      // Assign relevant teacher to each subject
      const relevantTeacher = teachers.find(t => t.subject === s.name.toLowerCase()) || teachers[cc.teacher];
      return { subject: s.name, teacherId: relevantTeacher._id, teacherName: relevantTeacher.name };
    });

    const cls = await Class.create({
      classTitle: cc.title, gradeLevel: cc.grade, group: cc.group,
      shift: cc.shift, session: session._id, sessionType: cc.session,
      days: cc.days, startTime: cc.start, endTime: cc.end,
      roomNumber: cc.room, maxCapacity: cc.cap, subjects: cc.subjects,
      assignedTeacher: teachers[cc.teacher]._id, teacherName: teachers[cc.teacher].name,
      subjectTeachers, baseFee: cc.subjects.reduce((s, x) => s + x.fee, 0), status: "active",
    });
    classes.push(cls);
  }
  console.log(`  ✓ ${classes.length} classes created\n`);

  // ━━━ STEP 8: STUDENTS — 120 students across all classes ━━━
  console.log("🎓 Creating Students (120)...");
  const studentsPerClass = [14, 10, 12, 16, 14, 8, 18, 12, 8, 4, 4]; // = 120
  const students = [];
  const allNames = [...MALE_FIRST, ...MALE_FIRST, ...FEMALE_FIRST]; // pool
  let nameIdx = 0;

  for (let ci = 0; ci < classes.length; ci++) {
    const cls = classes[ci];
    const count = studentsPerClass[ci];
    for (let si = 0; si < count; si++) {
      const firstName = allNames[nameIdx % allNames.length];
      const fatherName = FATHER_NAMES[nameIdx % FATHER_NAMES.length];
      const fullName = `${firstName} ${fatherName.split(" ").pop()}`;
      nameIdx++;

      const totalFee = cls.subjects.reduce((s, x) => s + x.fee, 0);
      // Realistic payment: 70% paid full, 20% partial, 10% pending
      const payRoll = Math.random();
      let paidAmount = 0;
      let feeStatus = "pending";
      if (payRoll < 0.70) {
        paidAmount = totalFee;
        feeStatus = "paid";
      } else if (payRoll < 0.90) {
        paidAmount = Math.round(totalFee * (0.3 + Math.random() * 0.5));
        feeStatus = "partial";
      } else {
        paidAmount = 0;
        feeStatus = "pending";
      }

      const statusRoll = Math.random();
      const studentStatus = statusRoll < 0.90 ? "Active" : statusRoll < 0.95 ? "Pending" : "Suspended";

      const student = await Student.create({
        studentName: fullName, fatherName,
        class: cls.classTitle, group: cls.group,
        subjects: cls.subjects,
        parentCell: genPhone(), studentCell: Math.random() > 0.4 ? genPhone() : undefined,
        email: Math.random() > 0.5 ? genEmail(fullName) : undefined,
        address: `House ${randomBetween(1, 500)}, Street ${randomBetween(1, 30)}, ${randomPick(AREAS)}, Peshawar`,
        totalFee, paidAmount, feeStatus, discountAmount: Math.random() < 0.15 ? randomBetween(500, 3000) : 0,
        studentStatus, status: studentStatus === "Active" ? "active" : "inactive",
        classRef: cls._id, sessionRef: session._id,
        assignedTeacher: cls.assignedTeacher, assignedTeacherName: cls.teacherName,
        admissionDate: randomDate(new Date("2025-06-01"), new Date("2025-09-15")),
        password: "student123", plainPassword: "student123",
      });

      // Generate barcode
      if (student.generateBarcodeId) {
        await student.generateBarcodeId();
        await student.save();
      }
      students.push(student);
    }
  }
  // Update enrolled counts on classes
  for (const cls of classes) {
    const count = students.filter(s => s.classRef?.toString() === cls._id.toString()).length;
    cls.enrolledCount = count;
    await cls.save();
  }
  console.log(`  ✓ ${students.length} students created (password: student123)\n`);

  // ━━━ STEP 9: FEE RECORDS ━━━
  console.log("💰 Creating Fee Records...");
  const months = ["July 2025", "August 2025", "September 2025", "October 2025", "November 2025", "December 2025", "January 2026", "February 2026", "March 2026"];
  let feeCount = 0;

  for (const student of students) {
    if (student.paidAmount <= 0) continue; // skip unpaid

    const cls = classes.find(c => c._id.toString() === student.classRef?.toString());
    if (!cls) continue;

    // Distribute paid amount across months
    let remaining = student.paidAmount;
    const monthlyFee = student.totalFee; // per month fee

    for (let mi = 0; mi < months.length && remaining > 0; mi++) {
      const thisPayment = Math.min(remaining, monthlyFee);
      const relevantTeacher = teachers.find(t => t.subject === (cls.subjects[0]?.name || "").toLowerCase()) || teachers[0];
      const teacherSharePct = relevantTeacher.compensation?.teacherShare || 70;
      const academySharePct = 100 - teacherSharePct;

      await FeeRecord.create({
        receiptNumber: `FEE-2026-${padNum(feeCount + 1, 5)}`,
        student: student._id, studentName: student.studentName,
        class: cls._id, className: cls.classTitle,
        subject: cls.subjects[0]?.name || "General",
        amount: thisPayment, month: months[mi], status: "PAID",
        collectedBy: randomPick([waqar._id, staff1._id, staff2._id]),
        collectedByName: randomPick(["Sir Waqar Baig", "Asad Ali (Front Desk)", "Bilal Ahmed (Accounts)"]),
        teacher: relevantTeacher._id, teacherName: relevantTeacher.name,
        isPartnerTeacher: false,
        splitBreakdown: {
          teacherShare: Math.round(thisPayment * teacherSharePct / 100),
          academyShare: Math.round(thisPayment * academySharePct / 100),
          teacherPercentage: teacherSharePct,
          academyPercentage: academySharePct,
        },
        paymentMethod: randomPick(["CASH", "CASH", "CASH", "BANK", "ONLINE"]),
      });
      remaining -= thisPayment;
      feeCount++;
      // Only create 1-3 monthly fee records per student for realism
      if (mi >= 2 && Math.random() > 0.5) break;
    }
  }
  console.log(`  ✓ ${feeCount} fee records created\n`);

  // ━━━ STEP 10: FINANCE RECORDS ━━━
  console.log("📊 Creating Finance Records...");
  let finCount = 0;
  const paidStudents = students.filter(s => s.paidAmount > 0);
  for (const student of paidStudents) {
    const receiptId = `REC-2026-${padNum(finCount + 1, 5)}`;
    await FinanceRecord.create({
      receiptId, studentId: student._id, studentName: student.studentName,
      studentClass: student.class, totalFee: student.totalFee,
      paidAmount: student.paidAmount, balance: Math.max(0, student.totalFee - student.paidAmount),
      status: student.feeStatus, paymentMethod: randomPick(["cash", "bank-transfer", "online"]),
      paymentDate: randomDate(new Date("2025-07-01"), new Date("2026-03-01")),
      description: `Fee payment for ${student.studentName}`,
      month: randomPick(["January", "February", "March"]), year: 2026,
    });
    finCount++;
  }
  console.log(`  ✓ ${finCount} finance records created\n`);

  // ━━━ Expense Data (shared between Transaction step and Expense step) ━━━
  const expenseItems = [
    { title: "Generator Diesel Fuel (Jan)", category: "Generator Fuel", amount: 25000, vendor: "Shell Petrol Station" },
    { title: "Generator Diesel Fuel (Feb)", category: "Generator Fuel", amount: 22000, vendor: "Shell Petrol Station" },
    { title: "Generator Diesel Fuel (Mar)", category: "Generator Fuel", amount: 28000, vendor: "Shell Petrol Station" },
    { title: "Electricity Bill January", category: "Electricity Bill", amount: 45000, vendor: "PESCO" },
    { title: "Electricity Bill February", category: "Electricity Bill", amount: 38000, vendor: "PESCO" },
    { title: "Electricity Bill March", category: "Electricity Bill", amount: 42000, vendor: "PESCO" },
    { title: "Tea, Milk & Refreshments (Jan)", category: "Staff Tea & Refreshments", amount: 8000, vendor: "Daily Mart" },
    { title: "Tea, Milk & Refreshments (Feb)", category: "Staff Tea & Refreshments", amount: 7500, vendor: "Daily Mart" },
    { title: "Tea, Milk & Refreshments (Mar)", category: "Staff Tea & Refreshments", amount: 9000, vendor: "Daily Mart" },
    { title: "Facebook & Instagram Ads Jan", category: "Marketing / Ads", amount: 15000, vendor: "Meta Ads" },
    { title: "Facebook & Instagram Ads Feb", category: "Marketing / Ads", amount: 20000, vendor: "Meta Ads" },
    { title: "Pamphlet Printing", category: "Marketing / Ads", amount: 12000, vendor: "Pak Print House" },
    { title: "Board Markers & Chalk", category: "Stationery", amount: 4500, vendor: "Scholar Stationers" },
    { title: "Exam Papers & Printing", category: "Stationery", amount: 8000, vendor: "Copy World" },
    { title: "Register Books (Attendance)", category: "Stationery", amount: 3000, vendor: "Scholar Stationers" },
    { title: "Building Rent Jan 2026", category: "Rent", amount: 150000, vendor: "Haji Gulab Khan (Landlord)" },
    { title: "Building Rent Feb 2026", category: "Rent", amount: 150000, vendor: "Haji Gulab Khan (Landlord)" },
    { title: "Building Rent Mar 2026", category: "Rent", amount: 150000, vendor: "Haji Gulab Khan (Landlord)" },
    { title: "Guard Salary Jan", category: "Salaries", amount: 25000, vendor: "Muhammad Gul (Guard)" },
    { title: "Guard Salary Feb", category: "Salaries", amount: 25000, vendor: "Muhammad Gul (Guard)" },
    { title: "Sweeper Salary Jan", category: "Salaries", amount: 18000, vendor: "Aslam (Sweeper)" },
    { title: "Sweeper Salary Feb", category: "Salaries", amount: 18000, vendor: "Aslam (Sweeper)" },
    { title: "Water Cooler Repair", category: "Utilities", amount: 5000, vendor: "Cool Repair Shop" },
    { title: "Whiteboard Purchase (3x)", category: "Equipment/Asset", amount: 18000, vendor: "Office Depot Peshawar" },
    { title: "CCTV Camera Installation", category: "Equipment/Asset", amount: 45000, vendor: "TechStar Security" },
    { title: "Projector Bulb Replacement", category: "Equipment/Asset", amount: 8000, vendor: "ProjectorPK" },
    { title: "Miscellaneous Petty Cash", category: "Misc", amount: 5000, vendor: "Various" },
    { title: "AC Service & Gas Refill", category: "Utilities", amount: 12000, vendor: "Cool Air Services" },
  ];

  // ━━━ STEP 10b: TRANSACTIONS (Revenue + Expenses) ━━━
  // This is the CORE model that powers Dashboard stats, Finance page, and all reports
  console.log("💎 Creating Transactions (INCOME + EXPENSE)...");
  let txnCount = 0;

  // Create INCOME transactions for each paid student — spread across months
  // Focus most revenue in current month (March 2026) for realistic dashboard
  for (const student of paidStudents) {
    const cls = classes.find(c => c._id.toString() === student.classRef?.toString());
    if (!cls) continue;

    const relevantTeacher = teachers.find(t => t.subject === (cls.subjects[0]?.name || "").toLowerCase()) || teachers[0];
    const teacherSharePct = relevantTeacher.compensation?.teacherShare || 70;
    const academySharePct = 100 - teacherSharePct;

    // Split payments: 40% in Jan, 30% in Feb, 30% in March for realistic monthly view
    const amounts = [
      { amount: Math.round(student.paidAmount * 0.4), monthStart: new Date("2026-01-05"), monthEnd: new Date("2026-01-28") },
      { amount: Math.round(student.paidAmount * 0.3), monthStart: new Date("2026-02-03"), monthEnd: new Date("2026-02-25") },
      { amount: student.paidAmount - Math.round(student.paidAmount * 0.4) - Math.round(student.paidAmount * 0.3), monthStart: new Date("2026-03-01"), monthEnd: new Date("2026-03-09") },
    ];

    for (const { amount: txnAmount, monthStart, monthEnd } of amounts) {
      if (txnAmount <= 0) continue;
      const txnDate = randomDate(monthStart, monthEnd);
      await Transaction.create({
        type: "INCOME",
        category: "Tuition",
        stream: "STAFF_TUITION",
        amount: txnAmount,
        description: `Fee payment: ${student.studentName} — ${cls.classTitle}`,
        collectedBy: randomPick([waqar._id, staff1._id, staff2._id]),
        status: "VERIFIED",
        splitDetails: {
          teacherShare: Math.round(txnAmount * teacherSharePct / 100),
          academyShare: Math.round(txnAmount * academySharePct / 100),
          teacherPercentage: teacherSharePct,
          academyPercentage: academySharePct,
          teacherId: relevantTeacher._id,
          teacherName: relevantTeacher.name,
          isPaid: true,
        },
        studentId: student._id,
        date: txnDate,
      });
      txnCount++;
    }
  }

  // NOTE: Expense-type transactions are NOT created here because the finance
  // controller uses getUnifiedExpenseTotal() which reads from BOTH the Transaction
  // and Expense models with deduplication. Expenses are seeded in the Expense model only.

  // Create a few Teacher Payout transactions (these show in finance ledger)
  for (const teacher of teachers.slice(0, 5)) {
    const payoutAmt = randomBetween(30000, 80000);
    await Transaction.create({
      type: "EXPENSE",
      category: "Teacher Payout",
      stream: "STAFF_TUITION",
      amount: payoutAmt,
      description: `Teacher Payout: ${teacher.name} (${teacher.subject})`,
      collectedBy: waqar._id,
      status: "VERIFIED",
      splitDetails: {
        teacherId: teacher._id,
        teacherName: teacher.name,
        isPaid: true,
      },
      date: randomDate(new Date("2026-02-25"), new Date("2026-03-09")),
    });
    txnCount++;

    // Also create LIABILITY/Credit transactions for teachers
    await Transaction.create({
      type: "LIABILITY",
      category: "Teacher Credit",
      stream: "STAFF_TUITION",
      amount: randomBetween(20000, 60000),
      description: `Teacher Credit: ${teacher.name} (${teacher.subject}) - payout`,
      collectedBy: waqar._id,
      status: "VERIFIED",
      splitDetails: {
        teacherId: teacher._id,
        teacherName: teacher.name,
      },
      date: randomDate(new Date("2026-02-25"), new Date("2026-03-09")),
    });
    txnCount++;
  }

  console.log(`  ✓ ${txnCount} transactions created (INCOME + EXPENSE + LIABILITY)\n`);

  // ━━━ STEP 11: EXPENSES ━━━
  console.log("💸 Creating Expenses...");

  const expenses = [];
  for (let i = 0; i < expenseItems.length; i++) {
    const ei = expenseItems[i];
    const expDate = randomDate(new Date("2026-01-01"), new Date("2026-03-10"));
    const exp = await Expense.create({
      title: ei.title, category: ei.category, amount: ei.amount,
      status: Math.random() < 0.85 ? "paid" : "pending",
      expenseDate: expDate,
      dueDate: new Date(expDate.getTime() + 15 * 86400000),
      paidDate: Math.random() < 0.85 ? expDate : null,
      vendorName: ei.vendor, description: ei.title,
      paidByType: randomPick(["ACADEMY_CASH", "WAQAR", "ZAHID", "SAUD"]),
      paidBy: randomPick([waqar._id, zahid._id, saud._id]),
      splitRatio: { waqar: 40, zahid: 30, saud: 30 },
      hasPartnerDebt: true,
      shares: [
        { partner: waqar._id, partnerName: "Sir Waqar Baig", partnerKey: "waqar", percentage: 40, amount: Math.round(ei.amount * 0.4), status: Math.random() < 0.7 ? "PAID" : "UNPAID" },
        { partner: zahid._id, partnerName: "Dr. Zahid Khan", partnerKey: "zahid", percentage: 30, amount: Math.round(ei.amount * 0.3), status: Math.random() < 0.7 ? "PAID" : "UNPAID" },
        { partner: saud._id, partnerName: "Sir Shah Saud", partnerKey: "saud", percentage: 30, amount: Math.round(ei.amount * 0.3), status: Math.random() < 0.7 ? "PAID" : "UNPAID" },
      ],
    });
    expenses.push(exp);
  }
  console.log(`  ✓ ${expenses.length} expenses created\n`);

  // ━━━ STEP 12: ATTENDANCE (last 30 days) ━━━
  console.log("📋 Creating Attendance Records (30 days)...");
  let attCount = 0;
  const activeStudents = students.filter(s => s.studentStatus === "Active");

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    // Skip Sundays
    if (d.getDay() === 0) continue;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    for (const student of activeStudents) {
      // 85% attendance rate
      if (Math.random() > 0.85) continue;

      const cls = classes.find(c => c._id.toString() === student.classRef?.toString());
      const hour = randomBetween(7, 9);
      const minute = randomBetween(0, 59);
      const checkIn = new Date(d);
      checkIn.setHours(hour, minute, 0, 0);

      const status = hour >= 9 ? "late" : "present";

      try {
        await Attendance.create({
          studentId: student._id,
          studentNumericId: student.studentId,
          studentName: student.studentName,
          class: student.class,
          classRef: student.classRef,
          group: student.group,
          type: "check-in",
          date: dateStr,
          timestamp: checkIn,
          checkInTime: checkIn,
          status,
          markedBy: randomPick(["Gatekeeper", "Gatekeeper", "Gatekeeper", "Admin"]),
          scanMethod: randomPick(["barcode", "barcode", "barcode", "manual"]),
          feeStatus: student.feeStatus,
          currentSession: cls ? {
            subject: cls.subjects[0]?.name || "General",
            teacher: cls.teacherName,
            startTime: cls.startTime,
            endTime: cls.endTime,
            room: cls.roomNumber,
          } : undefined,
        });
        attCount++;
      } catch (e) {
        // Skip duplicates silently
        if (e.code !== 11000) console.error(`  ⚠ Attendance error: ${e.message}`);
      }
    }
  }
  console.log(`  ✓ ${attCount} attendance records created\n`);

  // ━━━ STEP 13: LEADS / INQUIRIES ━━━
  console.log("📞 Creating Leads/Inquiries...");
  const leadNames = [
    "Umar Farooq", "Syed Ali Raza", "Noman Khan", "Haseeb Ahmed", "Zeeshan Malik",
    "Amir Hamza", "Qaiser Abbas", "Fawad Alam", "Shahid Iqbal", "Raees Khan",
    "Anum Tariq", "Sidra Batool", "Noman Shah", "Taimoor Rashid", "Wahab Riaz",
    "Rida Fatima", "Uzma Gul", "Qasim Ali", "Muneeb Ur Rehman", "Awais Shah",
    "Fakhar Zaman", "Babar Azam Jr", "Rizwan Akbar", "Shadab Khan", "Hasan Ali Khan",
  ];
  const leadStatuses = ["New", "New", "FollowUp", "FollowUp", "FollowUp", "Converted", "Converted", "Dead"];

  const leads = [];
  for (const ln of leadNames) {
    const status = randomPick(leadStatuses);
    const lead = await Lead.create({
      name: ln, phone: genPhone(),
      email: Math.random() > 0.5 ? genEmail(ln) : undefined,
      source: randomPick(["Walk-in", "Phone", "Referral", "Social Media", "Website"]),
      interest: randomPick(["MDCAT Prep", "11th Pre-Medical", "12th Pre-Engineering", "ECAT Prep", "9th Grade Tuition", "12th Computer Science", "11th Pre-Engineering"]),
      status,
      remarks: status === "Dead" ? "Not interested anymore" : status === "Converted" ? "Admitted successfully" : randomPick(["Will visit next week", "Comparing with other academies", "Asked about fee structure", "Father wants to discuss", "Interested in scholarship", ""]),
      lastContactDate: randomDate(new Date("2026-01-01"), new Date("2026-03-10")),
      nextFollowUp: status === "FollowUp" ? randomDate(new Date("2026-03-10"), new Date("2026-03-20")) : undefined,
      createdBy: randomPick([waqar._id, staff1._id]),
      convertedToStudent: status === "Converted" ? randomPick(students)._id : undefined,
    });
    leads.push(lead);
  }
  console.log(`  ✓ ${leads.length} leads created\n`);

  // ━━━ STEP 14: EXAMS ━━━
  console.log("📝 Creating Exams...");
  const examSubjects = ["Biology", "Chemistry", "Physics", "Mathematics", "English"];
  const exams = [];

  for (let ci = 0; ci < Math.min(6, classes.length); ci++) {
    const cls = classes[ci];
    for (let si = 0; si < Math.min(3, cls.subjects.length); si++) {
      const subj = cls.subjects[si];
      const startTime = randomDate(new Date("2026-01-15"), new Date("2026-03-05"));
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour

      const questions = [];
      for (let q = 0; q < 20; q++) {
        questions.push({
          questionText: `${subj.name} Question ${q + 1}: Sample question for ${cls.classTitle}?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctOptionIndex: randomBetween(0, 3),
        });
      }

      const exam = await Exam.create({
        title: `${subj.name} - ${cls.gradeLevel} Mid Term`,
        subject: subj.name, classRef: cls._id, className: cls.classTitle,
        createdBy: waqar._id, durationMinutes: 60,
        startTime, endTime, questions,
        status: endTime < new Date() ? "completed" : "published",
        showResultToStudent: endTime < new Date(),
        passingPercentage: 40,
      });
      exams.push(exam);
    }
  }
  console.log(`  ✓ ${exams.length} exams created\n`);

  // ━━━ STEP 15: EXAM RESULTS ━━━
  console.log("📄 Creating Exam Results...");
  let resultCount = 0;
  for (const exam of exams) {
    const classStudents = students.filter(s => s.classRef?.toString() === exam.classRef.toString());
    for (const student of classStudents) {
      if (Math.random() > 0.80) continue; // 80% attempt rate

      const totalMarks = exam.questions.length;
      const score = randomBetween(Math.floor(totalMarks * 0.2), totalMarks);
      const answers = [];
      for (let q = 0; q < totalMarks; q++) {
        answers.push(randomBetween(0, 3));
      }

      try {
        await ExamResult.create({
          studentRef: student._id, examRef: exam._id,
          answers, score, totalMarks,
          startedAt: exam.startTime,
          submittedAt: new Date(exam.startTime.getTime() + randomBetween(20, 55) * 60000),
          tabSwitchCount: randomBetween(0, 3),
          isFlagged: Math.random() < 0.05,
          flagReason: Math.random() < 0.05 ? "Multiple tab switches detected" : undefined,
          isAutoSubmitted: Math.random() < 0.1,
        });
        resultCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  console.log(`  ✓ ${resultCount} exam results created\n`);

  // ━━━ STEP 16: LECTURES ━━━
  console.log("🎬 Creating Lectures...");
  const youtubeIds = [
    "dQw4w9WgXcQ", "jNQXAC9IVRw", "kJQP7kiw5Fk", "3JZ_D3ELwOQ", "2Vv-BfVoq4g",
    "fJ9rUzIMcZQ", "YQHsXMglC9A", "RgKAFK5djSk", "JGwWNGJdvx8", "CevxZvSJLk8",
    "hT_nvWreIhg", "OPf0YbXqDm0", "lp-EO5I60KA", "09R8_2nJtjg", "pRpeEdMmmQ0",
  ];
  let lectureCount = 0;
  const lectureSubjects = ["Physics", "Chemistry", "Biology", "Mathematics", "English"];

  for (let ci = 0; ci < Math.min(6, classes.length); ci++) {
    const cls = classes[ci];
    for (const subj of cls.subjects) {
      if (!lectureSubjects.includes(subj.name)) continue;
      const relevantTeacher = teacherUsers.find(t => t.fullName.toLowerCase().includes(subj.name.toLowerCase())) || teacherUsers[ci % teacherUsers.length];

      for (let l = 1; l <= randomBetween(3, 6); l++) {
        const ytId = youtubeIds[lectureCount % youtubeIds.length];
        await Lecture.create({
          title: `${subj.name} — Chapter ${l}: Lecture ${l} (${cls.gradeLevel})`,
          youtubeUrl: `https://www.youtube.com/watch?v=${ytId}`,
          youtubeId: ytId,
          description: `Complete lecture on ${subj.name} Chapter ${l} for ${cls.classTitle} students.`,
          classRef: cls._id, teacherRef: relevantTeacher._id,
          gradeLevel: cls.gradeLevel, subject: subj.name,
          duration: `${randomBetween(30, 90)} min`,
          isLocked: Math.random() < 0.15,
          viewCount: randomBetween(5, 150),
          order: l,
        });
        lectureCount++;
      }
    }
  }
  console.log(`  ✓ ${lectureCount} lectures created\n`);

  // ━━━ STEP 16b: TIMETABLE ━━━
  console.log("📅 Creating Timetable Entries...");
  let ttCount = 0;
  const fullDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Build timetable from class configs — each subject gets a time slot per day
  for (const cls of classes) {
    const subjectTeachers = cls.subjectTeachers || [];
    const classDays = cls.days || ["Mon","Tue","Wed","Thu","Fri","Sat"];
    const dayMap = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
    const mappedDays = classDays.map(d => dayMap[d]).filter(Boolean);

    // Distribute subjects across days
    for (let di = 0; di < mappedDays.length; di++) {
      const day = mappedDays[di];
      const subj = subjectTeachers[di % subjectTeachers.length];
      if (!subj || !subj.teacherId) continue;

      // Calculate time slot (1.5-hour slots starting from class start time)
      const slotIdx = di % subjectTeachers.length;
      const baseHour = parseInt(cls.startTime?.split(":")[0] || "8");
      const startHour = baseHour + Math.floor(slotIdx * 1.5);
      const endHour = startHour + 1;
      const startMin = (slotIdx % 2 === 1) ? 30 : 0;
      const endMin = startMin + 30;

      const formatTime = (h, m) => {
        const period = h >= 12 ? "PM" : "AM";
        const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${String(hour12).padStart(2, "0")}:${String(m % 60).padStart(2, "0")} ${period}`;
      };

      try {
        await Timetable.create({
          classId: cls._id,
          teacherId: subj.teacherId,
          subject: subj.subject,
          day,
          startTime: formatTime(startHour, startMin),
          endTime: formatTime(endHour, endMin + 30),
          room: cls.roomNumber || "TBD",
          status: "active",
        });
        ttCount++;
      } catch (e) {
        if (e.code !== 11000) console.error(`  ⚠ Timetable error: ${e.message}`);
      }
    }
  }

  // Add specific timetable entries for Saud (Physics) on Mon/Wed/Thu
  const saudClasses = classes.filter(c => c.subjects.some(s => s.name === "Physics")).slice(0, 3);
  const saudDays = ["Monday", "Wednesday", "Thursday"];
  const saudTimes = [
    { start: "04:00 PM", end: "06:00 PM" },
    { start: "02:00 PM", end: "04:00 PM" },
    { start: "04:00 PM", end: "06:00 PM" },
  ];
  for (let i = 0; i < Math.min(saudClasses.length, saudDays.length); i++) {
    try {
      await Timetable.create({
        classId: saudClasses[i]._id,
        teacherId: saudTeacher._id,
        subject: "Physics",
        day: saudDays[i],
        startTime: saudTimes[i].start,
        endTime: saudTimes[i].end,
        room: saudClasses[i].roomNumber || "A-103",
        status: "active",
      });
      ttCount++;
    } catch (e) {
      if (e.code !== 11000) console.error(`  ⚠ Saud timetable error: ${e.message}`);
    }
  }

  // Add specific timetable entries for Zahid (Chemistry) on Tue/Thu/Sat
  const zahidClasses = classes.filter(c => c.subjects.some(s => s.name === "Chemistry")).slice(0, 3);
  const zahidDays = ["Tuesday", "Thursday", "Saturday"];
  const zahidTimes = [
    { start: "10:00 AM", end: "12:00 PM" },
    { start: "10:00 AM", end: "12:00 PM" },
    { start: "09:00 AM", end: "11:00 AM" },
  ];
  for (let i = 0; i < Math.min(zahidClasses.length, zahidDays.length); i++) {
    try {
      await Timetable.create({
        classId: zahidClasses[i]._id,
        teacherId: zahidTeacher._id,
        subject: "Chemistry",
        day: zahidDays[i],
        startTime: zahidTimes[i].start,
        endTime: zahidTimes[i].end,
        room: zahidClasses[i].roomNumber || "B-103",
        status: "active",
      });
      ttCount++;
    } catch (e) {
      if (e.code !== 11000) console.error(`  ⚠ Zahid timetable error: ${e.message}`);
    }
  }

  console.log(`  \u2713 ${ttCount} timetable entries created\n`);

  // ━━━ STEP 17: TEACHER PAYMENTS ━━━
  console.log("💵 Creating Teacher Payments...");
  let tpCount = 0;
  const payMonths = [
    { month: "January", year: 2026 }, { month: "February", year: 2026 },
  ];
  for (const teacher of teachers) {
    for (const pm of payMonths) {
      const salary = teacher.compensation?.fixedSalary || teacher.compensation?.baseSalary || randomBetween(40000, 120000);
      await TeacherPayment.create({
        teacherId: teacher._id, teacherName: teacher.name,
        subject: teacher.subject, amountPaid: salary,
        compensationType: teacher.compensation?.type || "percentage",
        month: pm.month, year: pm.year,
        sessionId: session._id, sessionName: session.sessionName,
        paymentDate: randomDate(new Date(`2026-${pm.month === "January" ? "01" : "02"}-25`), new Date(`2026-${pm.month === "January" ? "02" : "03"}-05`)),
        paymentMethod: randomPick(["cash", "bank-transfer"]),
        status: "paid", authorizedBy: "Sir Waqar Baig",
      });
      tpCount++;
    }
  }
  console.log(`  ✓ ${tpCount} teacher payments created\n`);

  // ━━━ STEP 18: PAYOUT REQUESTS ━━━
  console.log("📤 Creating Payout Requests...");
  const payoutTeachers = teachers.slice(0, 4);
  let prCount = 0;
  for (const teacher of payoutTeachers) {
    const statuses = ["APPROVED", "APPROVED", "PENDING", "REJECTED"];
    const st = randomPick(statuses);
    await PayoutRequest.create({
      teacherId: teacher._id, teacherName: teacher.name,
      amount: randomBetween(20000, 80000), status: st,
      requestDate: randomDate(new Date("2026-02-01"), new Date("2026-03-08")),
      approvedBy: st === "APPROVED" ? waqar._id : undefined,
      approvedAt: st === "APPROVED" ? new Date() : undefined,
      rejectedBy: st === "REJECTED" ? waqar._id : undefined,
      rejectedAt: st === "REJECTED" ? new Date() : undefined,
      rejectionReason: st === "REJECTED" ? "Insufficient verified balance" : undefined,
    });
    prCount++;
  }
  console.log(`  ✓ ${prCount} payout requests created\n`);

  // ━━━ STEP 19: DAILY CLOSINGS ━━━
  console.log("🔒 Creating Daily Closings...");
  let dcCount = 0;
  for (let dayOffset = 1; dayOffset <= 20; dayOffset++) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    if (d.getDay() === 0) continue; // skip Sunday
    await DailyClosing.create({
      closedBy: waqar._id, closedByName: "Sir Waqar Baig",
      date: d, totalAmount: randomBetween(15000, 85000),
      transactionCount: randomBetween(3, 15),
      status: "VERIFIED",
    });
    dcCount++;
  }
  console.log(`  ✓ ${dcCount} daily closings created\n`);

  // ━━━ STEP 20: DAILY REVENUE ━━━
  console.log("📈 Creating Daily Revenue...");
  let drCount = 0;
  const partners = [waqar, zahid, saud];
  for (let dayOffset = 0; dayOffset < 20; dayOffset++) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    if (d.getDay() === 0) continue;
    for (const partner of partners) {
      await DailyRevenue.create({
        partner: partner._id, date: d,
        amount: randomBetween(5000, 40000),
        source: randomPick(["TUITION", "TUITION", "ADMISSION"]),
        status: dayOffset > 3 ? "COLLECTED" : "UNCOLLECTED",
        collectedAt: dayOffset > 3 ? d : undefined,
      });
      drCount++;
    }
  }
  console.log(`  ✓ ${drCount} daily revenue entries created\n`);

  // ━━━ STEP 21: INVENTORY ━━━
  console.log("📦 Creating Inventory...");
  const inventoryItems = [
    { itemName: "Samsung 55\" Smart TV (Room A-101)", investorName: "Sir Waqar Baig", cost: 85000, rate: 15 },
    { itemName: "Samsung 55\" Smart TV (Room B-201)", investorName: "Sir Waqar Baig", cost: 85000, rate: 15 },
    { itemName: "BenQ Projector (Room D-401)", investorName: "Academy", cost: 120000, rate: 20 },
    { itemName: "BenQ Projector (Room D-402)", investorName: "Academy", cost: 120000, rate: 20 },
    { itemName: "Haier 1.5 Ton AC (Room A-101)", investorName: "Dr. Zahid Khan", cost: 95000, rate: 10 },
    { itemName: "Haier 1.5 Ton AC (Room A-102)", investorName: "Dr. Zahid Khan", cost: 95000, rate: 10 },
    { itemName: "Haier 1.5 Ton AC (Room B-201)", investorName: "Academy", cost: 95000, rate: 10 },
    { itemName: "Haier 1.5 Ton AC (Room A-201)", investorName: "Academy", cost: 95000, rate: 10 },
    { itemName: "Dell Laptop (Office)", investorName: "Sir Waqar Baig", cost: 180000, rate: 20 },
    { itemName: "HP LaserJet Printer", investorName: "Academy", cost: 45000, rate: 15 },
    { itemName: "Biometric Machine (Gate)", investorName: "Academy", cost: 35000, rate: 15 },
    { itemName: "CCTV System (8 Cameras)", investorName: "Sir Shah Saud", cost: 150000, rate: 10 },
    { itemName: "Generator 15 KVA", investorName: "Academy", cost: 450000, rate: 10 },
    { itemName: "Office Furniture Set", investorName: "Academy", cost: 120000, rate: 10 },
    { itemName: "Student Chairs (50 pcs)", investorName: "Academy", cost: 200000, rate: 10 },
    { itemName: "Whiteboards (10 pcs)", investorName: "Academy", cost: 60000, rate: 10 },
    { itemName: "Water Dispenser (3 pcs)", investorName: "Academy", cost: 36000, rate: 15 },
    { itemName: "UPS System (5 KVA)", investorName: "Dr. Zahid Khan", cost: 85000, rate: 15 },
  ];
  for (const item of inventoryItems) {
    await Inventory.create({
      itemName: item.itemName, investorName: item.investorName,
      purchaseDate: randomDate(new Date("2025-05-01"), new Date("2025-08-01")),
      originalCost: item.cost, depreciationRate: item.rate,
    });
  }
  console.log(`  ✓ ${inventoryItems.length} inventory items created\n`);

  // ━━━ STEP 22: SETTLEMENTS ━━━
  console.log("🤝 Creating Settlements...");
  let settCount = 0;
  for (let i = 0; i < 10; i++) {
    const partner = randomPick([zahid, saud]);
    await Settlement.create({
      partnerId: partner._id, partnerName: partner.fullName,
      amount: randomBetween(10000, 60000),
      date: randomDate(new Date("2026-01-01"), new Date("2026-03-08")),
      method: randomPick(["CASH", "BANK_TRANSFER"]),
      recordedBy: waqar._id,
      notes: randomPick(["Monthly expense settlement", "Generator fuel share", "Rent settlement", "Partial dues clearance"]),
      status: "COMPLETED",
    });
    settCount++;
  }
  console.log(`  ✓ ${settCount} settlements created\n`);

  // ━━━ STEP 22b: SYNC PARTNER DEBTS FROM ACTUAL UNPAID SHARES ━━━
  console.log("💰 Syncing partner expense debts...");
  for (const partner of [waqar, zahid, saud]) {
    const allExpenses = await Expense.find({ "shares.partner": partner._id });
    let totalUnpaid = 0;
    allExpenses.forEach(exp => {
      exp.shares.forEach(s => {
        if (s.partner?.toString() === partner._id.toString() && s.status === "UNPAID") {
          totalUnpaid += s.amount;
        }
      });
    });
    await User.findByIdAndUpdate(partner._id, {
      $set: { expenseDebt: totalUnpaid, debtToOwner: totalUnpaid },
    });
    console.log(`  ✓ ${partner.fullName}: PKR ${totalUnpaid.toLocaleString()} outstanding`);
  }
  console.log("");

  // ━━━ STEP 23: NOTIFICATIONS ━━━
  console.log("🔔 Creating Notifications...");
  const notifs = [
    { message: "New student Ahmed Khalid admitted to 11th Pre-Medical Morning", type: "SYSTEM" },
    { message: "Fee payment of PKR 13,500 received from Muhammad Ali", type: "FINANCE" },
    { message: "Teacher Prof. Abdullah Shah marked 28 students present today", type: "SYSTEM" },
    { message: "Monthly expense report ready for January 2026", type: "FINANCE" },
    { message: "Exam results published for Biology Mid Term - 12th Pre-Medical", type: "SYSTEM" },
    { message: "New inquiry from Umar Farooq — interested in MDCAT Prep", type: "SYSTEM" },
    { message: "PESCO electricity bill of PKR 45,000 recorded", type: "FINANCE" },
    { message: "Daily closing completed by Sir Waqar — PKR 65,000 vaulted", type: "FINANCE" },
    { message: "3 new lectures uploaded by Sir Kamran Afridi for Physics", type: "SYSTEM" },
    { message: "Payout request of PKR 50,000 approved for Prof. Abdullah Shah", type: "FINANCE" },
    { message: "Student Hamza Nawaz fee status changed to PARTIAL", type: "FINANCE" },
    { message: "MDCAT Prep Batch A enrollment reached 18 students", type: "SYSTEM" },
  ];
  for (const n of notifs) {
    await Notification.create({
      recipient: waqar._id, recipientRole: "OWNER",
      message: n.message, type: n.type,
      isRead: Math.random() < 0.6,
    });
  }
  // Some for partners too
  for (const partner of [zahid, saud]) {
    await Notification.create({
      recipient: partner._id, recipientRole: "PARTNER",
      message: "Your monthly revenue share has been calculated", type: "FINANCE", isRead: false,
    });
    await Notification.create({
      recipient: partner._id, recipientRole: "PARTNER",
      message: "Expense settlement pending your approval", type: "FINANCE", isRead: false,
    });
  }
  console.log(`  ✓ ${notifs.length + 4} notifications created\n`);

  // ━━━ FINAL SUMMARY ━━━
  const totalExpected = students.reduce((s, st) => s + st.totalFee, 0);
  const totalCollected = students.reduce((s, st) => s + st.paidAmount, 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  ✅ MEGA SEED COMPLETE — SUMMARY                     ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  Users:             5                                 ║`);
  console.log(`║  Teachers:          ${String(teachers.length).padEnd(37)}║`);
  console.log(`║  Sessions:          1                                 ║`);
  console.log(`║  Classes:           ${String(classes.length).padEnd(37)}║`);
  console.log(`║  Students:          ${String(students.length).padEnd(37)}║`);
  console.log(`║  Fee Records:       ${String(feeCount).padEnd(37)}║`);
  console.log(`║  Finance Records:   ${String(finCount).padEnd(37)}║`);
  console.log(`║  Transactions:      ${String(txnCount).padEnd(37)}║`);
  console.log(`║  Expenses:          ${String(expenses.length).padEnd(37)}║`);
  console.log(`║  Attendance:        ${String(attCount).padEnd(37)}║`);
  console.log(`║  Leads:             ${String(leads.length).padEnd(37)}║`);
  console.log(`║  Exams:             ${String(exams.length).padEnd(37)}║`);
  console.log(`║  Exam Results:      ${String(resultCount).padEnd(37)}║`);
  console.log(`║  Lectures:          ${String(lectureCount).padEnd(37)}║`);
  console.log(`║  Timetable:         ${String(ttCount).padEnd(37)}║`);
  console.log(`║  Teacher Payments:  ${String(tpCount).padEnd(37)}║`);
  console.log(`║  Payout Requests:   ${String(prCount).padEnd(37)}║`);
  console.log(`║  Daily Closings:    ${String(dcCount).padEnd(37)}║`);
  console.log(`║  Daily Revenue:     ${String(drCount).padEnd(37)}║`);
  console.log(`║  Inventory:         ${String(inventoryItems.length).padEnd(37)}║`);
  console.log(`║  Settlements:       ${String(settCount).padEnd(37)}║`);
  console.log(`║  Notifications:     ${String(notifs.length + 4).padEnd(37)}║`);
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  Fee Collection: PKR ${totalCollected.toLocaleString()} / ${totalExpected.toLocaleString()} = ${collectionRate}%`);
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  LOGIN CREDENTIALS:                                  ║");
  console.log("║  Admin:  waqar / admin123                            ║");
  console.log("║  Partner: zahid / admin123, saud / admin123          ║");
  console.log("║  Staff:  frontdesk / admin123, accounts / admin123   ║");
  console.log("║  Teachers: <lastname><n> / teacher123                ║");
  console.log("║  Students: <studentId> / student123                  ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  await mongoose.connection.close();
  console.log("🔌 MongoDB disconnected. Done!\n");
  process.exit(0);
}

megaSeed().catch((err) => {
  console.error("❌ SEED FAILED:", err);
  process.exit(1);
});
