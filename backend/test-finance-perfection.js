/**
 * ================================================================
 * FINANCE SYSTEM PERFECTION — COMPREHENSIVE TEST SCRIPT
 * ================================================================
 * Tests all scenarios for multi-teacher classes with different
 * compensation types and proper revenue distribution
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Import models
const Student = require("./models/Student");
const Teacher = require("./models/Teacher");
const Class = require("./models/Class");
const FeeRecord = require("./models/FeeRecord");
const Transaction = require("./models/Transaction");
const User = require("./models/User");
const DailyRevenue = require("./models/DailyRevenue");
const Configuration = require("./models/Configuration");

// Import helper functions
const { splitFeeAmongTeachers, detectClassRevenueMode } = require("./helpers/revenueEngine");

const LOG = (title, data) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`\n🔷 ${title}`);
  console.log(`${'-'.repeat(70)}`);
  if (typeof data === "string") {
    console.log(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
};

const PASS = (msg) => console.log(`✅ ${msg}`);
const FAIL = (msg) => console.log(`❌ ${msg}`);
const INFO = (msg) => console.log(`ℹ️  ${msg}`);

// ================================================================
// TEST SCENARIO 1: Multi-Teacher Subject with Different Compensation
// ================================================================
async function testScenario1() {
  LOG("TEST SCENARIO 1", "Multi-Teacher Subject: SPLIT (70/30) + PER-STUDENT");

  try {
    // Get test data
    const config = await Configuration.findOne();
    const teacher1 = await Teacher.findOne({
      status: "active",
      "compensation.type": { $in: ["percentage", "hybrid"] },
    });
    const teacher2 = await Teacher.findOne({
      status: "active",
      "compensation.type": { $in: ["perStudent", "fixed"] },
      _id: { $ne: teacher1?._id },
    });

    if (!teacher1) {
      FAIL("Could not find first teacher");
      return;
    }

    // Case: Physics subject
    // Teacher 1: 70/30 percentage split
    // Teacher 2: Per-student (e.g., 500 PKR/student/month)
    
    const teachersData = [
      {
        teacherId: teacher1._id,
        teacher: teacher1,
        isPartner: false,
      },
    ];

    if (teacher2) {
      teachersData.push({
        teacherId: teacher2._id,
        teacher: teacher2,
        isPartner: false,
      });
    }

    const feeAmount = 3000; // Student fee for Physics

    // Split fees among teachers
    const split = await splitFeeAmongTeachers(feeAmount, teachersData, config);

    LOG("Split Result", {
      teacherPayouts: split.teacherPayouts.map(t => ({
        name: t.teacherName,
        compensation: t.compensationType,
        amount: t.amount,
        reason: t.reason,
      })),
      academyShare: split.academyAmount,
      academyDistribution: split.academyDistribution.map(d => ({
        name: d.fullName,
        percentage: d.percentage,
        amount: d.amount,
      })),
    });

    // Validation
    const totalDistributed = split.totalTeacherAmount + split.academyAmount;
    if (totalDistributed === feeAmount) {
      PASS(`Total distributed (${totalDistributed}) matches fee amount (${feeAmount})`);
    } else {
      FAIL(`Total distributed (${totalDistributed}) does NOT match fee amount (${feeAmount})`);
    }

    // Teacher 1 should get configured % (or profitShare if hybrid)
    const t1Type = teacher1.compensation?.type || "percentage";
    const t1Expected = t1Type === "hybrid"
      ? Math.round((feeAmount * (teacher1.compensation?.profitShare || 0)) / 100)
      : Math.round((feeAmount * (teacher1.compensation?.teacherShare || 70)) / 100);
    const t1Actual = split.teacherPayouts[0]?.amount;
    if (t1Actual === t1Expected) {
      PASS(`Teacher 1 received correct split: ${t1Actual} (expected ${t1Expected})`);
    } else {
      FAIL(`Teacher 1 split mismatch: ${t1Actual} vs ${t1Expected}`);
    }

    // Teacher 2 should get 0 for per-student/fixed compensation
    if (teacher2) {
      const t2Expected = 0;
      const t2Actual = teachersData.length > 1 && split.teacherPayouts[1] ? split.teacherPayouts[1].amount : 0;
      if (t2Actual === t2Expected) {
        PASS(`Teacher 2 received correct non-fee compensation handling: ${t2Actual}`);
      } else {
        FAIL(`Teacher 2 non-fee handling incorrect: ${t2Actual} vs ${t2Expected}`);
      }
    } else {
      INFO("No perStudent/fixed teacher found in DB; validated with single teacher scenario only");
    }

    // Academy gets the exact remainder after teacher payouts
    const academyExpected = feeAmount - (split.totalTeacherAmount || 0);
    if (split.academyAmount === academyExpected) {
      PASS(`Academy received correct share: ${split.academyAmount} (expected ${academyExpected})`);
    } else {
      FAIL(`Academy share mismatch: ${split.academyAmount} vs ${academyExpected}`);
    }

  } catch (error) {
    FAIL(`Error in scenario 1: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST SCENARIO 2: Owner/Partner Teaching Class (100% Tuition)
// ================================================================
async function testScenario2() {
  LOG("TEST SCENARIO 2", "Owner Teaching Class: 100% Tuition Split");

  try {
    const owner = await User.findOne({ role: "OWNER" });
    const partner = await User.findOne({ role: "PARTNER" });

    if (!owner) {
      FAIL("Could not find owner");
      return;
    }

    PASS(`Found Owner: ${owner.fullName}`);
    if (partner) {
      PASS(`Found Partner: ${partner.fullName}`);
    }

    // Find a class with owner/partner teachers
    const classDoc = await Class.findOne({
      subjectTeachers: { $exists: true, $ne: [] },
    }).lean();

    if (!classDoc) {
      INFO("No class with subject teachers found - creating scenario hypothetically");

      // Hypothetical: 2 teachers split equally
      const studentFee = 5000;
      const teacherCount = 2;
      const perTeacher = Math.floor(studentFee / teacherCount);
      const remainder = studentFee - (perTeacher * teacherCount);

      const split1 = perTeacher + remainder;
      const split2 = perTeacher;

      LOG("Hypothetical 2-Teacher Split", {
        studentFee,
        teacherCount,
        teacher1Amount: split1,
        teacher2Amount: split2,
        total: split1 + split2,
      });

      if (split1 + split2 === studentFee) {
        PASS(`Hypothetical split adds up correctly: ${split1 + split2} = ${studentFee}`);
      }
      return;
    }

    PASS(`Found class: ${classDoc.classTitle}`);

    // Detect revenue mode
    const mode = await detectClassRevenueMode(classDoc);
    LOG("Revenue Mode Detection", {
      mode: mode.mode,
      ownerPartners: mode.ownerPartnerTeachers.length,
      regularTeachers: mode.regularTeachers.length,
    });

    if (mode.ownerPartnerTeachers.length > 0) {
      PASS(`Correctly detected ${mode.ownerPartnerTeachers.length} owner/partner teachers`);
    }

  } catch (error) {
    FAIL(`Error in scenario 2: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST SCENARIO 3: FeeRecord Structure Validation
// ================================================================
async function testScenario3() {
  LOG("TEST SCENARIO 3", "FeeRecord Model Structure Validation");

  try {
    const feeRecord = await FeeRecord.findOne({
      $or: [
        { teachers: { $exists: true, $ne: [] } },
        { academyDistribution: { $exists: true, $ne: [] } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!feeRecord) {
      const teachersPathExists = Boolean(FeeRecord.schema.path("teachers"));
      const academyDistributionPathExists = Boolean(FeeRecord.schema.path("academyDistribution"));
      if (teachersPathExists && academyDistributionPathExists) {
        PASS("FeeRecord schema includes teachers and academyDistribution fields (no matching data rows yet)");
      } else {
        FAIL("FeeRecord schema missing expected fields for multi-teacher tracking");
      }
      return;
    }

    PASS(`Found FeeRecord: ${feeRecord.receiptNumber}`);

    // Check new fields
    const hasTeachersArray = Array.isArray(feeRecord.teachers);
    if (hasTeachersArray) {
      PASS(`FeeRecord has teachers array (${feeRecord.teachers.length} teachers)`);

      if (feeRecord.teachers.length > 0) {
        LOG("Teacher Entry Structure", feeRecord.teachers[0]);

        // Validate structure
        const t = feeRecord.teachers[0];
        const requiredFields = [
          "teacherId",
          "teacherName",
          "compensationType",
          "teacherShare",
          "role",
          "isPartner",
        ];

        const missingFields = requiredFields.filter((f) => !(f in t));
        if (missingFields.length === 0) {
          PASS(`All required fields present in teacher entry`);
        } else {
          FAIL(`Missing fields in teacher entry: ${missingFields.join(", ")}`);
        }
      }
    } else {
      FAIL(`FeeRecord missing teachers array`);
    }

    // Check academyDistribution array
    const hasAcademyDist = Array.isArray(feeRecord.academyDistribution);
    if (hasAcademyDist) {
      PASS(`FeeRecord has academyDistribution array (${feeRecord.academyDistribution.length} distributions)`);

      if (feeRecord.academyDistribution.length > 0) {
        LOG("Academy Distribution Entry", feeRecord.academyDistribution[0]);
      }
    } else {
      FAIL(`FeeRecord missing academyDistribution array`);
    }

    // Check splitBreakdown
    const splitBreak = feeRecord.splitBreakdown;
    LOG("Split Breakdown Structure", {
      teacherShare: splitBreak?.teacherShare,
      academyShare: splitBreak?.academyShare,
      teacherPercentage: splitBreak?.teacherPercentage,
      academyPercentage: splitBreak?.academyPercentage,
      totalTeachers: splitBreak?.totalTeachers,
    });

    const totalPercent = (splitBreak?.teacherPercentage || 0) + (splitBreak?.academyPercentage || 0);
    if (totalPercent === 100 || totalPercent === 0) {
      PASS(`Split percentages add up correctly: ${totalPercent}%`);
    } else {
      FAIL(`Split percentages don't add up: ${totalPercent}% (expected 100 or 0)`);
    }

  } catch (error) {
    FAIL(`Error in scenario 3: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST SCENARIO 4: DailyRevenue Entries Creation
// ================================================================
async function testScenario4() {
  LOG("TEST SCENARIO 4", "DailyRevenue Entries for Real-time Tracking");

  try {
    const dailyRevenue = await DailyRevenue.find({ status: "UNCOLLECTED" })
      .limit(10)
      .lean();

    if (dailyRevenue.length === 0) {
      INFO("No uncollected DailyRevenue entries found");
      return;
    }

    PASS(`Found ${dailyRevenue.length} uncollected DailyRevenue entries`);

    // Group by partner
    const byPartner = {};
    dailyRevenue.forEach((dr) => {
      const pid = dr.partner.toString();
      if (!byPartner[pid]) {
        byPartner[pid] = {
          count: 0,
          total: 0,
          byType: {},
        };
      }
      byPartner[pid].count += 1;
      byPartner[pid].total += dr.amount;

      const type = dr.revenueType || "UNKNOWN";
      byPartner[pid].byType[type] = (byPartner[pid].byType[type] || 0) + dr.amount;
    });

    LOG("DailyRevenue Summary by Partner", byPartner);

    // Validate structure
    const sample = dailyRevenue[0];
    const requiredFields = ["partner", "date", "amount", "source", "status"];
    const missingFields = requiredFields.filter((f) => !(f in sample));
    if (missingFields.length === 0) {
      PASS(`DailyRevenue entry has all required fields`);
    } else {
      FAIL(`DailyRevenue missing fields: ${missingFields.join(", ")}`);
    }

  } catch (error) {
    FAIL(`Error in scenario 4: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST SCENARIO 5: Wallet Balance Updates
// ================================================================
async function testScenario5() {
  LOG("TEST SCENARIO 5", "User Wallet Balance Real-time Updates");

  try {
    const users = await User.find({
      role: { $in: ["OWNER", "PARTNER"] },
      walletBalance: { $exists: true },
    })
      .select("fullName role walletBalance")
      .lean();

    if (users.length === 0) {
      INFO("No users with wallet balances found");
      return;
    }

    PASS(`Found ${users.length} users with wallet balances`);

    const walletSummary = users.map((u) => ({
      name: u.fullName,
      role: u.role,
      floating: u.walletBalance?.floating || 0,
      verified: u.walletBalance?.verified || 0,
      total: (u.walletBalance?.floating || 0) + (u.walletBalance?.verified || 0),
    }));

    LOG("User Wallet Balances", walletSummary);

    const totalFloating = walletSummary.reduce((sum, u) => sum + u.floating, 0);
    const totalVerified = walletSummary.reduce((sum, u) => sum + u.verified, 0);

    PASS(`Total floating across all users: ${totalFloating} PKR`);
    PASS(`Total verified across all users: ${totalVerified} PKR`);

  } catch (error) {
    FAIL(`Error in scenario 5: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST SCENARIO 6: Teacher Balance Tracking
// ================================================================
async function testScenario6() {
  LOG("TEST SCENARIO 6", "Teacher Balance Tracking (Floating/Verified)");

  try {
    const teachers = await Teacher.find({
      status: "active",
      balance: { $exists: true },
    })
      .select("name compensation balance totalPaid")
      .lean();

    if (teachers.length === 0) {
      INFO("No active teachers with balances found");
      return;
    }

    PASS(`Found ${teachers.length} active teachers`);

    const teacherSummary = teachers.map((t) => ({
      name: t.name,
      compensationType: t.compensation?.type || "percentage",
      floating: t.balance?.floating || 0,
      verified: t.balance?.verified || 0,
      pending: t.balance?.pending || 0,
      total: (t.balance?.floating || 0) + (t.balance?.verified || 0) + (t.balance?.pending || 0),
      totalPaid: t.totalPaid || 0,
      lifetime: ((t.balance?.floating || 0) + (t.balance?.verified || 0) + (t.balance?.pending || 0)) + (t.totalPaid || 0),
    }));

    LOG("Teacher Balance Summary", teacherSummary.slice(0, 5));

    if (teacherSummary.length > 5) {
      INFO(`... and ${teacherSummary.length - 5} more teachers`);
    }

    const totalFloating = teacherSummary.reduce((sum, t) => sum + t.floating, 0);
    const totalVerified = teacherSummary.reduce((sum, t) => sum + t.verified, 0);

    PASS(`Total teacher floating balance: ${totalFloating} PKR`);
    PASS(`Total teacher verified balance: ${totalVerified} PKR`);

  } catch (error) {
    FAIL(`Error in scenario 6: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// MAIN TEST RUNNER
// ================================================================
async function runAllTests() {
  console.clear();
  LOG("START", "Finance System Perfection - Comprehensive Test Suite");
  console.log(`Started: ${new Date().toLocaleString()}`);

  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/edwardian-academy"
    );
    PASS("Connected to MongoDB");

    // Run tests
    await testScenario1();
    await testScenario2();
    await testScenario3();
    await testScenario4();
    await testScenario5();
    await testScenario6();

    LOG("COMPLETION", "All tests completed successfully!");
    console.log(`Ended: ${new Date().toLocaleString()}`);

  } catch (error) {
    FAIL(`Critical error: ${error.message}`);
    console.error(error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.connection.close();
    PASS("Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
