/**
 * COMPREHENSIVE FINANCE SYSTEM TEST
 * Connects directly to MongoDB to mint a JWT, then tests every finance endpoint.
 * 
 * Usage: node scripts/test-complete-finance.js
 * Requires: Backend running on port 5001
 */

require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const BASE = "http://localhost:5001/api";
let TOKEN = "";
let OWNER_USER = null;
let TEST_STUDENT_ID = null;
let TEST_CLASS = null;

const results = [];

function log(label, status, detail) {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : status === "SKIP" ? "⏭️" : "⚠️";
  console.log(`${icon} ${label}: ${detail || ""}`);
  results.push({ label, status, detail });
}

async function api(method, path, body) {
  const headers = {
    "Content-Type": "application/json",
    "Cookie": `authToken=${TOKEN}`,
  };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.substring(0, 300) }; }
  return { status: res.status, ok: res.ok, data: json };
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  EDWARDIAN ACADEMY — COMPREHENSIVE FINANCE SYSTEM TEST");
  console.log("=".repeat(70) + "\n");

  // ── Step 0: Connect to DB and mint JWT ──
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("📦 Connected to MongoDB\n");
  } catch (err) {
    console.error("❌ Cannot connect to MongoDB:", err.message);
    process.exit(1);
  }

  const User = require("../models/User");
  OWNER_USER = await User.findOne({ role: "OWNER" }).lean();

  if (!OWNER_USER) {
    console.log("❌ No OWNER user found in database. Cannot proceed.");
    await mongoose.disconnect();
    process.exit(1);
  }

  TOKEN = jwt.sign({ id: OWNER_USER._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  log("LOGIN", "PASS", `Minted JWT for ${OWNER_USER.fullName} (${OWNER_USER.role})`);

  // ── Test 1: Dashboard Stats ──
  {
    const res = await api("GET", "/finance/dashboard-stats");
    if (res.status === 403) {
      log("DASHBOARD_STATS", "FAIL", "403 Forbidden — permission issue");
    } else if (!res.ok) {
      log("DASHBOARD_STATS", "FAIL", `${res.status}: ${res.data?.message}`);
    } else {
      const d = res.data?.data;
      log("DASHBOARD_STATS", "PASS", `Students: ${d?.totalStudents}, Monthly: PKR ${d?.monthlyIncome}, Floating: PKR ${d?.floatingCash}`);
    }
  }

  // ── Test 2: Analytics Dashboard ──
  {
    const res = await api("GET", "/finance/analytics-dashboard");
    if (res.status === 403) {
      log("ANALYTICS_DASHBOARD", "FAIL", "403 Forbidden — role gate too strict");
    } else if (!res.ok) {
      log("ANALYTICS_DASHBOARD", "FAIL", `${res.status}: ${res.data?.message}`);
    } else {
      log("ANALYTICS_DASHBOARD", "PASS", "Accessible");
    }
  }

  // ── Test 3: Get Classes ──
  {
    const res = await api("GET", "/classes");
    const classes = res.data?.data || [];
    if (classes.length === 0) {
      log("GET_CLASSES", "WARN", "No classes in DB — enrollment test will be skipped");
    } else {
      // Pick a class with subjectTeachers if possible
      const withTeachers = classes.find(c => c.subjectTeachers?.length > 0);
      TEST_CLASS = withTeachers || classes[0];
      log("GET_CLASSES", "PASS", `Using: "${TEST_CLASS.classTitle}" — ${TEST_CLASS.subjectTeachers?.length || 0} subject-teachers, ${(TEST_CLASS.subjects || []).length} subjects`);
    }
  }

  // ── Test 4: Config ──
  {
    const res = await api("GET", "/config");
    if (!res.ok) {
      log("CONFIG", "WARN", `${res.status}: ${res.data?.message}`);
    } else {
      const config = res.data?.data;
      const subjects = config?.defaultSubjectFees || [];
      const split = config?.academyShareSplit || [];
      log("CONFIG", "PASS", `Subjects: ${subjects.length}, Academy split entries: ${split.length}`);
    }
  }

  // ── Test 5: Enroll Student ──
  if (TEST_CLASS) {
    const subjects = (TEST_CLASS.subjects || []).map(s =>
      typeof s === "string" ? { name: s, fee: 1000 } : { name: s.name || s.subject || "Test", fee: s.fee || 1000 }
    );
    if (subjects.length === 0) subjects.push({ name: "Chemistry", fee: 2500 }, { name: "Biology", fee: 2500 });

    const totalFee = subjects.reduce((sum, s) => sum + s.fee, 0) || 5000;
    const paidAmount = Math.round(totalFee * 0.6);

    const studentData = {
      studentName: `FinTest_${Date.now().toString(36)}`,
      fatherName: "Test Father",
      class: TEST_CLASS.classTitle || TEST_CLASS.className,
      group: TEST_CLASS.group || "Pre-Medical",
      subjects,
      parentCell: "0300-1234567",
      admissionDate: new Date().toISOString(),
      totalFee,
      paidAmount,
      classRef: TEST_CLASS._id,
      studentStatus: "Active",
    };

    const res = await api("POST", "/students", studentData);

    if (!res.ok) {
      log("ENROLL_STUDENT", "FAIL", `${res.status}: ${res.data?.message || JSON.stringify(res.data).substring(0, 200)}`);
    } else {
      TEST_STUDENT_ID = res.data?.data?._id;
      log("ENROLL_STUDENT", "PASS", `Created ${res.data?.data?.studentId}, Paid: ${res.data?.data?.paidAmount}, Fee Status: ${res.data?.data?.feeStatus}`);
    }
  } else {
    log("ENROLL_STUDENT", "SKIP", "No class available");
  }

  // ── Test 6: Collect Remaining Fee ──
  if (TEST_STUDENT_ID) {
    const sRes = await api("GET", `/students/${TEST_STUDENT_ID}`);
    if (sRes.ok) {
      const student = sRes.data?.data;
      const remaining = (student.totalFee || 0) - (student.paidAmount || 0);

      if (remaining > 0) {
        const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
        const res = await api("POST", `/students/${TEST_STUDENT_ID}/collect-fee`, {
          amount: remaining,
          month,
          paymentMethod: "CASH",
          notes: "Remaining fee test",
        });

        if (!res.ok) {
          log("COLLECT_REMAINING", "FAIL", `${res.status}: ${res.data?.message}`);
        } else {
          const split = res.data?.data?.split;
          log("COLLECT_REMAINING", "PASS", `PKR ${remaining} collected. Teacher: ${split?.teacherShare}, Academy: ${split?.academyShare}, DailyRevenue: ${res.data?.data?.dailyRevenueEntries}`);
        }
      } else {
        log("COLLECT_REMAINING", "SKIP", "Already fully paid");
      }
    }
  } else {
    log("COLLECT_REMAINING", "SKIP", "No student");
  }

  // ── Test 7: Floating Amounts Detail ──
  {
    const res = await api("GET", "/finance/floating-amounts-detail");
    if (!res.ok) {
      log("FLOATING_DETAIL", "FAIL", `${res.status}: ${res.data?.message}`);
    } else {
      const summary = res.data?.data?.summary || [];
      const grand = res.data?.data?.grand;
      if (summary.length === 0) {
        log("FLOATING_DETAIL", "WARN", "No floating amounts — all closed or no revenue yet");
      } else {
        const details = summary.map(s => `${s.fullName}: PKR ${s.totalFloating}`).join(", ");
        log("FLOATING_DETAIL", "PASS", `${details}. Grand: PKR ${grand?.totalFloating}`);
      }
    }
  }

  // ── Test 8: Close Preview ──
  {
    const res = await api("GET", "/finance/close-preview");
    if (res.status === 403) {
      log("CLOSE_PREVIEW", "FAIL", "403 Forbidden");
    } else if (!res.ok) {
      log("CLOSE_PREVIEW", "FAIL", `${res.status}: ${res.data?.message}`);
    } else {
      const p = res.data?.data;
      if (!p || p.totalEntries === 0) {
        log("CLOSE_PREVIEW", "WARN", "No entries to close");
      } else {
        const allItems = [...(p.tuitionRevenue?.items || []), ...(p.academyShareRevenue?.items || [])];
        const hasDetails = allItems.some(i => i.studentName || i.className || i.splitDetails);
        log("CLOSE_PREVIEW", "PASS", `Net: PKR ${p.netTotal}. Entries: ${p.totalEntries}. Details: ${hasDetails ? "YES" : "NO"}`);
      }
    }
  }

  // ── Test 9: Teacher Payroll Report ──
  {
    const res = await api("GET", "/finance/teacher-payroll-report");
    if (res.status === 403) {
      log("TEACHER_PAYROLL", "FAIL", "403 Forbidden");
    } else if (!res.ok) {
      log("TEACHER_PAYROLL", "FAIL", `${res.status}: ${res.data?.message}`);
    } else {
      const report = res.data?.data || [];
      const badEntries = report.filter(t => t.role === "OWNER" || t.role === "PARTNER");
      if (badEntries.length > 0) {
        log("TEACHER_PAYROLL", "FAIL", `Owner/Partner in payroll: ${badEntries.map(t => t.name).join(", ")}`);
      } else {
        log("TEACHER_PAYROLL", "PASS", `${report.length} regular teachers. No Owner/Partner.`);
      }
    }
  }

  // ── Test 10: Close Day (preview mode) ──
  {
    const res = await api("GET", "/finance/close-day?preview=true");
    if (res.status === 403) {
      log("CLOSE_DAY_PREVIEW", "FAIL", "403 Forbidden");
    } else if (res.status === 400) {
      log("CLOSE_DAY_PREVIEW", "WARN", `No revenue to close: ${res.data?.message}`);
    } else if (!res.ok) {
      log("CLOSE_DAY_PREVIEW", "FAIL", `${res.status}: ${res.data?.message}`);
    } else {
      log("CLOSE_DAY_PREVIEW", "PASS", `Preview OK. Net: PKR ${res.data?.data?.netTotal}`);
    }
  }

  // ── Test 11: Closing History ──
  {
    const res = await api("GET", "/finance/closing-history");
    if (res.status === 403) {
      log("CLOSING_HISTORY", "FAIL", "403 Forbidden");
    } else if (!res.ok) {
      log("CLOSING_HISTORY", "FAIL", `${res.status}: ${res.data?.message}`);
    } else {
      const closings = res.data?.data || [];
      log("CLOSING_HISTORY", "PASS", `${closings.length} past closings`);
    }
  }

  // ── Test 12: Fee History ──
  if (TEST_STUDENT_ID) {
    const res = await api("GET", `/students/${TEST_STUDENT_ID}/fee-history`);
    if (!res.ok) {
      log("FEE_HISTORY", "FAIL", `${res.status}: ${res.data?.message}`);
    } else {
      const records = res.data?.data || [];
      const hasTeachers = records.some(r => r.teachers?.length > 0);
      const hasSplit = records.some(r => r.splitBreakdown);
      const hasAcademyDist = records.some(r => r.academyDistribution?.length > 0);
      log("FEE_HISTORY", "PASS", `${records.length} records. teachers[]: ${hasTeachers ? "YES" : "NO"}, splitBreakdown: ${hasSplit ? "YES" : "NO"}, academyDist: ${hasAcademyDist ? "YES" : "NO"}`);
    }
  }

  // ── Test 13: Teacher Payroll Summary ──
  {
    const res = await api("GET", "/finance/teacher-payroll-summary");
    if (!res.ok) {
      log("PAYROLL_SUMMARY", "FAIL", `${res.status}: ${res.data?.message}`);
    } else {
      const summary = res.data?.data?.summary;
      log("PAYROLL_SUMMARY", "PASS", `Teachers: ${summary?.teacherCount}, Total owed: PKR ${summary?.totalOwed}`);
    }
  }

  // ── Cleanup: Delete test student ──
  if (TEST_STUDENT_ID) {
    try {
      await api("DELETE", `/students/${TEST_STUDENT_ID}`);
      log("CLEANUP", "PASS", "Test student deleted");
    } catch {
      log("CLEANUP", "WARN", "Could not delete test student");
    }
  }

  // ── Summary ──
  console.log("\n" + "=".repeat(70));
  console.log("  TEST SUMMARY");
  console.log("=".repeat(70));

  const pass = results.filter(r => r.status === "PASS").length;
  const fail = results.filter(r => r.status === "FAIL").length;
  const warn = results.filter(r => r.status === "WARN").length;
  const skip = results.filter(r => r.status === "SKIP").length;

  console.log(`  ✅ PASS: ${pass}  ❌ FAIL: ${fail}  ⚠️  WARN: ${warn}  ⏭️  SKIP: ${skip}`);

  if (fail > 0) {
    console.log("\n  FAILURES:");
    results.filter(r => r.status === "FAIL").forEach(r => console.log(`    ❌ ${r.label}: ${r.detail}`));
  }

  if (warn > 0) {
    console.log("\n  WARNINGS:");
    results.filter(r => r.status === "WARN").forEach(r => console.log(`    ⚠️  ${r.label}: ${r.detail}`));
  }

  console.log("\n" + "=".repeat(70) + "\n");

  await mongoose.disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
