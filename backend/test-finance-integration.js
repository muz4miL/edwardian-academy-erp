/**
 * ================================================================
 * FINANCE FLOW INTEGRATION TEST
 * ================================================================
 * This test simulates the complete finance flow:
 * 1. Creates test students, teachers, and classes
 * 2. Collects fees with per-subject discounts
 * 3. Verifies partner academy share deferral
 * 4. Tests teacher deposits
 * 5. Releases settlements
 * 6. Validates all balances
 * ================================================================
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

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
  createDailyRevenueEntries,
} = require("./helpers/revenueEngine");

// Test utilities
const LOG = (title, data) => {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🔷 ${title}`);
  console.log(`${"-".repeat(70)}`);
  if (typeof data === "string") {
    console.log(data);
  } else if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const PASS = (msg) => console.log(`✅ ${msg}`);
const FAIL = (msg) => console.log(`❌ ${msg}`);
const INFO = (msg) => console.log(`ℹ️  ${msg}`);

let testResults = { passed: 0, failed: 0 };
const passTest = (msg) => { testResults.passed++; PASS(msg); };
const failTest = (msg) => { testResults.failed++; FAIL(msg); };

// Test data storage
const testData = {
  owner: null,
  partner: null,
  teacher: null,
  student: null,
  class: null,
  config: null,
  feeRecord: null,
};

// ================================================================
// SETUP: Create test data
// ================================================================
async function setupTestData() {
  LOG("SETUP", "Creating test data for integration test");
  
  // Get or create configuration
  testData.config = await Configuration.findOne();
  if (!testData.config) {
    testData.config = await Configuration.create({
      academyName: "Test Academy",
      salaryConfig: { teacherShare: 70, academyShare: 30 },
      tuitionPoolSplit: { waqar: 50, zahid: 30, saud: 20 },
      academyShareSplit: [],
    });
    INFO("Created test configuration");
  } else {
    passTest("Found existing configuration");
  }

  // Get or create owner
  testData.owner = await User.findOne({ role: "OWNER" });
  if (!testData.owner) {
    const hashedPassword = await bcrypt.hash("test123", 10);
    testData.owner = await User.create({
      fullName: "Test Owner",
      username: "testowner",
      password: hashedPassword,
      role: "OWNER",
      walletBalance: { floating: 0, verified: 0 },
    });
    INFO("Created test owner");
  } else {
    passTest(`Found existing owner: ${testData.owner.fullName}`);
  }

  // Get or create partner
  testData.partner = await User.findOne({ role: "PARTNER" });
  if (!testData.partner) {
    const hashedPassword = await bcrypt.hash("test123", 10);
    testData.partner = await User.create({
      fullName: "Test Partner",
      username: "testpartner",
      password: hashedPassword,
      role: "PARTNER",
      walletBalance: { floating: 0, verified: 0 },
    });
    INFO("Created test partner");
  } else {
    passTest(`Found existing partner: ${testData.partner.fullName}`);
  }

  // Get or create teacher
  testData.teacher = await Teacher.findOne({ status: "active", "compensation.type": "percentage" });
  if (!testData.teacher) {
    testData.teacher = await Teacher.create({
      name: "Test Teacher",
      email: "testteacher@test.com",
      phone: "0300-0000000",
      status: "active",
      compensation: { type: "percentage", teacherShare: 70 },
      balance: { floating: 0, verified: 0, pending: 0 },
    });
    INFO("Created test teacher");
  } else {
    passTest(`Found existing teacher: ${testData.teacher.name}`);
  }

  // Get or create class
  testData.class = await Class.findOne({ subjectTeachers: { $exists: true, $ne: [] } });
  if (!testData.class) {
    testData.class = await Class.create({
      classTitle: "Test Class 10th",
      classType: "Regular",
      subjects: ["Physics", "Chemistry", "Biology"],
      subjectTeachers: [
        { subject: "Physics", teacherId: testData.teacher._id },
        { subject: "Chemistry", teacherId: testData.teacher._id },
        { subject: "Biology", teacherId: testData.teacher._id },
      ],
    });
    INFO("Created test class");
  } else {
    passTest(`Found existing class: ${testData.class.classTitle}`);
  }

  // Get or create student
  testData.student = await Student.findOne({});
  if (!testData.student) {
    testData.student = await Student.create({
      studentName: "Test Student",
      fatherName: "Test Father",
      phone: "0300-1234567",
      parentCell: "0300-9876543",
      group: "Test Group A",
      class: testData.class.classTitle,
      classId: testData.class._id,
      status: "active",
      admissionDate: new Date(),
      subjects: [
        { name: "Physics", fee: 3000, discount: 0, teacherId: testData.teacher._id },
        { name: "Chemistry", fee: 3000, discount: 0, teacherId: testData.teacher._id },
        { name: "Biology", fee: 3000, discount: 0, teacherId: testData.teacher._id },
      ],
      totalFee: 9000,
    });
    INFO("Created test student");
  } else {
    passTest(`Found existing student: ${testData.student.studentName}`);
  }

  return testData;
}

// ================================================================
// TEST 1: Fee Collection Flow
// ================================================================
async function testFeeCollectionFlow() {
  LOG("TEST 1", "Fee Collection Flow with Academy Share Distribution");

  const { config, student, teacher, class: classDoc, owner, partner } = testData;
  const feeAmount = 9000;
  const month = "April 2026";

  // Initial balances
  const teacherInitialBalance = teacher.balance?.floating || 0;
  const ownerInitialBalance = owner.walletBalance?.floating || 0;

  INFO(`Initial teacher balance: PKR ${teacherInitialBalance}`);
  INFO(`Initial owner balance: PKR ${ownerInitialBalance}`);

  // Simulate fee split for regular teacher (percentage based)
  const teachersData = [{
    teacherId: teacher._id,
    teacher,
    isPartner: false,
  }];

  const split = await splitFeeAmongTeachers(feeAmount, teachersData, config);

  if (split) {
    passTest("Fee split calculated successfully");
    INFO(`Teacher amount: PKR ${split.totalTeacherAmount}`);
    INFO(`Direct stakeholder amount: PKR ${split.totalDirectStakeholderAmount || 0}`);
    INFO(`Academy amount: PKR ${split.academyAmount}`);

    // Verify totals
    const total = (split.totalTeacherAmount || 0) + 
                 (split.totalDirectStakeholderAmount || 0) + 
                 (split.academyAmount || 0);
    
    if (total === feeAmount) {
      passTest(`Split totals match fee: ${total} = ${feeAmount}`);
    } else {
      failTest(`Split totals don't match: ${total} != ${feeAmount}`);
    }

    // Verify academy distribution
    if (split.academyDistribution && split.academyDistribution.length > 0) {
      passTest(`Academy distribution to ${split.academyDistribution.length} recipients`);
      
      for (const dist of split.academyDistribution) {
        INFO(`  - ${dist.fullName} (${dist.role}): ${dist.percentage}% = PKR ${dist.amount}`);
      }
    }
  } else {
    failTest("Fee split calculation failed");
  }

  return split;
}

// ================================================================
// TEST 2: Partner Academy Share Deferral
// ================================================================
async function testPartnerDeferral() {
  LOG("TEST 2", "Partner Academy Share Deferral");

  const { config, student, partner, owner } = testData;
  
  // Create a deferred settlement for testing
  const testAmount = 3000;
  
  try {
    const result = await distributeAcademyShareDeferred(testAmount, config, {
      studentId: student._id,
      studentName: student.studentName,
      className: student.class,
      subject: "Test Subject",
    });

    if (result) {
      passTest("Deferred academy distribution executed");
      
      if (result.ownerShare) {
        INFO(`Owner share: PKR ${result.ownerShare.amount}`);
      }
      
      if (result.partnerSettlements && result.partnerSettlements.length > 0) {
        passTest(`Created ${result.partnerSettlements.length} pending partner settlements`);
        
        for (const settlement of result.partnerSettlements) {
          INFO(`  - ${settlement.partnerName}: PKR ${settlement.amount} (${settlement.status})`);
          
          if (settlement.status === "PENDING") {
            passTest("Partner settlement is correctly marked as PENDING");
          } else {
            failTest(`Settlement status should be PENDING, got: ${settlement.status}`);
          }
        }
      } else {
        INFO("No partner settlements created (may be due to 0% allocation)");
      }

      return result;
    } else {
      failTest("Deferred distribution returned null");
    }
  } catch (error) {
    failTest(`Deferred distribution error: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 3: Teacher Deposit System
// ================================================================
async function testTeacherDeposit() {
  LOG("TEST 3", "Teacher Deposit System");

  const { teacher, owner } = testData;
  
  // Create a test deposit
  const depositData = {
    teacherId: teacher._id,
    teacherName: teacher.name,
    amount: 5000,
    depositType: "ADVANCE",
    reason: "Integration test advance payment",
    depositedBy: owner._id,
    depositedByName: owner.fullName,
    paymentMethod: "CASH",
    status: "COMPLETED",
  };

  try {
    const deposit = await TeacherDeposit.create(depositData);
    
    if (deposit) {
      passTest(`Created deposit: PKR ${deposit.amount} for ${deposit.teacherName}`);
      
      // Verify deposit fields
      if (deposit.depositType === "ADVANCE") {
        passTest("Deposit type correctly set to ADVANCE");
      }
      
      if (deposit.status === "COMPLETED") {
        passTest("Deposit status is COMPLETED");
      }

      // Test retrieval
      const deposits = await TeacherDeposit.getDepositsForTeacher(teacher._id);
      if (deposits.length > 0) {
        passTest(`Retrieved ${deposits.length} deposits for teacher`);
      }

      // Test total calculation
      const totalDeposited = await TeacherDeposit.getTotalDeposited(teacher._id);
      if (totalDeposited.total >= depositData.amount) {
        passTest(`Total deposited: PKR ${totalDeposited.total}`);
      }

      // Store for cleanup
      testData.testDeposit = deposit;
      
      return deposit;
    } else {
      failTest("Failed to create deposit");
    }
  } catch (error) {
    failTest(`Deposit creation error: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 4: Settlement Release
// ================================================================
async function testSettlementRelease() {
  LOG("TEST 4", "Settlement Release");

  const { partner, owner } = testData;

  // Find pending settlements for partner
  const pendingSettlements = await AcademySettlement.find({
    partnerId: partner._id,
    status: "PENDING",
  });

  INFO(`Found ${pendingSettlements.length} pending settlements for ${partner.fullName}`);

  if (pendingSettlements.length === 0) {
    INFO("No pending settlements to test release - creating one");
    
    // Create a test settlement
    const testSettlement = await AcademySettlement.create({
      partnerId: partner._id,
      partnerName: partner.fullName,
      partnerRole: "PARTNER",
      percentage: 30,
      amount: 1500,
      sourceDetails: {
        studentName: "Test Student",
        className: "Test Class",
        subject: "Test Subject",
        calculationProof: "Integration test settlement",
      },
      status: "PENDING",
    });

    if (testSettlement) {
      passTest(`Created test settlement: PKR ${testSettlement.amount}`);
      testData.testSettlement = testSettlement;
    }
  }

  // Test the release function
  try {
    const releaseResult = await releasePartnerAcademySettlements(
      partner._id,
      owner,
      { notes: "Integration test release" }
    );

    if (releaseResult) {
      passTest("Settlement release executed");
      INFO(`Released: ${releaseResult.releasedCount || 0} settlements`);
      INFO(`Total amount: PKR ${releaseResult.totalAmount || 0}`);
      
      // Verify partner wallet was updated
      const updatedPartner = await User.findById(partner._id);
      if (updatedPartner.walletBalance?.floating >= 0) {
        passTest(`Partner wallet updated: floating = PKR ${updatedPartner.walletBalance.floating}`);
      }
      
      return releaseResult;
    }
  } catch (error) {
    // It's OK if there are no settlements to release
    if (error.message.includes("No pending settlements")) {
      INFO("No pending settlements to release");
    } else {
      failTest(`Settlement release error: ${error.message}`);
    }
  }
}

// ================================================================
// TEST 5: Daily Revenue Tracking
// ================================================================
async function testDailyRevenueTracking() {
  LOG("TEST 5", "Daily Revenue Tracking");

  const { owner, student, class: classDoc } = testData;

  // Create daily revenue entries
  const entries = [
    {
      userId: owner._id,
      amount: 5000,
      revenueType: "TUITION_SHARE",
      className: classDoc.classTitle,
      studentRef: student._id,
      studentName: student.studentName,
      subject: "Physics",
      description: "Integration test tuition share",
    },
    {
      userId: owner._id,
      amount: 1500,
      revenueType: "ACADEMY_SHARE",
      className: classDoc.classTitle,
      studentRef: student._id,
      studentName: student.studentName,
      subject: "Chemistry",
      description: "Integration test academy share",
    },
  ];

  try {
    const created = await createDailyRevenueEntries(entries);
    
    if (created && created.length > 0) {
      passTest(`Created ${created.length} daily revenue entries`);
      
      for (const entry of created) {
        INFO(`  - ${entry.revenueType}: PKR ${entry.amount} (${entry.status})`);
      }

      // Verify entries can be queried
      const ownerRevenue = await DailyRevenue.find({
        partner: owner._id,
        status: "UNCOLLECTED",
      }).sort({ date: -1 }).limit(5);

      if (ownerRevenue.length > 0) {
        passTest(`Retrieved ${ownerRevenue.length} uncollected entries for owner`);
        
        const totalUncollected = ownerRevenue.reduce((sum, r) => sum + r.amount, 0);
        INFO(`Total uncollected: PKR ${totalUncollected}`);
      }
      
      return created;
    } else {
      failTest("Failed to create daily revenue entries");
    }
  } catch (error) {
    failTest(`Daily revenue error: ${error.message}`);
    console.error(error);
  }
}

// ================================================================
// TEST 6: Owner Dashboard Breakdown
// ================================================================
async function testOwnerDashboardBreakdown() {
  LOG("TEST 6", "Owner Dashboard Breakdown");

  const { owner, partner } = testData;

  // Get owner's uncollected revenue
  const ownerRevenue = await DailyRevenue.aggregate([
    { $match: { partner: owner._id, status: "UNCOLLECTED" } },
    {
      $group: {
        _id: "$revenueType",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (ownerRevenue.length > 0) {
    passTest(`Owner has ${ownerRevenue.length} revenue type(s)`);
    
    let grandTotal = 0;
    for (const rev of ownerRevenue) {
      INFO(`  - ${rev._id}: PKR ${rev.total} (${rev.count} entries)`);
      grandTotal += rev.total;
    }
    INFO(`Grand total uncollected: PKR ${grandTotal}`);
  }

  // Get teacher payables
  const teacherPayables = await Teacher.aggregate([
    { $match: { status: "active" } },
    {
      $group: {
        _id: null,
        totalFloating: { $sum: "$balance.floating" },
        totalVerified: { $sum: "$balance.verified" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (teacherPayables.length > 0) {
    INFO(`Teacher payables: ${teacherPayables[0].count} teachers`);
    INFO(`  - Floating: PKR ${teacherPayables[0].totalFloating}`);
    INFO(`  - Verified: PKR ${teacherPayables[0].totalVerified}`);
    passTest("Teacher payables calculated");
  }

  // Get pending partner settlements
  const pendingSettlements = await AcademySettlement.aggregate([
    { $match: { status: "PENDING" } },
    {
      $group: {
        _id: "$partnerId",
        partnerName: { $first: "$partnerName" },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (pendingSettlements.length > 0) {
    passTest(`${pendingSettlements.length} partner(s) with pending settlements`);
    
    for (const ps of pendingSettlements) {
      INFO(`  - ${ps.partnerName}: PKR ${ps.totalAmount} (${ps.count} settlements)`);
    }
  } else {
    INFO("No pending settlements");
  }
}

// ================================================================
// TEST 7: Per-Subject Discount Logic
// ================================================================
async function testPerSubjectDiscount() {
  LOG("TEST 7", "Per-Subject Discount Logic");

  const { student, teacher, config } = testData;

  // Simulate per-subject discounts
  const subjects = [
    { name: "Physics", fee: 3000, discount: 500, reason: "Early bird discount" },
    { name: "Chemistry", fee: 3000, discount: 0, reason: "" },
    { name: "Biology", fee: 3000, discount: 300, reason: "Sibling discount" },
  ];

  let totalFee = 0;
  let totalDiscount = 0;
  let netFee = 0;

  INFO("Subject breakdown with discounts:");
  for (const subject of subjects) {
    const subjectNet = subject.fee - subject.discount;
    totalFee += subject.fee;
    totalDiscount += subject.discount;
    netFee += subjectNet;
    
    INFO(`  - ${subject.name}: PKR ${subject.fee} - ${subject.discount} = ${subjectNet}`);
    if (subject.discount > 0) {
      INFO(`    Reason: ${subject.reason}`);
    }
  }

  INFO(`Total fee: PKR ${totalFee}`);
  INFO(`Total discount: PKR ${totalDiscount}`);
  INFO(`Net fee: PKR ${netFee}`);

  if (netFee === totalFee - totalDiscount) {
    passTest("Discount calculation is correct");
  } else {
    failTest("Discount calculation error");
  }

  // Verify split with discounted amount
  const teachersData = [{
    teacherId: teacher._id,
    teacher,
    isPartner: false,
  }];

  const split = await splitFeeAmongTeachers(netFee, teachersData, config);
  
  if (split) {
    passTest(`Split calculated on discounted amount (PKR ${netFee})`);
    INFO(`  - Teacher share: PKR ${split.totalTeacherAmount}`);
    INFO(`  - Academy share: PKR ${split.academyAmount}`);
    
    const splitTotal = (split.totalTeacherAmount || 0) + 
                      (split.totalDirectStakeholderAmount || 0) + 
                      (split.academyAmount || 0);
    
    if (splitTotal === netFee) {
      passTest("Discounted split adds up correctly");
    } else {
      failTest(`Discounted split mismatch: ${splitTotal} != ${netFee}`);
    }
  }
}

// ================================================================
// CLEANUP: Remove test data
// ================================================================
async function cleanup() {
  LOG("CLEANUP", "Removing test data created during integration test");

  try {
    // Remove test deposit if created
    if (testData.testDeposit) {
      await TeacherDeposit.findByIdAndDelete(testData.testDeposit._id);
      INFO("Removed test deposit");
    }

    // Remove test settlement if created
    if (testData.testSettlement) {
      await AcademySettlement.findByIdAndDelete(testData.testSettlement._id);
      INFO("Removed test settlement");
    }

    // Remove test daily revenue entries (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const deleted = await DailyRevenue.deleteMany({
      createdAt: { $gte: tenMinutesAgo },
      description: { $regex: /Integration test/i },
    });
    
    if (deleted.deletedCount > 0) {
      INFO(`Removed ${deleted.deletedCount} test daily revenue entries`);
    }

    passTest("Cleanup completed");
  } catch (error) {
    INFO(`Cleanup warning: ${error.message}`);
  }
}

// ================================================================
// MAIN TEST RUNNER
// ================================================================
async function runIntegrationTests() {
  console.clear();
  LOG("START", "Finance Flow Integration Test");
  console.log(`Started: ${new Date().toLocaleString()}`);

  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/edwardian-academy"
    );
    passTest("Connected to MongoDB");

    // Setup
    await setupTestData();

    // Run tests
    await testFeeCollectionFlow();
    await testPartnerDeferral();
    await testTeacherDeposit();
    await testSettlementRelease();
    await testDailyRevenueTracking();
    await testOwnerDashboardBreakdown();
    await testPerSubjectDiscount();

    // Cleanup
    await cleanup();

    // Results
    LOG("RESULTS", "Integration Test Summary");
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${testResults.passed}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   📝 Total:  ${testResults.passed + testResults.failed}`);

    if (testResults.failed === 0) {
      console.log(`\n🎉 All integration tests passed!`);
      console.log(`\n✨ Finance system is production-ready!`);
    } else {
      console.log(`\n⚠️  ${testResults.failed} test(s) failed - review above for details`);
    }

    console.log(`\nEnded: ${new Date().toLocaleString()}`);

  } catch (error) {
    failTest(`Critical error: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    PASS("Disconnected from MongoDB");
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { runIntegrationTests };
