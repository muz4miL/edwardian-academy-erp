/**
 * Revenue Split Helper - Edwardian Academy Financial Engine
 *
 * Complex Revenue Distribution Logic based on:
 * - Subject Type (ETEA/MDCAT vs Regular)
 * - Teacher Role (Owner/Partner vs Staff)
 * - Grade Level (9th/10th vs 11th/12th)
 *
 * Revenue Streams:
 * - OWNER_CHEMISTRY: Waqar's Chemistry (100%)
 * - PARTNER_BIO: Zahid's Biology (100%)
 * - PARTNER_PHYSICS: Saud's Physics (100%)
 * - STAFF_TUITION: Regular staff (70/30)
 * - ACADEMY_POOL: 30% from staff goes here for distribution
 * - ETEA_POOL: ETEA surplus after teacher payment
 *
 * ETEA Hybrid Logic:
 * - Partners (OWNER/PARTNER): Get 100% of fee (as Commission + Tuition transactions)
 * - Staff: Get commission only, rest to Academy Pool
 */

const Configuration = require("../models/Configuration");
const Teacher = require("../models/Teacher");
const User = require("../models/User");

/**
 * Calculate Revenue Split based on Edwardian Standard
 *
 * @param {Object} params
 * @param {Number} params.fee - Total fee amount
 * @param {String} params.gradeLevel - Grade level (9th Grade, 10th Grade, MDCAT Prep, etc.)
 * @param {String} params.sessionType - Session type (regular, etea, mdcat)
 * @param {String} params.subject - Subject name (Chemistry, Physics, English, etc.)
 * @param {String} params.teacherId - Teacher ObjectId
 * @param {String} params.teacherRole - Teacher's role (OWNER, PARTNER, STAFF)
 * @param {Object} params.config - Configuration document (optional, will fetch if not provided)
 *
 * @returns {Object} Split details
 */
async function calculateRevenueSplit({
  fee,
  gradeLevel,
  sessionType,
  subject,
  teacherId,
  teacherRole,
  config = null,
}) {
  console.log("\n=== CALCULATE REVENUE SPLIT ===");
  console.log(`Fee: PKR ${fee}`);
  console.log(`Grade: ${gradeLevel}, Session: ${sessionType}`);
  console.log(`Subject: ${subject}, Teacher Role: ${teacherRole}`);

  // Fetch config if not provided
  if (!config) {
    config = await Configuration.findOne();
  }

  // Default split ratios from config
  const staffTeacherShare = config?.salaryConfig?.teacherShare || 70;
  const staffAcademyShare = config?.salaryConfig?.academyShare || 30;
  const partner100Rule = config?.partner100Rule !== false; // Default true

  // UNIVERSAL ETEA Commission Rate (same for ALL subjects)
  const eteaCommission = config?.eteaConfig?.perStudentCommission || 3000;

  // Determine if this is ETEA/MDCAT
  const isETEA =
    sessionType === "etea" ||
    sessionType === "mdcat" ||
    sessionType === "ecat" ||
    sessionType === "test-prep" ||
    gradeLevel === "MDCAT Prep" ||
    gradeLevel === "ECAT Prep";

  // Check if teacher is a partner (OWNER or PARTNER)
  const isPartner = teacherRole === "OWNER" || teacherRole === "PARTNER";

  // Initialize split values
  let teacherCommission = 0; // Commission portion
  let teacherTuition = 0; // Tuition portion (for partners only)
  let poolRevenue = 0;
  let stream = "STAFF_TUITION"; // Default
  let splitType = "STAFF_70_30";

  // === RULE 1: ETEA/MDCAT Logic ===
  if (isETEA) {
    // Universal commission for ALL ETEA teachers (regardless of subject)
    teacherCommission = eteaCommission;

    if (isPartner && partner100Rule) {
      // PARTNERS: Get 100% of fee (Commission + Tuition) → VERIFIED (Cash)
      teacherTuition = fee - eteaCommission;
      poolRevenue = 0;
      splitType = "ETEA_PARTNER_100";
      stream = teacherRole === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_ETEA";
      console.log(
        `👑 ETEA Partner: Commission PKR ${teacherCommission} + Tuition PKR ${teacherTuition} = 100% (PKR ${fee})`,
      );
    } else {
      // STAFF: Get commission only → PENDING (Paid at end of session)
      // Rest goes to Academy Pool
      teacherTuition = 0;
      poolRevenue = fee - eteaCommission;
      splitType = "ETEA_STAFF_COMMISSION";
      stream = "ETEA_POOL";
      console.log(
        `👨‍🏫 ETEA Staff: Commission PKR ${teacherCommission} (PENDING), Pool PKR ${poolRevenue}`,
      );
    }
  }
  // === RULE 2: Regular Partner 100% Rule ===
  else if (partner100Rule && isPartner) {
    teacherCommission = 0;
    teacherTuition = fee;
    poolRevenue = 0;
    splitType = "PARTNER_100";

    // Determine specific stream based on teacher
    if (teacherRole === "OWNER") {
      stream = "OWNER_CHEMISTRY";
    } else {
      // Identify partner stream based on subject
      const subjectLower = (subject || "").toLowerCase();
      if (
        subjectLower.includes("bio") ||
        subjectLower.includes("zoology") ||
        subjectLower.includes("botany")
      ) {
        stream = "PARTNER_BIO";
      } else if (subjectLower.includes("physics")) {
        stream = "PARTNER_PHYSICS";
      } else {
        stream = "STAFF_TUITION"; // Fallback
      }
    }
    console.log(`👑 Partner 100% Rule: ${stream} - Full PKR ${fee} to teacher`);
  }
  // === RULE 3: Default Staff 70/30 ===
  else {
    const totalTeacher = Math.round((fee * staffTeacherShare) / 100);
    teacherCommission = 0;
    teacherTuition = totalTeacher;
    poolRevenue = fee - totalTeacher; // Ensures no rounding loss
    stream = "STAFF_TUITION";
    splitType = "STAFF_70_30";
    console.log(
      `👨‍🏫 Staff Split: Teacher ${staffTeacherShare}% = PKR ${totalTeacher}, Pool ${staffAcademyShare}% = PKR ${poolRevenue}`,
    );
  }

  // Total teacher revenue (for backward compatibility)
  const teacherRevenue = teacherCommission + teacherTuition;

  // Determine grade category for reporting
  let gradeCategory = "OTHER";
  if (gradeLevel) {
    if (gradeLevel.includes("9th") || gradeLevel.includes("10th")) {
      gradeCategory = "MATRIC";
    } else if (gradeLevel.includes("11th") || gradeLevel.includes("12th")) {
      gradeCategory = "FSC";
    } else if (
      gradeLevel.includes("MDCAT") ||
      gradeLevel.includes("ECAT") ||
      isETEA
    ) {
      gradeCategory = "ETEA";
    }
  }

  const result = {
    totalFee: fee,
    teacherRevenue, // Total (Commission + Tuition)
    teacherCommission, // Commission portion
    teacherTuition, // Tuition portion
    poolRevenue,
    stream,
    splitType,
    teacherId,
    teacherRole,
    gradeCategory,
    isETEA,
    isPartner,
    config: {
      staffTeacherShare,
      staffAcademyShare,
      partner100Rule,
      eteaCommission, // Universal ETEA per-student commission
    },
  };

  console.log("📊 Split Result:", JSON.stringify(result, null, 2));
  return result;
}

/**
 * Create Transaction Records for Revenue Split
 *
 * ETEA Hybrid Logic:
 * - Partners: Create TWO transactions (Commission + Tuition) → Both go to floating cash
 * - Staff: Create ONE transaction (Commission Only) → Pool gets the rest
 *
 * @param {Object} splitResult - Result from calculateRevenueSplit
 * @param {Object} student - Student document
 * @param {Object} teacher - Teacher document
 * @param {String} collectedById - ID of user who collected payment
 *
 * @returns {Object} Created transactions
 */
async function createRevenueSplitTransactions({
  splitResult,
  student,
  teacher,
  collectedById,
}) {
  const Transaction = require("../models/Transaction");
  const mongoose = require("mongoose");

  const transactions = [];
  const batchId = new mongoose.Types.ObjectId();

  // === ETEA Partner: Create TWO transactions (Commission + Tuition) ===
  if (splitResult.isETEA && splitResult.isPartner) {
    // Transaction 1: ETEA Commission
    if (splitResult.teacherCommission > 0) {
      const commissionTx = await Transaction.create({
        type: "INCOME",
        category: "Tuition",
        stream: "PARTNER_ETEA",
        amount: splitResult.teacherCommission,
        description: `${student.studentName} - ETEA Commission`,
        collectedBy: collectedById,
        studentId: student._id,
        status: "VERIFIED", // Immediate cash
        splitDetails: {
          teacherShare: splitResult.teacherCommission,
          academyShare: 0,
          teacherPercentage: 100,
          academyPercentage: 0,
          teacherId: teacher?._id,
          teacherName: teacher?.name,
          isPaid: true, // Immediate payout
        },
        distributionId: batchId,
        date: new Date(),
      });
      transactions.push(commissionTx);
      console.log(
        `✅ Partner ETEA Commission: PKR ${splitResult.teacherCommission} (VERIFIED)`,
      );
    }

    // Transaction 2: ETEA Tuition (remaining after commission)
    if (splitResult.teacherTuition > 0) {
      const tuitionTx = await Transaction.create({
        type: "INCOME",
        category: "Tuition",
        stream: splitResult.stream, // OWNER_CHEMISTRY or PARTNER_ETEA
        amount: splitResult.teacherTuition,
        description: `${student.studentName} - ETEA Tuition Revenue`,
        collectedBy: collectedById,
        studentId: student._id,
        status: "VERIFIED", // Immediate cash
        splitDetails: {
          teacherShare: splitResult.teacherTuition,
          academyShare: 0,
          teacherPercentage: 100,
          academyPercentage: 0,
          teacherId: teacher?._id,
          teacherName: teacher?.name,
          isPaid: true, // Immediate payout
        },
        distributionId: batchId,
        date: new Date(),
      });
      transactions.push(tuitionTx);
      console.log(
        `✅ Partner ETEA Tuition: PKR ${splitResult.teacherTuition} (VERIFIED)`,
      );
    }

    // Update teacher balance
    if (teacher) {
      if (!teacher.balance) {
        teacher.balance = { floating: 0, verified: 0 };
      }
      teacher.balance.verified += splitResult.teacherRevenue;
      await teacher.save();
      console.log(
        `💰 Updated ${teacher.name} balance: +PKR ${splitResult.teacherRevenue}`,
      );
    }
  }
  // === ETEA Staff: Create ONE commission transaction + Pool transaction ===
  else if (splitResult.isETEA && !splitResult.isPartner) {
    // Commission Transaction (PENDING - processed later)
    if (splitResult.teacherCommission > 0) {
      const commissionTx = await Transaction.create({
        type: "INCOME",
        category: "Tuition",
        stream: "STAFF_TUITION",
        amount: splitResult.teacherCommission,
        description: `${student.studentName} - ETEA Staff Commission`,
        collectedBy: collectedById,
        studentId: student._id,
        status: "FLOATING", // Pending until paid
        splitDetails: {
          teacherShare: splitResult.teacherCommission,
          academyShare: splitResult.poolRevenue,
          teacherPercentage: Math.round(
            (splitResult.teacherCommission / splitResult.totalFee) * 100,
          ),
          academyPercentage: Math.round(
            (splitResult.poolRevenue / splitResult.totalFee) * 100,
          ),
          teacherId: teacher?._id,
          teacherName: teacher?.name,
          isPaid: false, // Not yet paid
        },
        distributionId: batchId,
        date: new Date(),
      });
      transactions.push(commissionTx);
      console.log(
        `✅ Staff ETEA Commission: PKR ${splitResult.teacherCommission} (FLOATING)`,
      );

      // Update teacher pending balance (Staff gets paid later)
      if (teacher) {
        if (!teacher.balance) {
          teacher.balance = { floating: 0, verified: 0, pending: 0 };
        }
        teacher.balance.pending =
          (teacher.balance.pending || 0) + splitResult.teacherCommission;
        await teacher.save();
        console.log(
          `📝 Updated ${teacher.name} pending balance: +PKR ${splitResult.teacherCommission}`,
        );
      }
    }

    // Pool Transaction (immediate)
    if (splitResult.poolRevenue > 0) {
      const poolTx = await Transaction.create({
        type: "INCOME",
        category: "Pool",
        stream: "UNALLOCATED_POOL",
        amount: splitResult.poolRevenue,
        description: `${student.studentName} - ETEA Academy Pool`,
        collectedBy: collectedById,
        studentId: student._id,
        status: "VERIFIED",
        isDistributed: false, // Will be distributed by distributePool
        distributionId: batchId,
        date: new Date(),
      });
      transactions.push(poolTx);
      console.log(`✅ ETEA Pool Transaction: PKR ${splitResult.poolRevenue}`);
    }
  }
  // === Regular Partner 100%: Single full transaction ===
  else if (splitResult.splitType === "PARTNER_100") {
    const teacherTx = await Transaction.create({
      type: "INCOME",
      category:
        splitResult.stream === "OWNER_CHEMISTRY" ? "Chemistry" : "Tuition",
      stream: splitResult.stream,
      amount: splitResult.teacherRevenue,
      description: `${student.studentName} - ${splitResult.stream} (100%)`,
      collectedBy: collectedById,
      studentId: student._id,
      status: "VERIFIED",
      splitDetails: {
        teacherShare: splitResult.teacherRevenue,
        academyShare: 0,
        teacherPercentage: 100,
        academyPercentage: 0,
        teacherId: teacher?._id,
        teacherName: teacher?.name,
        isPaid: true,
      },
      distributionId: batchId,
      date: new Date(),
    });
    transactions.push(teacherTx);
    console.log(
      `✅ Partner 100% Transaction: PKR ${splitResult.teacherRevenue} (VERIFIED)`,
    );

    // Update teacher balance
    if (teacher) {
      if (!teacher.balance) {
        teacher.balance = { floating: 0, verified: 0 };
      }
      teacher.balance.verified += splitResult.teacherRevenue;
      await teacher.save();
      console.log(
        `💰 Updated ${teacher.name} balance: +PKR ${splitResult.teacherRevenue}`,
      );
    }
  }
  // === Regular Staff 70/30: Teacher + Pool transactions ===
  else {
    // Teacher Share Transaction
    if (splitResult.teacherRevenue > 0) {
      const teacherTx = await Transaction.create({
        type: "INCOME",
        category: "Tuition",
        stream: splitResult.stream,
        amount: splitResult.teacherRevenue,
        description: `${student.studentName} - Teacher Share (${splitResult.config.staffTeacherShare}%)`,
        collectedBy: collectedById,
        studentId: student._id,
        status: "FLOATING",
        splitDetails: {
          teacherShare: splitResult.teacherRevenue,
          academyShare: splitResult.poolRevenue,
          teacherPercentage: splitResult.config.staffTeacherShare,
          academyPercentage: splitResult.config.staffAcademyShare,
          teacherId: teacher?._id,
          teacherName: teacher?.name,
          isPaid: false,
        },
        distributionId: batchId,
        date: new Date(),
      });
      transactions.push(teacherTx);
      console.log(
        `✅ Staff Teacher Transaction: PKR ${splitResult.teacherRevenue} (FLOATING)`,
      );

      // Update teacher pending balance (Staff gets paid at session end)
      if (teacher) {
        if (!teacher.balance) {
          teacher.balance = { floating: 0, verified: 0, pending: 0 };
        }
        teacher.balance.pending =
          (teacher.balance.pending || 0) + splitResult.teacherRevenue;
        await teacher.save();
        console.log(
          `📝 Updated ${teacher.name} pending balance: +PKR ${splitResult.teacherRevenue}`,
        );
      }
    }

    // Pool Share Transaction
    if (splitResult.poolRevenue > 0) {
      const poolTx = await Transaction.create({
        type: "INCOME",
        category: "Pool",
        stream: "UNALLOCATED_POOL",
        amount: splitResult.poolRevenue,
        description: `${student.studentName} - Academy Pool (${splitResult.config.staffAcademyShare}%)`,
        collectedBy: collectedById,
        studentId: student._id,
        status: "VERIFIED",
        isDistributed: false,
        distributionId: batchId,
        date: new Date(),
      });
      transactions.push(poolTx);
      console.log(`✅ Pool Transaction: PKR ${splitResult.poolRevenue}`);
    }
  }

  return {
    transactions,
    batchId,
    totalTeacher: splitResult.teacherRevenue,
    totalPool: splitResult.poolRevenue,
    isPartner: splitResult.isPartner,
    isETEA: splitResult.isETEA,
  };
}

/**
 * Get teacher role from Teacher document or linked User
 *
 * @param {Object} teacher - Teacher document
 * @returns {String} Role (OWNER, PARTNER, STAFF)
 */
async function getTeacherRole(teacher) {
  if (!teacher) return "STAFF";

  // Check if teacher has linked User account
  if (teacher.userId) {
    const user = await User.findById(teacher.userId);
    if (user) {
      return user.role; // OWNER, PARTNER, or STAFF
    }
  }

  // Fallback: Check teacher name for known partners
  const nameLower = (teacher.name || "").toLowerCase();
  if (nameLower.includes("waqar")) return "OWNER";
  if (nameLower.includes("zahid") || nameLower.includes("saud"))
    return "PARTNER";

  return "STAFF";
}

/**
 * Process Multi-Subject Revenue Distribution
 *
 * This is the NEW subject-wise teacher credit system.
 * For each enrolled subject:
 *   1. Find the specific teacher for that subject from Class.subjectTeachers
 *   2. Calculate revenue split based on that teacher's role
 *   3. Credit the correct teacher
 *
 * @param {Object} params
 * @param {Object} params.student - Student document with subjects array
 * @param {Object} params.classDoc - Class document with subjectTeachers array
 * @param {Number} params.paidAmount - Total amount paid
 * @param {String} params.collectedById - User ID who collected payment
 *
 * @returns {Object} Combined revenue split results
 */
async function processMultiSubjectRevenue({
  student,
  classDoc,
  paidAmount,
  collectedById,
}) {
  console.log("\n=== MULTI-SUBJECT REVENUE DISTRIBUTION ===");
  console.log(`Student: ${student.studentName}`);
  console.log(`Class: ${classDoc.classTitle}`);
  console.log(`Paid Amount: PKR ${paidAmount}`);
  console.log(`Enrolled Subjects: ${student.subjects?.length || 0}`);

  const results = {
    transactions: [],
    totalTeacher: 0,
    totalPool: 0,
    subjectBreakdown: [],
  };

  // If no subjects or no paid amount, return empty result
  if (!student.subjects || student.subjects.length === 0 || paidAmount <= 0) {
    console.log("⚠️ No subjects or no payment - skipping revenue distribution");
    return results;
  }

  // Calculate total fee from subjects to determine proportional split
  const totalSubjectFees = student.subjects.reduce(
    (sum, s) => sum + (s.fee || 0),
    0,
  );

  // If totalSubjectFees is 0, distribute equally
  const useEqualDistribution = totalSubjectFees === 0;

  for (const enrolledSubject of student.subjects) {
    const subjectName = enrolledSubject.name;
    const subjectFee = enrolledSubject.fee || 0;

    // Calculate this subject's share of the payment
    let subjectPaymentShare;
    if (useEqualDistribution) {
      subjectPaymentShare = Math.round(paidAmount / student.subjects.length);
    } else {
      subjectPaymentShare =
        totalSubjectFees > 0
          ? Math.round((subjectFee / totalSubjectFees) * paidAmount)
          : 0;
    }

    console.log(`\n📚 Subject: ${subjectName}`);
    console.log(`   Fee: PKR ${subjectFee}`);
    console.log(`   Payment Share: PKR ${subjectPaymentShare}`);

    // Find the specific teacher for this subject from Class.subjectTeachers
    let subjectTeacher = null;
    const subjectTeacherMapping = classDoc.subjectTeachers?.find(
      (st) => st.subject?.toLowerCase() === subjectName?.toLowerCase(),
    );

    if (subjectTeacherMapping?.teacherId) {
      subjectTeacher = await Teacher.findById(subjectTeacherMapping.teacherId);
      console.log(
        `   🎯 Subject Teacher: ${subjectTeacher?.name || "Not Found"}`,
      );
    }

    // Fallback to class's assigned teacher if no specific mapping
    if (!subjectTeacher && classDoc.assignedTeacher) {
      subjectTeacher = await Teacher.findById(classDoc.assignedTeacher);
      console.log(
        `   ⚠️ Fallback to Class Teacher: ${subjectTeacher?.name || "None"}`,
      );
    }

    if (!subjectTeacher) {
      console.log(
        `   ❌ No teacher found for ${subjectName} - skipping revenue split`,
      );
      continue;
    }

    // Get teacher role for this specific teacher
    const teacherRole = await getTeacherRole(subjectTeacher);
    console.log(`   Role: ${teacherRole}`);

    // Calculate revenue split for this subject
    const splitResult = await calculateRevenueSplit({
      fee: subjectPaymentShare,
      gradeLevel: classDoc.gradeLevel,
      sessionType: classDoc.sessionType || "regular",
      subject: subjectName,
      teacherId: subjectTeacher._id,
      teacherRole: teacherRole,
    });

    // Create transactions for this subject
    if (collectedById && subjectPaymentShare > 0) {
      const txResult = await createRevenueSplitTransactions({
        splitResult,
        student,
        teacher: subjectTeacher,
        collectedById,
      });

      results.transactions.push(...txResult.transactions);
      results.totalTeacher += txResult.totalTeacher;
      results.totalPool += txResult.totalPool;

      results.subjectBreakdown.push({
        subject: subjectName,
        fee: subjectFee,
        paymentShare: subjectPaymentShare,
        teacherName: subjectTeacher.name,
        teacherShare: txResult.totalTeacher,
        poolShare: txResult.totalPool,
      });

      console.log(
        `   ✅ Revenue Split: Teacher PKR ${txResult.totalTeacher}, Pool PKR ${txResult.totalPool}`,
      );
    }
  }

  console.log("\n=== MULTI-SUBJECT SUMMARY ===");
  console.log(`Total Transactions: ${results.transactions.length}`);
  console.log(`Total to Teachers: PKR ${results.totalTeacher}`);
  console.log(`Total to Pool: PKR ${results.totalPool}`);
  console.log(
    "Subject Breakdown:",
    JSON.stringify(results.subjectBreakdown, null, 2),
  );

  return results;
}

module.exports = {
  calculateRevenueSplit,
  createRevenueSplitTransactions,
  getTeacherRole,
  processMultiSubjectRevenue,
};
