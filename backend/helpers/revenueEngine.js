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
const AcademySettlement = require("../models/AcademySettlement");

const normalizeObjectId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value._id) {
    if (typeof value._id === "string") return value._id;
    if (typeof value._id.toString === "function") return value._id.toString();
  }
  if (typeof value.toString === "function") {
    const str = value.toString();
    return str === "[object Object]" ? null : str;
  }
  return null;
};

const toSafeInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
};

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
  const teacherIds = [
    ...new Set(
      classDoc.subjectTeachers
        .map((st) => normalizeObjectId(st.teacherId))
        .filter(Boolean)
    ),
  ];

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
    const tid = normalizeObjectId(st.teacherId);
    if (!tid) continue;
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
    const key = normalizeObjectId(t.teacherId);
    if (!key) continue;
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

  const normalizedFee = toSafeInt(feeAmount);
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
      amount = normalizedFee - distributed;
    } else {
      amount = Math.floor((normalizedFee * percentage) / 100);
    }

    distributed += amount;

    result.push({
      userId: person.userId,
      teacherId: person.teacherId,
      teacherName: person.teacherName || person.userFullName,
      role: person.role,
      amount,
      percentage: percentage || 0,
      description: `Tuition share: ${normalizedFee} × ${percentage}% = ${amount}`,
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

  const normalizedFee = toSafeInt(feeAmount);
  let teacherAmount = 0;
  let academyAmount = 0;

  const compType = teacher?.compensation?.type || "percentage";

  if (compType === "percentage") {
    const teacherShare = teacher.compensation.teacherShare || config?.salaryConfig?.teacherShare || 70;
    teacherAmount = Math.floor((normalizedFee * teacherShare) / 100);
    academyAmount = normalizedFee - teacherAmount;
  } else if (compType === "perStudent") {
    // Per-student: teacher gets fixed amount per student per session, rest is academy's
    // This is handled separately in payroll — for fee collection, full amount goes to academy share
    teacherAmount = 0;
    academyAmount = normalizedFee;
  } else if (compType === "fixed") {
    // Fixed salary: teacher is paid monthly, all fee revenue goes to academy
    teacherAmount = 0;
    academyAmount = normalizedFee;
  } else if (compType === "hybrid") {
    // Hybrid: teacher gets profitShare % of fee
    const profitShare = teacher.compensation.profitShare || 0;
    teacherAmount = Math.floor((normalizedFee * profitShare) / 100);
    academyAmount = normalizedFee - teacherAmount;
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
  const normalizedAmount = toSafeInt(amount);
  if (normalizedAmount <= 0) return [];

  // Use dynamic academyShareSplit if configured
  if (config.academyShareSplit && config.academyShareSplit.length > 0) {
    let distributed = 0;
    const result = config.academyShareSplit.map((entry, index) => {
      const isLast = index === config.academyShareSplit.length - 1;
      const share = isLast
        ? normalizedAmount - distributed // Last person gets remainder to avoid rounding issues
        : Math.floor((normalizedAmount * entry.percentage) / 100);
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

  const waqarShare = Math.floor((normalizedAmount * split.waqar) / 100);
  const zahidShare = Math.floor((normalizedAmount * split.zahid) / 100);
  const saudShare = normalizedAmount - waqarShare - zahidShare;

  return [
    { userId: partnerIds.waqar, fullName: "Sir Waqar Baig", role: "OWNER", percentage: split.waqar, amount: waqarShare },
    { userId: partnerIds.zahid, fullName: "Dr. Zahid Khan", role: "PARTNER", percentage: split.zahid, amount: zahidShare },
    { userId: partnerIds.saud, fullName: "Sir Shah Saud", role: "PARTNER", percentage: split.saud, amount: saudShare },
  ].filter(p => p.amount > 0);
}

/**
 * Distribute academy's share with DEFERRED partner settlements.
 * 
 * KEY CHANGE: Partners do NOT receive immediate academy share credit.
 * Instead, AcademySettlement records are created (PENDING status).
 * Only the OWNER (Waqar) gets immediate credit.
 * 
 * Partners can SEE their pending academy share but can't close it
 * until Waqar releases it via the Academy Settlements page.
 * 
 * @param {number} amount - Academy's share amount
 * @param {Object} config - Configuration document
 * @param {Object} sourceInfo - Details about where this came from
 * @returns {{
 *   ownerShare: {userId, amount, percentage},
 *   partnerSettlements: Array<AcademySettlement>,
 *   fullDistribution: Array
 * }}
 */
async function distributeAcademyShareDeferred(amount, config, sourceInfo = {}) {
  if (!config) config = await Configuration.findOne();
  const normalizedAmount = toSafeInt(amount);
  if (normalizedAmount <= 0) {
    return { ownerShare: null, partnerSettlements: [], fullDistribution: [] };
  }

  // Calculate the full distribution first
  const fullDistribution = await distributeAcademyShare(normalizedAmount, config);

  let ownerShare = null;
  const partnerSettlements = [];

  for (const dist of fullDistribution) {
    if (dist.role === "OWNER") {
      // Owner gets immediate credit (returned for DailyRevenue entry)
      ownerShare = {
        userId: dist.userId,
        fullName: dist.fullName,
        role: dist.role,
        percentage: dist.percentage,
        amount: dist.amount,
      };
    } else if (dist.role === "PARTNER" && dist.amount > 0) {
      // Partners get deferred settlement (PENDING status)
      try {
        const settlement = new AcademySettlement({
          partnerId: dist.userId,
          partnerName: dist.fullName,
          partnerRole: dist.role,
          percentage: dist.percentage,
          amount: dist.amount,
          status: "PENDING",
          sourceDate: new Date(),
          sourceDetails: {
            feeRecordId: sourceInfo.feeRecordId || null,
            studentId: sourceInfo.studentId || null,
            studentName: sourceInfo.studentName || "",
            classId: sourceInfo.classId || null,
            className: sourceInfo.className || "",
            subject: sourceInfo.subject || "",
            teacherId: sourceInfo.teacherId || null,
            teacherName: sourceInfo.teacherName || "",
            totalAcademyShare: normalizedAmount,
            calculationProof: `Total Academy Share: PKR ${normalizedAmount} × ${dist.percentage}% = PKR ${dist.amount}`,
          },
          sessionRef: sourceInfo.sessionRef || null,
          sessionName: sourceInfo.sessionName || "",
        });

        await settlement.save();
        partnerSettlements.push(settlement);
      } catch (err) {
        console.error(`Failed to create AcademySettlement for ${dist.fullName}:`, err.message);
      }
    }
  }

  return { ownerShare, partnerSettlements, fullDistribution };
}

/**
 * Release pending academy settlements for a partner.
 * Called by Waqar when he decides to pay out partner's academy share.
 * 
 * @param {string} partnerId - Partner's user ID
 * @param {Object} releasedBy - User who is releasing (must be OWNER)
 * @param {Object} options - { partial: boolean, amount: number, notes: string }
 * @returns {{success, releasedAmount, releasedCount, dailyRevenueEntry}}
 */
async function releasePartnerAcademySettlements(partnerId, releasedBy, options = {}) {
  const pendingSettlements = await AcademySettlement.find({
    partnerId,
    status: "PENDING",
  }).sort({ sourceDate: 1 });

  if (pendingSettlements.length === 0) {
    return { success: false, message: "No pending settlements found for this partner." };
  }

  const totalPending = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);
  let amountToRelease = options.partial ? Math.min(options.amount || 0, totalPending) : totalPending;
  
  if (amountToRelease <= 0) {
    return { success: false, message: "No amount to release." };
  }

  const releasedSettlements = [];
  let releasedAmount = 0;

  // Release settlements in order (oldest first) until we hit the amount
  for (const settlement of pendingSettlements) {
    if (releasedAmount >= amountToRelease) break;

    const remainingToRelease = amountToRelease - releasedAmount;
    
    if (settlement.amount <= remainingToRelease) {
      // Release entire settlement
      settlement.status = "RELEASED";
      settlement.releasedAt = new Date();
      settlement.releasedBy = releasedBy._id || releasedBy;
      settlement.releasedByName = releasedBy.fullName || "System";
      settlement.releaseNotes = options.notes || "";
      await settlement.save();
      
      releasedAmount += settlement.amount;
      releasedSettlements.push(settlement);
    } else {
      // Partial release: split the settlement
      // Create a new released settlement for the partial amount
      const partialSettlement = new AcademySettlement({
        ...settlement.toObject(),
        _id: undefined,
        amount: remainingToRelease,
        status: "RELEASED",
        releasedAt: new Date(),
        releasedBy: releasedBy._id || releasedBy,
        releasedByName: releasedBy.fullName || "System",
        releaseNotes: options.notes || `Partial release from settlement ${settlement._id}`,
      });
      await partialSettlement.save();
      
      // Reduce the original settlement
      settlement.amount -= remainingToRelease;
      await settlement.save();
      
      releasedAmount += remainingToRelease;
      releasedSettlements.push(partialSettlement);
    }
  }

  // Create DailyRevenue entry for the partner to close
  const partner = await User.findById(partnerId);
  if (partner && releasedAmount > 0) {
    const dailyRevenueEntry = {
      partner: partnerId,
      date: new Date(),
      amount: releasedAmount,
      source: "TUITION",
      revenueType: "ACADEMY_SHARE",
      status: "UNCOLLECTED",
      className: `Academy Settlement Release`,
      studentName: "",
      description: `Academy share released by ${releasedBy.fullName || "Owner"}: PKR ${releasedAmount}`,
      splitDetails: {
        description: `Released ${releasedSettlements.length} settlement(s) totaling PKR ${releasedAmount}`,
        settlementsReleased: releasedSettlements.map(s => s._id),
        totalPendingBefore: totalPending,
        remainingPending: totalPending - releasedAmount,
      },
    };

    const created = await DailyRevenue.create(dailyRevenueEntry);

    // Update settlement records with DailyRevenue reference
    for (const s of releasedSettlements) {
      s.dailyRevenueId = created._id;
      await s.save();
    }

    // Update partner's floating balance
    if (!partner.walletBalance) partner.walletBalance = { floating: 0, verified: 0 };
    partner.walletBalance.floating += releasedAmount;
    await partner.save();

    return {
      success: true,
      releasedAmount,
      releasedCount: releasedSettlements.length,
      remainingPending: totalPending - releasedAmount,
      dailyRevenueEntry: created,
    };
  }

  return {
    success: true,
    releasedAmount,
    releasedCount: releasedSettlements.length,
    remainingPending: totalPending - releasedAmount,
  };
}

/**
 * Cancel academy settlements (e.g., due to student withdrawal).
 * 
 * @param {string} feeRecordId - The FeeRecord that generated these settlements
 * @param {Object} cancelledBy - User cancelling
 * @param {string} reason - Reason for cancellation
 */
async function cancelAcademySettlementsByFeeRecord(feeRecordId, cancelledBy, reason = "Student withdrawal") {
  const settlements = await AcademySettlement.find({
    "sourceDetails.feeRecordId": feeRecordId,
    status: "PENDING",
  });

  for (const settlement of settlements) {
    settlement.status = "CANCELLED";
    settlement.cancelledAt = new Date();
    settlement.cancelledBy = cancelledBy._id || cancelledBy;
    settlement.cancellationReason = reason;
    await settlement.save();
  }

  return { cancelled: settlements.length };
}

/**
 * Get pending settlements summary for all partners (for Owner dashboard).
 */
async function getPendingSettlementsSummary() {
  return AcademySettlement.getAllPendingSummary();
}

/**
 * Get detailed pending settlements for a specific partner.
 */
async function getPartnerPendingSettlements(partnerId) {
  return AcademySettlement.getPendingForPartner(partnerId);
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
      status: entry.isDeferred ? "DEFERRED" : "UNCOLLECTED",
      isDeferred: entry.isDeferred || false,
      classRef: entry.classRef || null,
      className: entry.className || "",
      studentRef: entry.studentRef || null,
      studentName: entry.studentName || "",
      feeRecordRef: entry.feeRecordRef || null,
      subject: entry.subject || "",
      transactionReference: entry.transactionReference || "",
      description: entry.description || "",
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
      description: entry.description || entry.splitDetails?.description || "",
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
 * Handles complex scenarios with multiple teachers per subject.
 * - Regular teachers get their defined share (percentage/fixed/perStudent).
 * - Owner/Partner teachers get 100% of their share of the subject fee.
 * - The remaining amount (Academy Share) is split among all stakeholders.
 * 
 * @param {number} feeAmount - Total fee for this subject
 * @param {Array} teachersData - Array of {teacherId, teacher doc, ...}
 * @param {Object} config - Configuration doc for academy split ratios
 * @returns {Promise<{
 *   teacherPayouts: Array,
 *   directStakeholderPayouts: Array,
 *   academyAmount: number,
 *   academyDistribution: Array,
 *   totalTeacherAmount: number,
 *   totalFee: number
 * }>}
 */
async function splitFeeAmongTeachers(feeAmount, teachersData, config) {
  if (!config) config = await Configuration.findOne();
  const normalizedFee = toSafeInt(feeAmount);
  
  if (!teachersData || teachersData.length === 0) {
    // No teachers → all goes to academy
    const academyDist = await distributeAcademyShare(normalizedFee, config);
    return {
      teacherPayouts: [],
      directStakeholderPayouts: [],
      academyAmount: normalizedFee,
      academyDistribution: academyDist,
      totalTeacherAmount: 0,
      totalFee: normalizedFee,
    };
  }

  const teacherPayouts = [];
  const directStakeholderPayouts = [];
  let totalTeacherAmount = 0;
  let totalDirectStakeholderAmount = 0;

  // Split the subject fee equally among the assigned teachers for this subject
  const portionPerTeacher = Math.floor(normalizedFee / teachersData.length);
  const remainder = normalizedFee - (portionPerTeacher * teachersData.length);

  for (let i = 0; i < teachersData.length; i++) {
    const tData = teachersData[i];
    const portion = portionPerTeacher + (i === 0 ? remainder : 0);
    
    const teacher = tData.teacher || (tData.teacherId ? await Teacher.findById(tData.teacherId) : null);
    if (!teacher) continue;

    const role = teacher.role || "TEACHER";
    const compType = teacher.compensation?.type || "percentage";
    
    if (role === "OWNER" || role === "PARTNER") {
      // ── STAKEHOLDER TEACHER: Gets 100% of their portion directly ──
      const stakeholderAmount = portion;
      totalDirectStakeholderAmount += stakeholderAmount;
      
      directStakeholderPayouts.push({
        teacherId: teacher._id,
        userId: teacher.userId || null,
        teacherName: teacher.name,
        role: role,
        amount: stakeholderAmount,
        percentage: 100,
        reason: "Owner/Partner direct tuition share (100%)",
        subject: tData.subject || "",
      });
    } else {
      // ── REGULAR TEACHER: Gets their defined share ──
      let teacherShare = 0;
      let reason = "";

      if (compType === "percentage") {
        const percentage = teacher.compensation?.teacherShare || 70;
        teacherShare = Math.floor((portion * percentage) / 100);
        reason = `${percentage}% percentage split`;
      } else if (compType === "fixed") {
        teacherShare = 0;
        reason = "Fixed salary (paid monthly)";
      } else if (compType === "perStudent") {
        teacherShare = 0;
        reason = "Per-student compensation (calculated in payroll)";
      } else if (compType === "hybrid") {
        const profitShare = teacher.compensation?.profitShare || 10;
        teacherShare = Math.floor((portion * profitShare) / 100);
        reason = `${profitShare}% profit share (hybrid)`;
      } else {
        teacherShare = Math.floor((portion * 70) / 100);
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
        isPartner: false,
      });
    }
  }

  // Academy pool gets the remainder (Portions not taken by regular teachers)
  const academyAmount = normalizedFee - totalTeacherAmount - totalDirectStakeholderAmount;

  // Distribute academy's share among all stakeholders (including those who teach)
  const academyDistribution = academyAmount > 0 
    ? await distributeAcademyShare(academyAmount, config)
    : [];

  return {
    teacherPayouts,
    directStakeholderPayouts,
    academyAmount,
    academyDistribution,
    totalTeacherAmount,
    totalDirectStakeholderAmount,
    totalFee: normalizedFee,
  };
}

module.exports = {
  detectClassRevenueMode,
  calculateTuitionSplit,
  calculateAcademySplit,
  distributeAcademyShare,
  distributeAcademyShareDeferred,
  releasePartnerAcademySettlements,
  cancelAcademySettlementsByFeeRecord,
  getPendingSettlementsSummary,
  getPartnerPendingSettlements,
  splitFeeAmongTeachers,
  createDailyRevenueEntries,
  createWithdrawalAdjustments,
  getClosePreview,
  executeDailyClose,
  resolveRoleFromName,
};
