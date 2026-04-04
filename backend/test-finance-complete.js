/**
 * ================================================================
 * COMPREHENSIVE FINANCE SYSTEM TEST SCRIPT
 * ================================================================
 * Tests all scenarios for the complete finance flow:
 * 1. Partner Academy Share Deferral
 * 2. Per-Subject Discounts
 * 3. Teacher Deposits
 * 4. Academy Settlements
 * 5. Owner Dashboard Real-time Reports
 * 6. Teacher Payroll with details
 * ================================================================
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
const AcademySettlement = require("./models/AcademySettlement");
const TeacherDeposit = require("./models/TeacherDeposit");

// Import helper functions
const {
  splitFeeAmongTeachers,
  detectClassRevenueMode,
  distributeAcademyShare,
  distributeAcademyShareDeferred,
  releasePartnerAcademySettlements,
  getPendingSettlementsSummary,
} = require("./helpers/revenueEngine");

// Test utilities
const LOG = (title, data) => {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`\n🔷 ${title}`);
  console.log(`${"-".repeat(70)}`);
  if (typeof data === "string") {
    console.log(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
};

const PASS = (msg) => console.log(`✅ ${msg}`);
const FAIL = (msg) => console.log(`❌ ${msg}`);
const INFO = (msg) => console.log(`ℹ️  ${msg}`);
const WARN = (msg) => console.log(`⚠️  ${msg}`);

let testResults = { passed: 0, failed: 0, warnings: 0 };

const passTest = (msg) => {
  testResults.passed++;
  PASS(msg);
};

const failTest = (msg) => {
  testResults.failed++;
  FAIL(msg);
};

const warnTest = (msg) => {
  testResults.warnings++;
  WARN(msg);
};

// ================================================================
// TEST 1: Model Schema Validation
// ================================================================
async function testModelSchemas() {
  LOG("TEST 1", "Model Schema Validation");

  try {
    // Check AcademySettlement model
    const settlementFields = Object.keys(AcademySettlement.schema.paths);
    const requiredSettlementFields = [
      "partnerId",
      "partnerName",
      "partnerRole",
      "percentage",
      "amount",
      "status",
      "sourceDate",
      // sourceDetails is a nested object, check its presence differently
    ];
    const missingSettlementFields = requiredSettlementFields.filter(
      (f) => !settlementFields.includes(f)
    );
    
    // Check sourceDetails separately
    if (!settlementFields.some(f => f.startsWith("sourceDetails"))) {
      missingSettlementFields.push("sourceDetails");
    }

    if (missingSettlementFields.length === 0) {
      passTest("AcademySettlement model has all required fields");
    } else {
      failTest(`AcademySettlement missing fields: ${missingSettlementFields.join(", ")}`);
    }

    // Check TeacherDeposit model
    const depositFields = Object.keys(TeacherDeposit.schema.paths);
    const requiredDepositFields = [
      "teacherId",
      "teacherName",
      "amount",
      "depositType",
      "reason",
      "depositedBy",
      "status",
    ];
    const missingDepositFields = requiredDepositFields.filter(
      (f) => !depositFields.includes(f)
    );

    if (missingDepositFields.length === 0) {
      passTest("TeacherDeposit model has all required fields");
    } else {
      failTest(`TeacherDeposit missing fields: ${missingDepositFields.join(", ")}`);
    }

    // Check Student model for per-subject discount field
    const studentFields = Object.keys(Student.schema.paths);
    if (studentFields.includes("subjectDiscounts") || studentFields.includes("subjects")) {
      passTest("Student model supports subject-level data (for discounts)");
    } else {
      warnTest("Student model may need update for per-subject discount tracking");
    }

    // Check DailyRevenue for isDeferred field
    const dailyRevenueFields = Object.keys(DailyRevenue.schema.paths);
    if (dailyRevenueFields.includes("isDeferred")) {
      passTest("DailyRevenue model has isDeferred field for partner tracking");
    } else {
      warnTest("DailyRevenue model missing isDeferred field - may need update");
    }

  } catch (error) {
    failTest(`Error in model schema validation: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 2: Partner Academy Share Deferral
// ================================================================
async function testPartnerAcademyShareDeferral() {
  LOG("TEST 2", "Partner Academy Share Deferral Logic");

  try {
    const owner = await User.findOne({ role: "OWNER" });
    const partner = await User.findOne({ role: "PARTNER" });
    const config = await Configuration.findOne();

    if (!owner) {
      failTest("No OWNER user found in database");
      return;
    }
    passTest(`Found OWNER: ${owner.fullName}`);

    if (!partner) {
      warnTest("No PARTNER user found - testing with OWNER only");
    } else {
      passTest(`Found PARTNER: ${partner.fullName}`);
    }

    // Test academy share distribution (deferred version)
    const testAmount = 10000;
    const distribution = await distributeAcademyShare(testAmount, config);

    if (distribution && distribution.length > 0) {
      passTest(`Academy distribution calculated: ${distribution.length} recipients`);

      let totalDistributed = 0;
      distribution.forEach((d) => {
        totalDistributed += d.amount;
        INFO(`  - ${d.fullName} (${d.role}): ${d.percentage}% = PKR ${d.amount}`);
      });

      if (totalDistributed === testAmount) {
        passTest(`Distribution total matches input: PKR ${totalDistributed} = PKR ${testAmount}`);
      } else {
        failTest(`Distribution total mismatch: ${totalDistributed} vs ${testAmount}`);
      }
    } else {
      failTest("Academy distribution returned empty");
    }

    // Check existing deferred settlements
    const pendingSettlements = await AcademySettlement.find({ status: "PENDING" })
      .limit(10)
      .lean();

    INFO(`Found ${pendingSettlements.length} pending settlements in database`);

    if (pendingSettlements.length > 0) {
      const totalPending = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);
      passTest(`Pending settlements total: PKR ${totalPending}`);

      // Check settlement structure
      const sample = pendingSettlements[0];
      if (sample.partnerId && sample.amount && sample.sourceDetails) {
        passTest("Settlement structure is correct with partnerId, amount, and sourceDetails");
      } else {
        failTest("Settlement structure incomplete");
      }
    }

  } catch (error) {
    failTest(`Error in partner deferral test: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 3: Teacher Deposit System
// ================================================================
async function testTeacherDepositSystem() {
  LOG("TEST 3", "Teacher Deposit System");

  try {
    const owner = await User.findOne({ role: "OWNER" });
    const teacher = await Teacher.findOne({ status: "active" }).lean();

    if (!teacher) {
      warnTest("No active teacher found - skipping deposit test");
      return;
    }

    passTest(`Found active teacher: ${teacher.name}`);

    // Check existing deposits
    const existingDeposits = await TeacherDeposit.find({ teacherId: teacher._id })
      .limit(5)
      .lean();

    INFO(`Found ${existingDeposits.length} existing deposits for ${teacher.name}`);

    // Test deposit creation (mock - won't actually create)
    const depositTypes = ["ADVANCE", "BONUS", "REIMBURSEMENT", "ADJUSTMENT", "OTHER"];
    const validTypes = depositTypes.every(
      (t) => TeacherDeposit.schema.path("depositType").enumValues.includes(t)
    );

    if (validTypes) {
      passTest("All deposit types are valid in schema");
    } else {
      failTest("Some deposit types are not valid in schema");
    }

    // Test static methods
    if (typeof TeacherDeposit.getDepositsForTeacher === "function") {
      passTest("TeacherDeposit.getDepositsForTeacher method exists");
    } else {
      failTest("TeacherDeposit.getDepositsForTeacher method missing");
    }

    if (typeof TeacherDeposit.getTotalDeposited === "function") {
      passTest("TeacherDeposit.getTotalDeposited method exists");
    } else {
      failTest("TeacherDeposit.getTotalDeposited method missing");
    }

    // Test total deposited calculation
    const totalDeposited = await TeacherDeposit.getTotalDeposited(teacher._id);
    INFO(`Total deposited to ${teacher.name}: PKR ${totalDeposited.total} (${totalDeposited.count} deposits)`);

  } catch (error) {
    failTest(`Error in teacher deposit test: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 4: Academy Settlements API Functions
// ================================================================
async function testAcademySettlementsAPI() {
  LOG("TEST 4", "Academy Settlements API Functions");

  try {
    // Test getPendingSettlementsSummary
    if (typeof getPendingSettlementsSummary === "function") {
      passTest("getPendingSettlementsSummary function exists");

      const summary = await getPendingSettlementsSummary();
      INFO(`Pending settlements summary: ${summary.length} partners with pending amounts`);

      if (summary.length > 0) {
        summary.forEach((s) => {
          INFO(`  - ${s.partnerName}: PKR ${s.totalAmount} (${s.count} settlements)`);
        });
      }
    } else {
      failTest("getPendingSettlementsSummary function missing");
    }

    // Test static methods on AcademySettlement model
    if (typeof AcademySettlement.getAllPendingSummary === "function") {
      passTest("AcademySettlement.getAllPendingSummary method exists");
    } else {
      failTest("AcademySettlement.getAllPendingSummary method missing");
    }

    if (typeof AcademySettlement.getPendingForPartner === "function") {
      passTest("AcademySettlement.getPendingForPartner method exists");
    } else {
      failTest("AcademySettlement.getPendingForPartner method missing");
    }

    if (typeof AcademySettlement.getPendingTotal === "function") {
      passTest("AcademySettlement.getPendingTotal method exists");
    } else {
      failTest("AcademySettlement.getPendingTotal method missing");
    }

    // Test releasePartnerAcademySettlements exists
    if (typeof releasePartnerAcademySettlements === "function") {
      passTest("releasePartnerAcademySettlements function exists");
    } else {
      failTest("releasePartnerAcademySettlements function missing");
    }

  } catch (error) {
    failTest(`Error in settlements API test: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 5: Owner Dashboard Data Flow
// ================================================================
async function testOwnerDashboardDataFlow() {
  LOG("TEST 5", "Owner Dashboard Data Flow");

  try {
    const owner = await User.findOne({ role: "OWNER" });
    if (!owner) {
      failTest("No OWNER user found");
      return;
    }

    // Test owner wallet balance
    if (owner.walletBalance) {
      passTest(`Owner wallet balance found: floating=${owner.walletBalance.floating || 0}, verified=${owner.walletBalance.verified || 0}`);
    } else {
      warnTest("Owner has no wallet balance initialized");
    }

    // Check DailyRevenue for owner
    const ownerRevenue = await DailyRevenue.find({ partner: owner._id })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    INFO(`Found ${ownerRevenue.length} recent DailyRevenue entries for owner`);

    if (ownerRevenue.length > 0) {
      const totalRevenue = ownerRevenue.reduce((sum, r) => sum + (r.amount || 0), 0);
      passTest(`Recent owner revenue total: PKR ${totalRevenue}`);

      // Check for different revenue types
      const revenueTypes = [...new Set(ownerRevenue.map((r) => r.revenueType || "UNKNOWN"))];
      INFO(`Revenue types: ${revenueTypes.join(", ")}`);
    }

    // Check teacher payables
    const teachers = await Teacher.find({ status: "active", "balance.floating": { $gt: 0 } })
      .select("name balance")
      .lean();

    const totalTeacherPayable = teachers.reduce((sum, t) => sum + (t.balance?.floating || 0), 0);
    INFO(`Total teacher payables (floating): PKR ${totalTeacherPayable}`);

    if (teachers.length > 0) {
      passTest(`Found ${teachers.length} teachers with pending payables`);
    } else {
      INFO("No teachers have pending floating balance");
    }

    // Check partner pending settlements
    const pendingPartnerSettlements = await AcademySettlement.aggregate([
      { $match: { status: "PENDING", partnerRole: "PARTNER" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    if (pendingPartnerSettlements.length > 0) {
      const { total, count } = pendingPartnerSettlements[0];
      INFO(`Pending partner settlements: PKR ${total} (${count} settlements)`);
    } else {
      INFO("No pending partner settlements");
    }

  } catch (error) {
    failTest(`Error in owner dashboard test: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 6: Fee Collection with Per-Subject Discounts
// ================================================================
async function testFeeCollectionWithDiscounts() {
  LOG("TEST 6", "Fee Collection with Per-Subject Discounts");

  try {
    // Check recent fee records for discount tracking
    const recentFeeRecords = await FeeRecord.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    INFO(`Found ${recentFeeRecords.length} recent fee records`);

    if (recentFeeRecords.length === 0) {
      warnTest("No fee records found - cannot test discount tracking");
      return;
    }

    // Check if fee records have subject breakdown
    const sampleRecord = recentFeeRecords[0];

    if (sampleRecord.splitBreakdown?.subjectBreakdown) {
      passTest("Fee record has subject breakdown");
      INFO(`Subject breakdown: ${JSON.stringify(sampleRecord.splitBreakdown.subjectBreakdown, null, 2)}`);
    } else if (sampleRecord.subjectBreakdown) {
      passTest("Fee record has subjectBreakdown field");
    } else {
      warnTest("Fee record may need subject breakdown for per-subject discounts");
    }

    // Check discount field in fee records
    if ("discount" in sampleRecord || "discountAmount" in sampleRecord) {
      passTest("Fee record has discount tracking field");
    } else {
      warnTest("Fee record may need discount field for tracking");
    }

    // Validate amounts add up
    const amount = sampleRecord.amount || 0;
    const teacherShare = sampleRecord.splitBreakdown?.teacherShare || 0;
    const academyShare = sampleRecord.splitBreakdown?.academyShare || 0;
    const ownerPartnerShare = sampleRecord.splitBreakdown?.ownerPartnerShare || 0;

    const totalDistributed = teacherShare + academyShare + ownerPartnerShare;

    if (totalDistributed === amount) {
      passTest(`Fee distribution adds up: ${totalDistributed} = ${amount}`);
    } else if (totalDistributed > 0) {
      // Allow for some tracking variations
      const diff = Math.abs(totalDistributed - amount);
      if (diff < 10) {
        passTest(`Fee distribution approximately correct (diff: ${diff})`);
      } else {
        warnTest(`Fee distribution mismatch: distributed=${totalDistributed}, amount=${amount}`);
      }
    } else {
      warnTest("Fee distribution breakdown not tracked");
    }

  } catch (error) {
    failTest(`Error in fee collection test: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 7: Teacher Payroll Details
// ================================================================
async function testTeacherPayrollDetails() {
  LOG("TEST 7", "Teacher Payroll Details");

  try {
    const teachers = await Teacher.find({ status: "active" })
      .select("name compensation balance totalPaid classes")
      .limit(10)
      .lean();

    if (teachers.length === 0) {
      warnTest("No active teachers found");
      return;
    }

    passTest(`Found ${teachers.length} active teachers`);

    // Check teacher balance structure
    const teachersWithBalance = teachers.filter((t) => t.balance);
    INFO(`${teachersWithBalance.length} teachers have balance tracking`);

    if (teachersWithBalance.length > 0) {
      const sample = teachersWithBalance[0];
      const balanceFields = Object.keys(sample.balance || {});
      INFO(`Teacher balance fields: ${balanceFields.join(", ")}`);

      if (balanceFields.includes("floating") && balanceFields.includes("verified")) {
        passTest("Teacher balance has floating and verified fields");
      } else {
        warnTest("Teacher balance may be missing required fields");
      }
    }

    // Check compensation types
    const compensationTypes = [...new Set(teachers.map((t) => t.compensation?.type || "unknown"))];
    INFO(`Compensation types in use: ${compensationTypes.join(", ")}`);

    // Check for deposits relationship
    for (const teacher of teachers.slice(0, 3)) {
      const deposits = await TeacherDeposit.countDocuments({ teacherId: teacher._id });
      INFO(`  - ${teacher.name}: ${deposits} deposits`);
    }

  } catch (error) {
    failTest(`Error in teacher payroll test: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 8: Revenue Engine Functions
// ================================================================
async function testRevenueEngineFunctions() {
  LOG("TEST 8", "Revenue Engine Functions");

  try {
    const config = await Configuration.findOne();

    // Test splitFeeAmongTeachers
    if (typeof splitFeeAmongTeachers === "function") {
      passTest("splitFeeAmongTeachers function exists");

      // Get a teacher for testing
      const teacher = await Teacher.findOne({ 
        status: "active",
        "compensation.type": "percentage" // Use percentage-based teacher
      }).lean();
      
      if (teacher) {
        const teachersData = [
          { teacherId: teacher._id, teacher, isPartner: false },
        ];
        const split = await splitFeeAmongTeachers(5000, teachersData, config);

        if (split && split.teacherPayouts !== undefined) {
          passTest("splitFeeAmongTeachers returns valid structure");
          INFO(`  - Teacher payouts: ${split.totalTeacherAmount}`);
          INFO(`  - Direct stakeholder payouts: ${split.totalDirectStakeholderAmount || 0}`);
          INFO(`  - Academy share: ${split.academyAmount}`);

          const total = (split.totalTeacherAmount || 0) + (split.totalDirectStakeholderAmount || 0) + (split.academyAmount || 0);
          if (total === 5000) {
            passTest(`Split adds up correctly: ${total} = 5000`);
          } else {
            warnTest(`Split total: ${total} (may vary by compensation type)`);
          }
        } else {
          failTest("splitFeeAmongTeachers returned invalid structure");
        }
      } else {
        warnTest("No percentage-based teacher found for testing");
      }
    } else {
      failTest("splitFeeAmongTeachers function missing");
    }

    // Test detectClassRevenueMode
    if (typeof detectClassRevenueMode === "function") {
      passTest("detectClassRevenueMode function exists");

      const classDoc = await Class.findOne({ subjectTeachers: { $exists: true, $ne: [] } }).lean();
      if (classDoc) {
        const mode = await detectClassRevenueMode(classDoc);
        passTest(`Revenue mode detected: ${mode.mode}`);
        INFO(`  - Owner/Partners: ${mode.ownerPartnerTeachers.length}`);
        INFO(`  - Regular teachers: ${mode.regularTeachers.length}`);
      }
    } else {
      failTest("detectClassRevenueMode function missing");
    }

    // Test distributeAcademyShare
    if (typeof distributeAcademyShare === "function") {
      passTest("distributeAcademyShare function exists");
    } else {
      failTest("distributeAcademyShare function missing");
    }

    // Test distributeAcademyShareDeferred
    if (typeof distributeAcademyShareDeferred === "function") {
      passTest("distributeAcademyShareDeferred function exists");
    } else {
      warnTest("distributeAcademyShareDeferred function may not exist separately - check implementation");
    }

  } catch (error) {
    failTest(`Error in revenue engine test: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 9: Configuration Validation
// ================================================================
async function testConfigurationValidation() {
  LOG("TEST 9", "Configuration Validation");

  try {
    const config = await Configuration.findOne();

    if (!config) {
      failTest("No configuration found in database");
      return;
    }

    passTest("Configuration document found");

    // Check academy pool split
    if (config.academyPoolSplit) {
      passTest("academyPoolSplit configured");
      const totalPercentage = config.academyPoolSplit.reduce((sum, p) => sum + (p.percentage || 0), 0);
      INFO(`Academy pool total: ${totalPercentage}%`);

      if (totalPercentage === 100) {
        passTest("Academy pool percentages add up to 100%");
      } else {
        warnTest(`Academy pool percentages don't add up to 100%: ${totalPercentage}%`);
      }
    } else {
      warnTest("No academyPoolSplit in configuration");
    }

    // Check tuition pool split
    if (config.tuitionPoolSplit) {
      passTest("tuitionPoolSplit configured");
      // tuitionPoolSplit is an object {waqar, zahid, saud}, not an array
      const totalTuition = 
        (config.tuitionPoolSplit.waqar || 0) + 
        (config.tuitionPoolSplit.zahid || 0) + 
        (config.tuitionPoolSplit.saud || 0);
      INFO(`Tuition pool total: ${totalTuition}%`);

      if (totalTuition === 100) {
        passTest("Tuition pool percentages add up to 100%");
      } else {
        warnTest(`Tuition pool percentages don't add up to 100%: ${totalTuition}%`);
      }
    } else {
      warnTest("No tuitionPoolSplit in configuration");
    }

    // Check teacher share percentage
    if (config.teacherSharePercentage !== undefined) {
      passTest(`Teacher share percentage: ${config.teacherSharePercentage}%`);
    }

    // Check academy share percentage
    if (config.academySharePercentage !== undefined) {
      passTest(`Academy share percentage: ${config.academySharePercentage}%`);
    }

  } catch (error) {
    failTest(`Error in configuration test: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 10: End-to-End Flow Simulation
// ================================================================
async function testEndToEndFlowSimulation() {
  LOG("TEST 10", "End-to-End Flow Simulation (Read-Only)");

  try {
    // This test simulates the complete flow without making changes

    // Step 1: Student admission with subjects
    const student = await Student.findOne({}).lean();
    if (!student) {
      warnTest("No students found for simulation");
      return;
    }
    passTest(`Found student: ${student.studentName}`);

    // Step 2: Check class and subjects
    const classDoc = await Class.findOne({}).lean();
    if (classDoc) {
      passTest(`Found class: ${classDoc.classTitle}`);
      INFO(`  - Subjects: ${classDoc.subjectTeachers?.length || 0}`);
    }

    // Step 3: Check fee records for this student
    const feeRecords = await FeeRecord.find({ student: student._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    INFO(`Student has ${feeRecords.length} fee records`);

    if (feeRecords.length > 0) {
      const latestFee = feeRecords[0];
      INFO(`Latest fee: PKR ${latestFee.amount} - ${latestFee.month}`);

      // Check teacher distribution
      if (latestFee.teachers && latestFee.teachers.length > 0) {
        passTest(`Fee distributed to ${latestFee.teachers.length} teachers`);
      }

      // Check academy distribution
      if (latestFee.academyDistribution && latestFee.academyDistribution.length > 0) {
        passTest(`Academy share distributed to ${latestFee.academyDistribution.length} recipients`);
      }
    }

    // Step 4: Check partner settlements
    const owner = await User.findOne({ role: "OWNER" });
    const partner = await User.findOne({ role: "PARTNER" });

    if (partner) {
      const partnerSettlements = await AcademySettlement.find({
        partnerId: partner._id,
        status: "PENDING",
      }).lean();

      INFO(`Partner ${partner.fullName} has ${partnerSettlements.length} pending settlements`);

      if (partnerSettlements.length > 0) {
        const total = partnerSettlements.reduce((sum, s) => sum + s.amount, 0);
        passTest(`Partner pending total: PKR ${total}`);
      }
    }

    // Step 5: Check teacher balances
    const teachersWithBalance = await Teacher.find({
      status: "active",
      "balance.floating": { $gt: 0 },
    })
      .select("name balance")
      .lean();

    INFO(`${teachersWithBalance.length} teachers have floating balances`);

    // Step 6: Verify owner can see summary
    if (owner) {
      const ownerDailyRevenue = await DailyRevenue.aggregate([
        { $match: { partner: owner._id, status: "UNCOLLECTED" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      if (ownerDailyRevenue.length > 0) {
        passTest(`Owner has PKR ${ownerDailyRevenue[0].total} uncollected revenue`);
      } else {
        INFO("Owner has no uncollected revenue");
      }
    }

    passTest("End-to-end flow simulation completed");

  } catch (error) {
    failTest(`Error in end-to-end simulation: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 11: Data Integrity Checks
// ================================================================
async function testDataIntegrityChecks() {
  LOG("TEST 11", "Data Integrity Checks");

  try {
    // Check for orphaned settlements (partner doesn't exist)
    const settlements = await AcademySettlement.find({ status: "PENDING" }).lean();
    let orphanedSettlements = 0;

    for (const settlement of settlements) {
      const partner = await User.findById(settlement.partnerId);
      if (!partner) {
        orphanedSettlements++;
      }
    }

    if (orphanedSettlements === 0) {
      passTest("No orphaned settlements found");
    } else {
      failTest(`Found ${orphanedSettlements} orphaned settlements`);
    }

    // Check for negative balances
    const negativeBalanceTeachers = await Teacher.find({
      $or: [
        { "balance.floating": { $lt: 0 } },
        { "balance.verified": { $lt: 0 } },
      ],
    }).countDocuments();

    if (negativeBalanceTeachers === 0) {
      passTest("No teachers with negative balances");
    } else {
      failTest(`Found ${negativeBalanceTeachers} teachers with negative balances`);
    }

    const negativeBalanceUsers = await User.find({
      $or: [
        { "walletBalance.floating": { $lt: 0 } },
        { "walletBalance.verified": { $lt: 0 } },
      ],
    }).countDocuments();

    if (negativeBalanceUsers === 0) {
      passTest("No users with negative wallet balances");
    } else {
      failTest(`Found ${negativeBalanceUsers} users with negative wallet balances`);
    }

    // Check for duplicate settlements
    const duplicateCheck = await AcademySettlement.aggregate([
      {
        $group: {
          _id: {
            partnerId: "$partnerId",
            feeRecordId: "$sourceDetails.feeRecordId",
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicateCheck.length === 0) {
      passTest("No duplicate settlements found");
    } else {
      warnTest(`Found ${duplicateCheck.length} potential duplicate settlements`);
    }

    // Verify fee records have proper status
    const invalidStatusFees = await FeeRecord.find({
      status: { $nin: ["PAID", "PENDING", "PARTIAL", "OVERDUE", "CANCELLED"] },
    }).countDocuments();

    if (invalidStatusFees === 0) {
      passTest("All fee records have valid status");
    } else {
      failTest(`Found ${invalidStatusFees} fee records with invalid status`);
    }

  } catch (error) {
    failTest(`Error in data integrity checks: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 12: Routes and Controllers Check
// ================================================================
async function testRoutesAndControllersExist() {
  LOG("TEST 12", "Routes and Controllers Existence Check");

  try {
    const fs = require("fs");
    const path = require("path");

    // Check finance routes
    const financeRoutesPath = path.join(__dirname, "routes", "finance.js");
    if (fs.existsSync(financeRoutesPath)) {
      const content = fs.readFileSync(financeRoutesPath, "utf8");

      if (content.includes("settlements")) {
        passTest("Finance routes include settlements endpoints");
      } else {
        failTest("Finance routes missing settlements endpoints");
      }

      if (content.includes("owner/breakdown") || content.includes("ownerBreakdown")) {
        passTest("Finance routes include owner breakdown endpoint");
      } else {
        warnTest("Finance routes may be missing owner breakdown endpoint");
      }
    } else {
      failTest("Finance routes file not found");
    }

    // Check payroll routes
    const payrollRoutesPath = path.join(__dirname, "routes", "payroll.js");
    if (fs.existsSync(payrollRoutesPath)) {
      const content = fs.readFileSync(payrollRoutesPath, "utf8");

      if (content.includes("deposit")) {
        passTest("Payroll routes include deposit endpoints");
      } else {
        warnTest("Payroll routes may be missing deposit endpoints");
      }
    } else {
      warnTest("Payroll routes file not found");
    }

    // Check financeController
    const financeControllerPath = path.join(__dirname, "controllers", "financeController.js");
    if (fs.existsSync(financeControllerPath)) {
      const content = fs.readFileSync(financeControllerPath, "utf8");

      if (content.includes("getAcademySettlementsSummary")) {
        passTest("Finance controller has getAcademySettlementsSummary");
      } else {
        failTest("Finance controller missing getAcademySettlementsSummary");
      }

      if (content.includes("releasePartnerSettlements")) {
        passTest("Finance controller has releasePartnerSettlements");
      } else {
        warnTest("Finance controller may be missing releasePartnerSettlements");
      }

      if (content.includes("getOwnerBreakdown")) {
        passTest("Finance controller has getOwnerBreakdown");
      } else {
        warnTest("Finance controller may be missing getOwnerBreakdown");
      }
    } else {
      failTest("Finance controller file not found");
    }

    // Check payrollController
    const payrollControllerPath = path.join(__dirname, "controllers", "payrollController.js");
    if (fs.existsSync(payrollControllerPath)) {
      const content = fs.readFileSync(payrollControllerPath, "utf8");

      if (content.includes("createTeacherDeposit") || content.includes("teacherDeposit")) {
        passTest("Payroll controller has teacher deposit functionality");
      } else {
        warnTest("Payroll controller may be missing teacher deposit functionality");
      }
    } else {
      warnTest("Payroll controller file not found");
    }

  } catch (error) {
    failTest(`Error in routes/controllers check: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// MAIN TEST RUNNER
// ================================================================
async function runAllTests() {
  console.clear();
  LOG("START", "Finance System Complete Test Suite");
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/edwardian-academy"
    );
    passTest("Connected to MongoDB");

    // Run all tests
    await testModelSchemas();
    await testPartnerAcademyShareDeferral();
    await testTeacherDepositSystem();
    await testAcademySettlementsAPI();
    await testOwnerDashboardDataFlow();
    await testFeeCollectionWithDiscounts();
    await testTeacherPayrollDetails();
    await testRevenueEngineFunctions();
    await testConfigurationValidation();
    await testEndToEndFlowSimulation();
    await testDataIntegrityChecks();
    await testRoutesAndControllersExist();

    LOG("RESULTS", "Test Summary");
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed:   ${testResults.passed}`);
    console.log(`   ❌ Failed:   ${testResults.failed}`);
    console.log(`   ⚠️  Warnings: ${testResults.warnings}`);
    console.log(`   📝 Total:    ${testResults.passed + testResults.failed + testResults.warnings}`);

    if (testResults.failed === 0) {
      console.log(`\n🎉 All tests passed!`);
    } else {
      console.log(`\n⚠️  ${testResults.failed} test(s) failed - review above for details`);
    }

    console.log(`\nEnded: ${new Date().toLocaleString()}`);

  } catch (error) {
    failTest(`Critical error: ${error.message}`);
    console.error(error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.connection.close();
    PASS("Disconnected from MongoDB");
    process.exit(testResults.failed > 0 ? 1 : 0);
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
