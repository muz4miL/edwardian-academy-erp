/**
 * COMPREHENSIVE TEST: Create 3 classes with 3 different teacher compensation types,
 * enroll students, collect fees, and verify every penny of the split.
 * 
 * Run: node scripts/test-compensation-modes.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const BASE = "http://localhost:5001/api";
let TOKEN = "";
let OWNER = null;

// Track created entities for cleanup
const CREATED = { teachers: [], classes: [], students: [] };

async function api(method, path, body) {
  const headers = {
    "Content-Type": "application/json",
    Cookie: `authToken=${TOKEN}`,
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.substring(0, 500) }; }
  return { status: res.status, ok: res.ok, data: json };
}

function assert(condition, label, detail) {
  if (condition) {
    console.log(`  ✅ ${label}: ${detail || "OK"}`);
  } else {
    console.log(`  ❌ ${label}: ${detail || "FAILED"}`);
  }
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  COMPENSATION MODES — FULL PENNY-LEVEL VERIFICATION");
  console.log("=".repeat(70) + "\n");

  // Connect to DB and mint JWT
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require("../models/User");
  const Session = require("../models/Session");

  OWNER = await User.findOne({ role: "OWNER" }).lean();
  TOKEN = jwt.sign({ id: OWNER._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  console.log(`🔑 Logged in as ${OWNER.fullName} (${OWNER.role})\n`);

  // Find active session
  const session = await Session.findOne({ status: "active" }).lean();
  if (!session) {
    console.log("❌ No active session found. Create one first.");
    await mongoose.disconnect();
    return;
  }
  console.log(`📅 Session: ${session.sessionName}\n`);

  // ================================================================
  // STEP 1: Create 9 Test Teachers (3 per compensation type)
  // ================================================================
  console.log("━━━ STEP 1: Creating Test Teachers ━━━\n");

  const teacherDefs = [
    // Percentage teachers (70/30 split)
    { name: "Test Pct Teacher A", phone: "0300-1111111", subject: "physics", compensation: { type: "percentage", teacherShare: 70, academyShare: 30 } },
    { name: "Test Pct Teacher B", phone: "0300-1111112", subject: "chemistry", compensation: { type: "percentage", teacherShare: 60, academyShare: 40 } },
    { name: "Test Pct Teacher C", phone: "0300-1111113", subject: "biology", compensation: { type: "percentage", teacherShare: 80, academyShare: 20 } },
    // Fixed salary teachers
    { name: "Test Fixed Teacher A", phone: "0300-2222221", subject: "physics", compensation: { type: "fixed", fixedSalary: 30000 } },
    { name: "Test Fixed Teacher B", phone: "0300-2222222", subject: "chemistry", compensation: { type: "fixed", fixedSalary: 25000 } },
    { name: "Test Fixed Teacher C", phone: "0300-2222223", subject: "biology", compensation: { type: "fixed", fixedSalary: 20000 } },
    // Per-student teachers
    { name: "Test PerStudent Teacher A", phone: "0300-3333331", subject: "physics", compensation: { type: "perStudent", perStudentAmount: 500 } },
    { name: "Test PerStudent Teacher B", phone: "0300-3333332", subject: "chemistry", compensation: { type: "perStudent", perStudentAmount: 400 } },
    { name: "Test PerStudent Teacher C", phone: "0300-3333333", subject: "biology", compensation: { type: "perStudent", perStudentAmount: 300 } },
  ];

  const teacherIds = [];
  for (const td of teacherDefs) {
    const res = await api("POST", "/teachers", td);
    if (!res.ok) {
      console.log(`  ⚠️  Teacher "${td.name}" failed: ${res.data?.message}`);
      // Try to find existing
      const Teacher = require("../models/Teacher");
      const existing = await Teacher.findOne({ name: td.name }).lean();
      if (existing) {
        teacherIds.push(existing._id.toString());
        console.log(`  ℹ️  Using existing teacher: ${existing._id}`);
      }
      continue;
    }
    const id = res.data?.data?._id;
    teacherIds.push(id);
    CREATED.teachers.push(id);
    console.log(`  ✅ Created ${td.name} (${td.compensation.type}) → ${id}`);
  }

  // ================================================================
  // STEP 2: Create 3 Test Classes
  // ================================================================
  console.log("\n━━━ STEP 2: Creating Test Classes ━━━\n");

  const classDefs = [
    {
      classTitle: "TEST Percentage Class",
      gradeLevel: "11th Grade",
      group: "Pre-Medical",
      session: session._id,
      startTime: "09:00",
      endTime: "11:00",
      subjects: [
        { name: "Physics", fee: 3000 },
        { name: "Chemistry", fee: 3000 },
        { name: "Biology", fee: 4000 },
      ],
      subjectTeachers: [
        { subject: "Physics", teacherId: teacherIds[0], teacherName: "Test Pct Teacher A" },
        { subject: "Chemistry", teacherId: teacherIds[1], teacherName: "Test Pct Teacher B" },
        { subject: "Biology", teacherId: teacherIds[2], teacherName: "Test Pct Teacher C" },
      ],
    },
    {
      classTitle: "TEST Fixed Salary Class",
      gradeLevel: "11th Grade",
      group: "Pre-Engineering",
      session: session._id,
      startTime: "11:00",
      endTime: "13:00",
      subjects: [
        { name: "Physics", fee: 3000 },
        { name: "Chemistry", fee: 3000 },
        { name: "Biology", fee: 4000 },
      ],
      subjectTeachers: [
        { subject: "Physics", teacherId: teacherIds[3], teacherName: "Test Fixed Teacher A" },
        { subject: "Chemistry", teacherId: teacherIds[4], teacherName: "Test Fixed Teacher B" },
        { subject: "Biology", teacherId: teacherIds[5], teacherName: "Test Fixed Teacher C" },
      ],
    },
    {
      classTitle: "TEST PerStudent Class",
      gradeLevel: "11th Grade",
      group: "Pre-Medical",
      session: session._id,
      startTime: "13:00",
      endTime: "15:00",
      subjects: [
        { name: "Physics", fee: 3000 },
        { name: "Chemistry", fee: 3000 },
        { name: "Biology", fee: 4000 },
      ],
      subjectTeachers: [
        { subject: "Physics", teacherId: teacherIds[6], teacherName: "Test PerStudent Teacher A" },
        { subject: "Chemistry", teacherId: teacherIds[7], teacherName: "Test PerStudent Teacher B" },
        { subject: "Biology", teacherId: teacherIds[8], teacherName: "Test PerStudent Teacher C" },
      ],
    },
  ];

  const classIds = [];
  for (const cd of classDefs) {
    const res = await api("POST", "/classes", cd);
    if (!res.ok) {
      console.log(`  ⚠️  Class "${cd.classTitle}" failed: ${res.data?.message}`);
      const Class = require("../models/Class");
      const existing = await Class.findOne({ classTitle: cd.classTitle }).lean();
      if (existing) {
        classIds.push(existing._id.toString());
        console.log(`  ℹ️  Using existing class: ${existing._id}`);
      }
      continue;
    }
    const id = res.data?.data?._id;
    classIds.push(id);
    CREATED.classes.push(id);
    console.log(`  ✅ Created "${cd.classTitle}" → ${id}`);
  }

  // ================================================================
  // STEP 3: Enroll Students & Collect Fees
  // ================================================================
  console.log("\n━━━ STEP 3: Enrolling Students & Collecting Fees ━━━\n");

  const testFee = 10000; // PKR 10,000 total fee per student

  for (let i = 0; i < classDefs.length; i++) {
    if (!classIds[i]) continue;
    const cd = classDefs[i];
    const className = cd.classTitle;

    console.log(`\n  📚 ${className}:`);

    // Enroll student with full payment
    const studentData = {
      studentName: `Student_${className.replace(/\s/g, "_")}`,
      fatherName: "Test Father",
      class: className,
      group: cd.group,
      subjects: cd.subjects,
      parentCell: "0300-9999999",
      admissionDate: new Date().toISOString(),
      totalFee: testFee,
      paidAmount: testFee, // Full payment
      classRef: classIds[i],
      studentStatus: "Active",
    };

    const enrollRes = await api("POST", "/students", studentData);
    if (!enrollRes.ok) {
      console.log(`    ❌ Enrollment failed: ${enrollRes.data?.message}`);
      continue;
    }

    const studentId = enrollRes.data?.data?._id;
    CREATED.students.push(studentId);
    console.log(`    ✅ Enrolled ${enrollRes.data?.data?.studentId}, Paid: PKR ${enrollRes.data?.data?.paidAmount}`);

    // Get fee history to verify splits
    const feeRes = await api("GET", `/students/${studentId}/fee-history`);
    if (feeRes.ok && feeRes.data?.data?.length > 0) {
      const fr = feeRes.data.data[0];
      console.log(`    📊 Fee Record:`);
      console.log(`       Split: Teacher ${fr.splitBreakdown?.teacherShare || 0} / Academy ${fr.splitBreakdown?.academyShare || 0}`);
      
      if (fr.teachers?.length > 0) {
        for (const t of fr.teachers) {
          console.log(`       → ${t.teacherName} (${t.compensationType}): PKR ${t.teacherShare}`);
        }
      }
      
      if (fr.academyDistribution?.length > 0) {
        console.log(`       Academy Distribution:`);
        for (const ad of fr.academyDistribution) {
          console.log(`         → ${ad.fullName} (${ad.role}): PKR ${ad.amount} (${ad.percentage}%)`);
        }
      }

      // ──── PENNY-LEVEL VERIFICATION ────
      const teacherTotal = (fr.teachers || []).reduce((s, t) => s + (t.teacherShare || 0), 0);
      const academyTotal = (fr.academyDistribution || []).reduce((s, a) => s + (a.amount || 0), 0);
      const totalAccounted = teacherTotal + academyTotal;

      console.log(`    💰 Verification:`);
      console.log(`       Fee Paid: PKR ${fr.amount}`);
      console.log(`       Teacher Total: PKR ${teacherTotal}`);
      console.log(`       Academy Total: PKR ${academyTotal}`);
      console.log(`       Sum: PKR ${totalAccounted}`);
      assert(totalAccounted === fr.amount, "Every penny accounted", `${totalAccounted} === ${fr.amount}`);
    }
  }

  // ================================================================
  // STEP 4: Verify DailyRevenue (Floating) for Owner/Partners
  // ================================================================
  console.log("\n━━━ STEP 4: Verifying Floating Revenue ━━━\n");

  const floatingRes = await api("GET", "/finance/floating-amounts-detail");
  if (floatingRes.ok) {
    const summary = floatingRes.data?.data?.summary || [];
    for (const s of summary) {
      console.log(`  ${s.fullName} (${s.role}): PKR ${s.totalFloating} (${s.entryCount} entries)`);
      console.log(`    Tuition: ${s.tuitionShare}, Academy: ${s.academyShare}`);
    }
    console.log(`  Grand Total: PKR ${floatingRes.data?.data?.grand?.totalFloating}`);
  }

  // ================================================================
  // STEP 5: Verify Close Preview has details
  // ================================================================
  console.log("\n━━━ STEP 5: Close Preview ━━━\n");

  const previewRes = await api("GET", "/finance/close-preview");
  if (previewRes.ok) {
    const p = previewRes.data?.data;
    console.log(`  Net Closeable: PKR ${p?.netTotal}`);
    console.log(`  Tuition entries: ${p?.tuitionRevenue?.count}, Academy entries: ${p?.academyShareRevenue?.count}`);
    
    for (const item of (p?.tuitionRevenue?.items || []).slice(0, 3)) {
      console.log(`    → ${item.studentName} | ${item.className} | PKR ${item.amount}`);
    }
    for (const item of (p?.academyShareRevenue?.items || []).slice(0, 3)) {
      console.log(`    → ${item.studentName} | ${item.className} | PKR ${item.amount} (academy share)`);
    }
  }

  // ================================================================
  // STEP 6: Verify Teacher Payroll excludes Owner/Partner
  // ================================================================
  console.log("\n━━━ STEP 6: Teacher Payroll ━━━\n");

  const payrollRes = await api("GET", "/finance/teacher-payroll-report");
  if (payrollRes.ok) {
    const report = payrollRes.data?.data || [];
    const ownerPartner = report.filter(t => t.role === "OWNER" || t.role === "PARTNER");
    assert(ownerPartner.length === 0, "No Owner/Partner in payroll", `Found ${ownerPartner.length}`);
    
    // Check our test teachers
    for (const t of report) {
      if (t.name?.includes("Test")) {
        console.log(`  ${t.name} (${t.compensationType}): Owed PKR ${t.owedAmount}`);
      }
    }
  }

  // ================================================================
  // CLEANUP
  // ================================================================
  console.log("\n━━━ CLEANUP ━━━\n");

  for (const id of CREATED.students) {
    await api("DELETE", `/students/${id}`);
  }
  for (const id of CREATED.classes) {
    await api("DELETE", `/classes/${id}`);
  }
  for (const id of CREATED.teachers) {
    await api("DELETE", `/teachers/${id}`);
  }
  
  // Also clean up DailyRevenue entries for test students
  const DailyRevenue = require("../models/DailyRevenue");
  await DailyRevenue.deleteMany({
    studentName: { $regex: /^Student_TEST/ },
  });

  console.log(`  Cleaned up ${CREATED.students.length} students, ${CREATED.classes.length} classes, ${CREATED.teachers.length} teachers`);

  console.log("\n" + "=".repeat(70) + "\n");

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
