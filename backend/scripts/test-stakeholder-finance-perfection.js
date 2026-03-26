const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Student = require("../models/Student");
const FeeRecord = require("../models/FeeRecord");
const DailyRevenue = require("../models/DailyRevenue");
const Configuration = require("../models/Configuration");
const { collectFee } = require("../controllers/studentController");

async function runExtensiveTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/edwardianDB");
    console.log("✅ MongoDB Connected");

    // --- CLEANUP TEST DATA ---
    await User.deleteMany({ username: { $in: ["waqar_owner", "zahid_partner", "saud_partner"] } });
    await Teacher.deleteMany({ name: { $in: ["Sir Waqar Baig", "Dr. Zahid Khan", "Regular Teacher John"] } });
    await Class.deleteMany({ classTitle: "Stakeholder Teaching Test" });
    await Student.deleteMany({ studentName: "Rich Student" });

    // --- SETUP STAKEHOLDERS ---
    const waqar = new User({ 
      fullName: "Sir Waqar Baig", 
      role: "OWNER", 
      username: "waqar_owner",
      userId: "TEST-WAQAR",
      password: "password123" // required by model
    });
    await waqar.save();

    const zahid = new User({ 
      fullName: "Dr. Zahid Khan", 
      role: "PARTNER", 
      username: "zahid_partner",
      userId: "TEST-ZAHID",
      password: "password123"
    });
    await zahid.save();

    const saud = new User({ 
      fullName: "Sir Shah Saud", 
      role: "PARTNER", 
      username: "saud_partner",
      userId: "TEST-SAUD",
      password: "password123"
    });
    await saud.save();

    // Link Stakeholders to Teacher accounts (to simulate them teaching)
    const tWaqar = new Teacher({ 
      name: waqar.fullName, 
      role: "OWNER", 
      userId: waqar._id, 
      status: "active", 
      phone: "03001",
      subject: "Chemistry",
      compensation: { type: "percentage", teacherShare: 100, academyShare: 0 }
    });
    await tWaqar.save();
    waqar.teacherId = tWaqar._id;
    await waqar.save();

    const tZahid = new Teacher({ 
      name: zahid.fullName, 
      role: "PARTNER", 
      userId: zahid._id, 
      status: "active", 
      phone: "03002",
      subject: "Biology",
      compensation: { type: "percentage", teacherShare: 100, academyShare: 0 }
    });
    await tZahid.save();
    zahid.teacherId = tZahid._id;
    await zahid.save();

    // Create a Regular Teacher
    const tJohn = new Teacher({ 
      name: "Regular Teacher John", 
      role: "TEACHER", 
      status: "active", 
      phone: "03003",
      subject: "English",
      compensation: { type: "percentage", teacherShare: 70, academyShare: 30 } 
    });
    await tJohn.save();

    // --- SETUP CONFIGURATION ---
    let config = await Configuration.findOne();
    if (!config) config = new Configuration();
    config.academyShareSplit = [
      { userId: waqar._id, fullName: waqar.fullName, role: "OWNER", percentage: 50 },
      { userId: zahid._id, fullName: zahid.fullName, role: "PARTNER", percentage: 30 },
      { userId: saud._id, fullName: saud.fullName, role: "PARTNER", percentage: 20 }
    ];
    await config.save();

    // --- SETUP MIXED CLASS ---
    // Subject 1: Chemistry (Waqar - Owner) -> 25,000 PKR (100% to Waqar)
    // Subject 2: Biology (Zahid - Partner) -> 15,000 PKR (100% to Zahid)
    // Subject 3: English (John - Regular) -> 10,000 PKR (70% to John, 30% to Academy Pool)
    const testClass = await Class.findOneAndUpdate(
      { classTitle: "Stakeholder Teaching Test" },
      {
        classId: "TEST-CLASS-001",
        classTitle: "Stakeholder Teaching Test",
        gradeLevel: "12th",
        status: "active",
        subjects: [
          { name: "Chemistry", fee: 25000 },
          { name: "Biology", fee: 15000 },
          { name: "English", fee: 10000 }
        ],
        subjectTeachers: [
          { subject: "Chemistry", teacherId: tWaqar._id, teacherName: tWaqar.name },
          { subject: "Biology", teacherId: tZahid._id, teacherName: tZahid.name },
          { subject: "English", teacherId: tJohn._id, teacherName: tJohn.name }
        ],
        baseFee: 50000
      },
      { upsert: true, new: true }
    );

    // --- ENROLL STUDENT ---
    const student = new Student({
      studentName: "Rich Student",
      fatherName: "Billionaire",
      parentCell: "03009999999",
      group: "Science",
      classRef: testClass._id,
      class: testClass.classTitle,
      totalFee: 50000,
      paidAmount: 0,
      subjects: testClass.subjects.map(s => ({
        name: s.name,
        fee: s.fee,
        teacherId: testClass.subjectTeachers.find(st => st.subject === s.name).teacherId,
        teacherName: testClass.subjectTeachers.find(st => st.subject === s.name).teacherName
      }))
    });
    await student.save();

    console.log("\n--- TEST SCENARIO: MIXED TEACHING (OWNER + PARTNER + REGULAR) ---");
    console.log("Total Fee: 50,000 PKR");
    console.log("1. Chemistry (Owner Waqar): 25,000 -> Should get 25,000 directly");
    console.log("2. Biology (Partner Zahid): 15,000 -> Should get 15,000 directly");
    console.log("3. English (Regular John): 10,000 -> John gets 7,000; Academy Pool gets 3,000");
    console.log("   Academy Pool (3,000) Split: Waqar(50%)=1,500, Zahid(30%)=900, Saud(20%)=600");
    console.log("\n--- EXPECTED TOTALS ---");
    console.log("Waqar: 25,000 (Direct) + 1,500 (Pool) = 26,500");
    console.log("Zahid: 15,000 (Direct) + 900 (Pool) = 15,900");
    console.log("Saud: 600 (Pool) = 600");
    console.log("John: 7,000");

    // --- COLLECT FEE ---
    const req = {
      params: { id: student._id },
      body: { amount: 50000, month: "April 2026", paymentMethod: "CASH" },
      user: waqar
    };
    const res = {
      status: () => ({ json: (d) => d }),
      json: (d) => d
    };

    await collectFee(req, res);

    // --- VERIFY RESULTS ---
    console.log("\n--- ACTUAL RESULTS FROM DB ---");
    
    const drWaqar = await DailyRevenue.find({ partner: waqar._id });
    const waqarDirect = drWaqar.filter(e => e.revenueType === "TUITION_SHARE").reduce((s, e) => s + e.amount, 0);
    const waqarPool = drWaqar.filter(e => e.revenueType === "ACADEMY_SHARE").reduce((s, e) => s + e.amount, 0);
    console.log(`Waqar Actual: ${waqarDirect} (Direct) + ${waqarPool} (Pool) = ${waqarDirect + waqarPool}`);
    
    // Verify descriptions
    const directEntry = drWaqar.find(e => e.revenueType === "TUITION_SHARE");
    const academyEntry = drWaqar.find(e => e.revenueType === "ACADEMY_SHARE");
    console.log(`Direct Entry Description: "${directEntry?.description}"`);
    console.log(`Academy Entry Description: "${academyEntry?.description}"`);

    const drZahid = await DailyRevenue.find({ partner: zahid._id });
    const zahidDirect = drZahid.filter(e => e.revenueType === "TUITION_SHARE").reduce((s, e) => s + e.amount, 0);
    const zahidPool = drZahid.filter(e => e.revenueType === "ACADEMY_SHARE").reduce((s, e) => s + e.amount, 0);
    console.log(`Zahid Actual: ${zahidDirect} (Direct) + ${zahidPool} (Pool) = ${zahidDirect + zahidPool}`);

    const drSaud = await DailyRevenue.find({ partner: saud._id });
    const saudPool = drSaud.filter(e => e.revenueType === "ACADEMY_SHARE").reduce((s, e) => s + e.amount, 0);
    console.log(`Saud Actual: ${saudPool} (Pool)`);

    const teacherJohn = await Teacher.findById(tJohn._id);
    console.log(`John Actual: ${teacherJohn.balance.floating} (Floating Balance)`);

    // --- FINAL ASSERTIONS ---
    let success = true;
    if (waqarDirect !== 25000 || waqarPool !== 1500) success = false;
    if (zahidDirect !== 15000 || zahidPool !== 900) success = false;
    if (saudPool !== 600) success = false;
    if (teacherJohn.balance.floating !== 7000) success = false;

    if (success) {
      console.log("\n✅ PERFECTION ACHIEVED! All stakeholders and teachers received exact amounts.");
      console.log("✅ Metadata Verification: 'TUITION_SHARE' correctly labels direct earnings.");
      console.log("✅ Metadata Verification: 'ACADEMY_SHARE' correctly labels pool distributions.");
    } else {
      console.error("\n❌ DISCREPANCY DETECTED!");
    }

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("\n❌ TEST CRASHED:", error);
    process.exit(1);
  }
}

runExtensiveTest();
