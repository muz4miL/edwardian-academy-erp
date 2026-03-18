/**
 * ================================================================
 * REVENUE ENGINE — Edwardian Academy Finance v2
 * ================================================================
 * Handles two revenue flows:
 * 1. TUITION MODE: Owner/Partner teachers → 100% split equally → dashboard close
 * 2. ACADEMY MODE: Regular teachers → teacher share + academy share → reports + dashboard close
 * 
 * Auto-detects mode from teacher roles assigned to the class.
 * All calculations use integer arithmetic (PKR has no decimals).
 * ================================================================
 */

const Teacher = require("../models/Teacher");
const User = require("../models/User");
const Class = require("../models/Class");
const Configuration = require("../models/Configuration");
const DailyRevenue = require("../models/DailyRevenue");

/**
 * Detect class revenue mode based on assigned teacher roles.
 * If ANY subject teacher is OWNER or PARTNER → TUITION mode.
 * Otherwise → ACADEMY mode.
 * 
 * @param {Object} classDoc - The class document (lean or populated)
 * @returns {Promise<{mode: string, ownerPartnerTeachers: Array, regularTeachers: Array}>}
 */
async function detectClassRevenueMode(classDoc) {
  if (!classDoc || !classDoc.subjectTeachers || classDoc.subjectTeachers.length === 0) {
    return { mode: "ACADEMY", ownerPartnerTeachers: [], regularTeachers: [] };
  }

  const ownerPartnerTeachers = [];
  const regularTeachers = [];

  // Collect unique teacher IDs
  const teacherIds = [...new Set(
    classDoc.subjectTeachers
      .filter(st => st.teacherId)
      .map(st => st.teacherId.toString())
  )];

  // Batch-load all teachers
  const teachers = await Teacher.find({ _id: { $in: teacherIds } }).lean();
  const teacherMap = new Map(teachers.map(t => [t._id.toString(), t]));

  // Also load User records to check roles
  const users = await User.find({
    $or: [
      { teacherId: { $in: teacherIds.map(id => id) } },
      { role: { $in: ["OWNER", "PARTNER"] } },
    ],
  }).lean();

  // Build teacherId → user role map
  const teacherToUserRole = new Map();
  for (const user of users) {
    if (user.teacherId) {
      teacherToUserRole.set(user.teacherId.toString(), {
        role: user.role,
        userId: user._id,
        fullName: user.fullName,
      });
    }
  }

  for (const st of classDoc.subjectTeachers) {
    if (!st.teacherId) continue;
    const tid = st.teacherId.toString();
    const teacher = teacherMap.get(tid);
    if (!teacher) continue;

    const userInfo = teacherToUserRole.get(tid);
    const role = userInfo?.role || resolveRoleFromName(teacher.name);

    const entry = {
      teacherId: teacher._id,
      teacherName: teacher.name,
      subject: st.subject,
      role,
      userId: userInfo?.userId || null,
      userFullName: userInfo?.fullName || teacher.name,
    };

    if (role === "OWNER" || role === "PARTNER") {
      ownerPartnerTeachers.push(entry);
    } else {
      regularTeachers.push(entry);
    }
  }

  const mode = ownerPartnerTeachers.length > 0 ? "TUITION" : "ACADEMY";

  return { mode, ownerPartnerTeachers, regularTeachers };
}

/**
 * Fallback role detection from teacher name
 */
function resolveRoleFromName(name) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("waqar")) return "OWNER";
  if (lower.includes("zahid") || lower.includes("saud")) return "PARTNER";
  return "TEACHER";
}

/**
 * Calculate tuition revenue split for a fee payment.
 * Uses configured tuitionPoolSplit percentages (e.g., Waqar 50%, Zahid 30%, Saud 20%).
 * ALWAYS uses configured percentages - no equal split fallback.
 *
 * @param {number} feeAmount - Total fee paid
 * @param {Array} ownerPartnerTeachers - Array of {teacherId, role, userId, userFullName, ...}
 * @param {Object} config - Configuration document with tuitionPoolSplit
 * @returns {Array<{userId, teacherId, teacherName, role, amount, percentage, description}>}
 */
async function calculateTuitionSplit(feeAmount, ownerPartnerTeachers, config) {
  if (!ownerPartnerTeachers || ownerPartnerTeachers.length === 0) return [];
  if (!config) config = await Configuration.findOne();

  // Get unique persons (by teacherId) to avoid double-counting if same person teaches multiple subjects
  const uniquePersons = [];
  const seen = new Set();
  for (const t of ownerPartnerTeachers) {
    const key = t.teacherId.toString();
    if (!seen.has(key)) {
      seen.add(key);
      uniquePersons.push(t);
    }
  }

  // ── Use configured tuitionPoolSplit OR academyShareSplit to find each person's percentage ──
  // Default to 50/30/20 split if no config (Waqar 50%, Zahid 30%, Saud 20%)
  const tuitionSplit = config?.tuitionPoolSplit || { waqar: 50, zahid: 30, saud: 20 };
  const academyShareSplit = config?.academyShareSplit || [];

  // Build a mapping: userId/teacherId → percentage
  const percentageMap = new Map();

  // First, try academyShareSplit (dynamic config with userId)
  for (const entry of academyShareSplit) {
    if (entry.userId) percentageMap.set(entry.userId.toString(), entry.percentage);
    if (entry.teacherId) percentageMap.set(entry.teacherId.toString(), entry.percentage);
  }

  // Second, fallback to legacy tuitionPoolSplit by name matching
  const nameToPercentage = {
    waqar: tuitionSplit.waqar || 50,
    zahid: tuitionSplit.zahid || 30,
    saud: tuitionSplit.saud || 20,
  };

  const result = [];
  let distributed = 0;

  for (let i = 0; i < uniquePersons.length; i++) {
    const person = uniquePersons[i];
    const isLast = i === uniquePersons.length - 1;

    // Find this person's configured percentage
    let percentage = null;

    // Check by userId
    if (person.userId && percentageMap.has(person.userId.toString())) {
      percentage = percentageMap.get(person.userId.toString());
    }
    // Check by teacherId
    else if (person.teacherId && percentageMap.has(person.teacherId.toString())) {
      percentage = percentageMap.get(person.teacherId.toString());
    }
    // Fallback: match by name (legacy - uses default 50/30/20 split)
    else {
      const personName = (person.teacherName || person.userFullName || "").toLowerCase();
      for (const [key, pct] of Object.entries(nameToPercentage)) {
        if (personName.includes(key)) {
          percentage = pct;
          break;
        }
      }
    }

    // If still no percentage found, default to 0 (should not happen with proper config)
    if (percentage === null) percentage = 0;

    // Last person gets remainder to avoid rounding errors
    let amount;
    if (isLast) {
      amount = feeAmount - distributed;
    } else {
      amount = Math.round((feeAmount * percentage) / 100);
    }

    distributed += amount;

    result.push({
      userId: person.userId,
      teacherId: person.teacherId,
      teacherName: person.teacherName || person.userFullName,
      role: person.role,
      amount,
      percentage: percentage || 0,
      description: `Tuition share: ${feeAmount} × ${percentage}% = ${amount}`,
    });
  }

  return result;
}

/**
 * Calculate academy (teacher-split) revenue for a fee payment.
 * Teacher gets their share based on compensation type.
 * Academy's share splits among Owner/Partners per config.
 * 
 * @param {number} feeAmount - Total fee paid
 * @param {Object} teacher - Teacher document
 * @param {Object} config - Configuration document
 * @returns {{teacherAmount, academyAmount, academyDistribution: Array}}
 */
async function calculateAcademySplit(feeAmount, teacher, config) {
  if (!config) config = await Configuration.findOne();

  let teacherAmount = 0;
  let academyAmount = 0;

  const compType = teacher?.compensation?.type || "percentage";

  if (compType === "percentage") {
    const teacherShare = teacher.compensation.teacherShare || config?.salaryConfig?.teacherShare || 70;
    teacherAmount = Math.round((feeAmount * teacherShare) / 100);
    academyAmount = feeAmount - teacherAmount;
  } else if (compType === "perStudent") {
    // Per-student: teacher gets fixed amount per student per session, rest is academy's
    // This is handled separately in payroll — for fee collection, full amount goes to academy share
    teacherAmount = 0;
    academyAmount = feeAmount;
  } else if (compType === "fixed") {
    // Fixed salary: teacher is paid monthly, all fee revenue goes to academy
    teacherAmount = 0;
    academyAmount = feeAmount;
  } else if (compType === "hybrid") {
    // Hybrid: teacher gets profitShare % of fee
    const profitShare = teacher.compensation.profitShare || 0;
    teacherAmount = Math.round((feeAmount * profitShare) / 100);
    academyAmount = feeAmount - teacherAmount;
  }

  // Distribute academy's share among Owner/Partners per config
  const academyDistribution = await distributeAcademyShare(academyAmount, config);

  return {
    teacherAmount,
    academyAmount,
    compensationType: compType,
    academyDistribution,
  };
}

/**
 * Distribute academy's share among Owner/Partners per configured ratios.
 * 
 * @param {number} amount - Academy's share amount
 * @param {Object} config - Configuration document
 * @returns {Array<{userId, teacherId, fullName, role, percentage, amount}>}
 */
async function distributeAcademyShare(amount, config) {
  if (!config) config = await Configuration.findOne();
  if (amount <= 0) return [];

  // Use dynamic academyShareSplit if configured
  if (config.academyShareSplit && config.academyShareSplit.length > 0) {
    let distributed = 0;
    const result = config.academyShareSplit.map((entry, index) => {
      const isLast = index === config.academyShareSplit.length - 1;
      const share = isLast
        ? amount - distributed // Last person gets remainder to avoid rounding issues
        : Math.round((amount * entry.percentage) / 100);
      distributed += share;

      return {
        userId: entry.userId,
        teacherId: entry.teacherId,
        fullName: entry.fullName,
        role: entry.role,
        percentage: entry.percentage,
        amount: share,
      };
    });
    return result;
  }

  // Fallback to legacy expenseSplit (hardcoded names)
  const split = config.expenseSplit || { waqar: 40, zahid: 30, saud: 30 };
  const partnerIds = config.partnerIds || {};

  const waqarShare = Math.round((amount * split.waqar) / 100);
  const zahidShare = Math.round((amount * split.zahid) / 100);
  const saudShare = amount - waqarShare - zahidShare;

  return [
    { userId: partnerIds.waqar, fullName: "Sir Waqar Baig", role: "OWNER", percentage: split.waqar, amount: waqarShare },
    { userId: partnerIds.zahid, fullName: "Dr. Zahid Khan", role: "PARTNER", percentage: split.zahid, amount: zahidShare },
    { userId: partnerIds.saud, fullName: "Sir Shah Saud", role: "PARTNER", percentage: split.saud, amount: saudShare },
  ].filter(p => p.amount > 0);
}

/**
 * Create DailyRevenue entries for Owner/Partner dashboard closing.
 * Called at fee collection time for real-time tracking.
 * 
 * @param {Array} entries - Array of {userId, amount, revenueType, classRef, className, studentRef, studentName, feeRecordRef, splitDetails}
 */
async function createDailyRevenueEntries(entries) {
  const now = new Date();
  const records = entries
    .filter(e => e.amount > 0 && e.userId)
    .map(entry => ({
      partner: entry.userId,
      date: now,
      amount: entry.amount,
      source: "TUITION",
      revenueType: entry.revenueType || "TUITION_SHARE",
      status: "UNCOLLECTED",
      classRef: entry.classRef || null,
      className: entry.className || "",
      studentRef: entry.studentRef || null,
      studentName: entry.studentName || "",
      feeRecordRef: entry.feeRecordRef || null,
      splitDetails: entry.splitDetails || {},
    }));

  if (records.length > 0) {
    await DailyRevenue.insertMany(records);
  }

  return records;
}

/**
 * Create withdrawal reversal DailyRevenue entries (negative adjustments).
 * Deducts from Owner/Partner closeable amounts.
 * 
 * @param {Array} deductions - Array of {userId, amount, className, studentName, description}
 */
async function createWithdrawalAdjustments(deductions) {
  const now = new Date();
  const records = deductions
    .filter(d => d.amount > 0 && d.userId)
    .map(d => ({
      partner: d.userId,
      date: now,
      amount: -Math.abs(d.amount), // Negative for deductions
      source: "TUITION",
      revenueType: "WITHDRAWAL_ADJUSTMENT",
      status: "UNCOLLECTED",
      className: d.className || "",
      studentName: d.studentName || "",
      splitDetails: {
        description: d.description || "Withdrawal refund adjustment",
        originalAmount: d.amount,
      },
    }));

  if (records.length > 0) {
    await DailyRevenue.insertMany(records);
  }

  return records;
}

/**
 * Get close preview for a specific user (Owner or Partner).
 * Returns all uncollected DailyRevenue entries grouped by type.
 * 
 * @param {string} userId - The user's ObjectId
 * @returns {Object} preview data with breakdown
 */
async function getClosePreview(userId) {
  const uncollected = await DailyRevenue.find({
    partner: userId,
    status: "UNCOLLECTED",
  }).sort({ date: -1 }).lean();

  let tuitionTotal = 0;
  let academyShareTotal = 0;
  let adjustmentTotal = 0;
  const tuitionItems = [];
  const academyShareItems = [];
  const adjustmentItems = [];

  for (const entry of uncollected) {
    const item = {
      _id: entry._id,
      date: entry.date,
      amount: entry.amount,
      className: entry.className,
      studentName: entry.studentName,
      description: entry.splitDetails?.description || "",
      splitDetails: entry.splitDetails,
    };

    switch (entry.revenueType) {
      case "TUITION_SHARE":
        tuitionTotal += entry.amount;
        tuitionItems.push(item);
        break;
      case "ACADEMY_SHARE":
        academyShareTotal += entry.amount;
        academyShareItems.push(item);
        break;
      case "WITHDRAWAL_ADJUSTMENT":
        adjustmentTotal += entry.amount; // Already negative
        adjustmentItems.push(item);
        break;
    }
  }

  const netTotal = tuitionTotal + academyShareTotal + adjustmentTotal;

  return {
    userId,
    netTotal,
    tuitionRevenue: { total: tuitionTotal, count: tuitionItems.length, items: tuitionItems },
    academyShareRevenue: { total: academyShareTotal, count: academyShareItems.length, items: academyShareItems },
    withdrawalAdjustments: { total: adjustmentTotal, count: adjustmentItems.length, items: adjustmentItems },
    totalEntries: uncollected.length,
  };
}

/**
 * Execute daily close for a user: mark all UNCOLLECTED → COLLECTED.
 * Returns detailed breakdown for the closing record.
 * 
 * @param {string} userId - User's ObjectId
 * @param {string} userName - User's name
 * @param {string} userRole - OWNER or PARTNER
 * @returns {Object} closing result
 */
async function executeDailyClose(userId, userName, userRole) {
  const preview = await getClosePreview(userId);

  if (preview.totalEntries === 0) {
    return { success: false, message: "No uncollected revenue to close." };
  }

  // Mark all as collected
  const now = new Date();
  await DailyRevenue.updateMany(
    { partner: userId, status: "UNCOLLECTED" },
    { $set: { status: "COLLECTED", collectedAt: now } }
  );

  // Build line items for audit
  const lineItems = [];
  for (const item of preview.tuitionRevenue.items) {
    lineItems.push({
      type: "TUITION_SHARE",
      className: item.className,
      studentName: item.studentName,
      amount: item.amount,
      description: item.description || item.splitDetails?.description || "",
    });
  }
  for (const item of preview.academyShareRevenue.items) {
    lineItems.push({
      type: "ACADEMY_SHARE",
      className: item.className,
      studentName: item.studentName,
      amount: item.amount,
      description: item.description || item.splitDetails?.description || "",
    });
  }
  for (const item of preview.withdrawalAdjustments.items) {
    lineItems.push({
      type: "WITHDRAWAL_ADJUSTMENT",
      className: item.className,
      studentName: item.studentName,
      amount: item.amount,
      description: item.description || item.splitDetails?.description || "",
    });
  }

  return {
    success: true,
    closedBy: userId,
    closedByName: userName,
    closedByRole: userRole,
    totalAmount: preview.netTotal,
    transactionCount: preview.totalEntries,
    breakdown: {
      tuitionRevenue: preview.tuitionRevenue.total,
      academyShareRevenue: preview.academyShareRevenue.total,
      withdrawalAdjustments: preview.withdrawalAdjustments.total,
      lineItems,
    },
  };
}

/**
 * ================================================================
 * MULTI-TEACHER SUBJECT SPLIT FUNCTION (NEW)
 * ================================================================
 * Handles complex scenarios with multiple teachers per subject
 * Respects each teacher's compensation type
 * 
 * @param {number} feeAmount - Total fee for this subject
 * @param {Array} teachersData - Array of {teacherId, teacher doc, compensationType, ...}
 * @param {Object} config - Configuration doc for academy split ratios
 * @returns {Promise<{teacherPayouts: Array, academyAmount: number, academyDistribution: Array}>}
 */
async function splitFeeAmongTeachers(feeAmount, teachersData, config) {
  if (!config) config = await Configuration.findOne();
  if (!teachersData || teachersData.length === 0) {
    // No teachers → all goes to academy
    const academyDist = await distributeAcademyShare(feeAmount, config);
    return {
      teacherPayouts: [],
      academyAmount: feeAmount,
      academyDistribution: academyDist,
    };
  }

  const teacherPayouts = [];
  let totalTeacherAmount = 0;

  for (const tData of teachersData) {
    const teacher = tData.teacher || (tData.teacherId ? await Teacher.findById(tData.teacherId) : null);
    if (!teacher) {
      continue; // Skip if teacher not found
    }

    const compType = teacher.compensation?.type || "percentage";
    let teacherShare = 0;
    let reason = "";

    if (compType === "percentage") {
      // Percentage split: gets X% of fee
      const percentage = teacher.compensation?.teacherShare || 70;
      teacherShare = Math.round((feeAmount * percentage) / 100);
      reason = `${percentage}% percentage split`;
    } else if (compType === "fixed") {
      // Fixed salary: gets 0 from fees (paid monthly)
      teacherShare = 0;
      reason = "Fixed salary (paid monthly, not from fees)";
    } else if (compType === "perStudent") {
      // Per-student: gets 0 from fees (calculated in payroll per active students)
      teacherShare = 0;
      reason = "Per-student compensation (calculated in payroll)";
    } else if (compType === "hybrid") {
      // Hybrid: gets profitShare % of fee
      const profitShare = teacher.compensation?.profitShare || 10;
      teacherShare = Math.round((feeAmount * profitShare) / 100);
      reason = `${profitShare}% profit share (hybrid)`;
    } else {
      // Default: 70/30
      teacherShare = Math.round((feeAmount * 70) / 100);
      reason = "70% default percentage split";
    }

    totalTeacherAmount += teacherShare;

    teacherPayouts.push({
      teacherId: teacher._id,
      teacherName: teacher.name,
      compensationType: compType,
      amount: teacherShare,
      percentage: compType === "percentage" ? (teacher.compensation?.teacherShare || 70) : undefined,
      reason,
      isPartner: tData.isPartner || false,
    });
  }

  // Academy gets remainder
  const academyAmount = feeAmount - totalTeacherAmount;

  // Distribute academy's share among Owner/Partners
  const academyDistribution = academyAmount > 0 
    ? await distributeAcademyShare(academyAmount, config)
    : [];

  return {
    teacherPayouts,
    academyAmount,
    academyDistribution,
    totalTeacherAmount,
    totalFee: feeAmount,
  };
}

module.exports = {
  detectClassRevenueMode,
  calculateTuitionSplit,
  calculateAcademySplit,
  distributeAcademyShare,
  splitFeeAmongTeachers,
  createDailyRevenueEntries,
  createWithdrawalAdjustments,
  getClosePreview,
  executeDailyClose,
  resolveRoleFromName,
};
