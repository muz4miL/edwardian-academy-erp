/**
 * ================================================================
 * EDWARDIAN ACADEMY — FINANCE CONTROLLER (Revenue Engine v2)
 * ================================================================
 * Supports dual-mode finance:
 * - TUITION: Owner/Partner daily close from DailyRevenue
 * - ACADEMY: Teacher payroll reports + academy share to Owner/Partners
 * ================================================================
 */

const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const DailyClosing = require("../models/DailyClosing");
const DailyRevenue = require("../models/DailyRevenue");
const Notification = require("../models/Notification");
const Expense = require("../models/Expense");
const Configuration = require("../models/Configuration");
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Class = require("../models/Class");
const FeeRecord = require("../models/FeeRecord");
const TeacherPayment = require("../models/TeacherPayment");
const {
  getClosePreview,
  executeDailyClose,
  createWithdrawalAdjustments,
  detectClassRevenueMode,
} = require("../helpers/revenueEngine");

// =====================================================================
// UNIFIED EXPENSE HELPER — Combines Transaction(EXPENSE) + Expense model
// Deduplicates teacher salary records that exist in both collections
// =====================================================================
async function getUnifiedExpenseTotal(dateFilter) {
  // 1. Sum all Transaction(EXPENSE) records
  const txnExpenseResult = await Transaction.aggregate([
    { $match: { type: "EXPENSE", ...(dateFilter ? { date: dateFilter } : {}) } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const txnExpenseTotal = txnExpenseResult[0]?.total || 0;

  // 2. Sum Expense model records
  const expModelResult = await Expense.aggregate([
    { $match: { ...(dateFilter ? { expenseDate: dateFilter } : {}), status: { $ne: "cancelled" } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const expModelTotal = expModelResult[0]?.total || 0;

  // 3. Find overlap: Expense records that also have a matching Transaction
  //    These are created by routes that insert into both collections (POST /api/expenses, approvePayoutRequest)
  //    Match by: same date (day), same amount, category overlap
  const expRecords = await Expense.find({
    ...(dateFilter ? { expenseDate: dateFilter } : {}),
    status: { $ne: "cancelled" },
  }).lean();

  let overlapTotal = 0;
  for (const exp of expRecords) {
    const expDate = new Date(exp.expenseDate || exp.createdAt);
    const dayStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const matchingTxn = await Transaction.findOne({
      type: "EXPENSE",
      amount: exp.amount,
      date: { $gte: dayStart, $lt: dayEnd },
    }).lean();

    if (matchingTxn) {
      overlapTotal += exp.amount;
    }
  }

  // Unified total = Transaction expenses + Expense-only records (no double count)
  const unifiedTotal = txnExpenseTotal + (expModelTotal - overlapTotal);
  return unifiedTotal;
}

// Same as above but returns category breakdown
async function getUnifiedExpenseBreakdown(dateFilter) {
  // Get Transaction(EXPENSE) by category
  const txnCategories = await Transaction.aggregate([
    { $match: { type: "EXPENSE", ...(dateFilter ? { date: dateFilter } : {}) } },
    { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  // Get Expense model records individually
  const expRecords = await Expense.find({
    ...(dateFilter ? { expenseDate: dateFilter } : {}),
    status: { $ne: "cancelled" },
  }).lean();

  // Identify Expense records NOT in Transaction (orphans)
  const orphanExpenses = [];
  for (const exp of expRecords) {
    const expDate = new Date(exp.expenseDate || exp.createdAt);
    const dayStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const matchingTxn = await Transaction.findOne({
      type: "EXPENSE",
      amount: exp.amount,
      date: { $gte: dayStart, $lt: dayEnd },
    }).lean();

    if (!matchingTxn) {
      orphanExpenses.push(exp);
    }
  }

  // Merge: start with Transaction categories, add orphan Expense records
  const merged = {};
  for (const cat of txnCategories) {
    merged[cat._id || "Uncategorized"] = { total: cat.total, count: cat.count };
  }
  for (const exp of orphanExpenses) {
    const catName = exp.category || "Uncategorized";
    if (!merged[catName]) merged[catName] = { total: 0, count: 0 };
    merged[catName].total += exp.amount;
    merged[catName].count += 1;
  }

  return Object.entries(merged)
    .map(([category, data]) => ({ category, total: data.total, count: data.count }))
    .sort((a, b) => b.total - a.total);
}

// =====================================================================
// CLOSE DAY — Revenue Engine v2: Uses DailyRevenue for Owner/Partner closing
// =====================================================================
exports.closeDay = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { preview } = req.query; // ?preview=true → return report without closing

    // Only OWNER and PARTNER can close
    if (userRole !== "OWNER" && userRole !== "PARTNER") {
      return res.status(403).json({
        success: false,
        message: "Only Owner and Partner can close daily revenue.",
      });
    }

    // Get close preview from DailyRevenue
    const closePreview = await getClosePreview(userId);

    if (closePreview.totalEntries === 0) {
      return res.status(400).json({
        success: false,
        message: "No uncollected revenue to close.",
      });
    }

    // ── If preview mode, return report without actually closing ──
    if (preview === "true") {
      return res.json({
        success: true,
        preview: true,
        data: closePreview,
      });
    }

    // ── Actual close using revenue engine ──
    const closeResult = await executeDailyClose(userId, req.user.fullName, userRole);

    if (!closeResult.success) {
      return res.status(400).json({ success: false, message: closeResult.message });
    }

    // Create DailyClosing record with breakdown
    const closing = await DailyClosing.create({
      closedBy: userId,
      closedByName: req.user.fullName,
      closedByRole: userRole,
      totalAmount: closeResult.totalAmount,
      transactionCount: closeResult.transactionCount,
      breakdown: closeResult.breakdown,
      date: new Date(),
      status: "VERIFIED",
    });

    // Move user's wallet floating → verified
    const user = await User.findById(userId);
    if (user && user.walletBalance) {
      const floatingBal = user.walletBalance.floating || 0;
      user.walletBalance.verified = (user.walletBalance.verified || 0) + floatingBal;
      user.walletBalance.floating = 0;
      await user.save();
    }

    // Also move teacher floating → verified for this user's teacher record
    if (req.user.teacherId) {
      const teacher = await Teacher.findById(req.user.teacherId);
      if (teacher && teacher.balance) {
        const floatingBal = teacher.balance.floating || 0;
        teacher.balance.verified = (teacher.balance.verified || 0) + floatingBal;
        teacher.balance.floating = 0;
        await teacher.save();
      }
    }

    // Also verify floating INCOME transactions collected by this user
    await Transaction.updateMany(
      { collectedBy: userId, status: "FLOATING", type: "INCOME" },
      { $set: { status: "VERIFIED", closingId: closing._id } },
    );

    return res.json({
      success: true,
      message: `Day closed! PKR ${closeResult.totalAmount.toLocaleString()} verified.`,
      data: {
        closingId: closing._id,
        totalAmount: closeResult.totalAmount,
        transactionCount: closeResult.transactionCount,
        breakdown: closeResult.breakdown,
      },
    });
  } catch (error) {
    console.error("CloseDay Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// CLOSE PREVIEW — Real-time preview for Owner/Partner dashboard
// =====================================================================
exports.getClosePreview = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const preview = await getClosePreview(userId);
    return res.json({ success: true, data: preview });
  } catch (error) {
    console.error("ClosePreview Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// PARTNER EARNINGS BREAKDOWN — Subject-level closeable earnings
// =====================================================================
exports.getPartnerEarningsBreakdown = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : null;
    const toDate = req.query.toDate ? new Date(req.query.toDate) : null;

    const match = {
      partner: new mongoose.Types.ObjectId(String(userId)),
      revenueType: { $in: ["TUITION_SHARE", "ACADEMY_SHARE"] },
    };

    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = fromDate;
      if (toDate) match.createdAt.$lte = toDate;
    }

    const rows = await DailyRevenue.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            subject: { $ifNull: ["$subject", "General"] },
            revenueType: "$revenueType",
          },
          total: { $sum: "$amount" },
          closeable: {
            $sum: {
              $cond: [{ $eq: ["$status", "UNCOLLECTED"] }, "$amount", 0],
            },
          },
          txCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.subject": 1 } },
    ]);

    const bySubject = rows.map((r) => ({
      subject: r._id.subject,
      revenueType: r._id.revenueType,
      totalEarned: r.total || 0,
      closeableAmount: r.closeable || 0,
      transactions: r.txCount || 0,
    }));

    const summary = bySubject.reduce(
      (acc, row) => {
        acc.totalEarned += row.totalEarned;
        acc.totalCloseable += row.closeableAmount;
        acc.transactionCount += row.transactions;
        return acc;
      },
      { totalEarned: 0, totalCloseable: 0, transactionCount: 0 },
    );

    return res.json({
      success: true,
      data: {
        userId,
        period: {
          fromDate: fromDate || null,
          toDate: toDate || null,
        },
        summary,
        bySubject,
      },
    });
  } catch (error) {
    console.error("PartnerEarningsBreakdown Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// CLOSING HISTORY — Past closes with breakdown
// =====================================================================
exports.getClosingHistory = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const limit = parseInt(req.query.limit) || 30;

    const closings = await DailyClosing.find({ closedBy: userId })
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, data: closings });
  } catch (error) {
    console.error("ClosingHistory Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// WITHDRAWAL REVERSAL — Refund a withdrawn student's revenue
// =====================================================================
exports.processWithdrawalReversal = async (req, res) => {
  try {
    const { studentId, refundAmount, reason } = req.body;

    if (!studentId || !refundAmount) {
      return res.status(400).json({ success: false, message: "studentId and refundAmount required" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const refundNum = Number(refundAmount);
    if (refundNum <= 0) {
      return res.status(400).json({ success: false, message: "Refund must be > 0" });
    }

    // Find original fee records for this student
    const feeRecords = await FeeRecord.find({
      student: studentId,
      status: "PAID",
    }).lean();

    const totalPaid = feeRecords.reduce((sum, fr) => sum + fr.amount, 0);
    if (refundNum > totalPaid) {
      return res.status(400).json({
        success: false,
        message: `Refund (${refundNum}) exceeds total paid (${totalPaid})`,
      });
    }

    // Find DailyRevenue entries for this student to determine who got what
    const revenueEntries = await DailyRevenue.find({
      studentRef: studentId,
      status: { $in: ["UNCOLLECTED", "COLLECTED"] },
    }).lean();

    // Calculate proportional deductions
    const totalRevenue = revenueEntries.reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const deductions = [];

    for (const entry of revenueEntries) {
      if (entry.revenueType === "WITHDRAWAL_ADJUSTMENT") continue;
      const proportion = totalRevenue > 0 ? Math.abs(entry.amount) / totalRevenue : 0;
      const deductionAmount = Math.round(refundNum * proportion);

      if (deductionAmount > 0) {
        deductions.push({
          userId: entry.partner,
          amount: deductionAmount,
          className: entry.className,
          studentName: student.studentName,
          description: `Withdrawal refund: ${student.studentName} — PKR ${deductionAmount} (${reason || "Student withdrawn"})`,
        });

        // Deduct from user's wallet floating balance
        const user = await User.findById(entry.partner);
        if (user && user.walletBalance) {
          user.walletBalance.floating = Math.max(0, (user.walletBalance.floating || 0) - deductionAmount);
          await user.save();
        }
      }
    }

    // Create withdrawal adjustment DailyRevenue entries
    await createWithdrawalAdjustments(deductions);

    // Create reversal transaction for audit
    await Transaction.create({
      type: "WITHDRAWAL_REVERSAL",
      category: "Withdrawal_Reversal",
      amount: refundNum,
      description: `Withdrawal reversal: ${student.studentName} — Refund PKR ${refundNum} (${reason || "Student withdrawn"})`,
      collectedBy: req.user?._id,
      status: "VERIFIED",
      studentId: student._id,
      date: new Date(),
    });

    // Update student
    student.paidAmount = Math.max(0, (student.paidAmount || 0) - refundNum);
    student.studentStatus = "Withdrawn";
    await student.save();

    return res.json({
      success: true,
      message: `Withdrawal processed. PKR ${refundNum} reversed across ${deductions.length} stakeholders.`,
      data: {
        refundAmount: refundNum,
        deductions,
        studentStatus: "Withdrawn",
      },
    });
  } catch (error) {
    console.error("WithdrawalReversal Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GET DASHBOARD STATS — Single-Owner Academy Dashboard
// =====================================================================
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total students
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ studentStatus: "Active" });

    // Student status breakdown
    const statusBreakdownResult = await Student.aggregate([
      {
        $group: {
          _id: "$studentStatus",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Transform to object with all statuses (Active, Pending, Alumni, Expelled, Suspended)
    const studentsByStatus = {
      Active: 0,
      Pending: 0,
      Alumni: 0,
      Expelled: 0,
      Suspended: 0,
      Withdrawn: 0,
    };
    statusBreakdownResult.forEach(item => {
      if (item._id && studentsByStatus.hasOwnProperty(item._id)) {
        studentsByStatus[item._id] = item.count;
      }
    });

    // Total teachers
    const totalTeachers = await Teacher.countDocuments({ status: "active" });

    // Monthly income (from transactions)
    const monthlyIncomeResult = await Transaction.aggregate([
      {
        $match: {
          type: "INCOME",
          date: { $gte: startOfMonth },
          status: { $in: ["FLOATING", "VERIFIED"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlyIncomeGross = monthlyIncomeResult[0]?.total || 0;

    // Deduct refunds from monthly income
    const monthlyRefundResult = await Transaction.aggregate([
      {
        $match: {
          type: "REFUND",
          date: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlyRefunds = monthlyRefundResult[0]?.total || 0;
    const monthlyIncome = monthlyIncomeGross - monthlyRefunds;

    // Monthly expenses (unified: Transaction + Expense model, deduplicated)
    const monthlyExpenses = await getUnifiedExpenseTotal({ $gte: startOfMonth });

    // Today's income
    const todayIncomeResult = await Transaction.aggregate([
      { $match: { type: "INCOME", date: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const todayRefundResult = await Transaction.aggregate([
      { $match: { type: "REFUND", date: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const todayIncome = (todayIncomeResult[0]?.total || 0) - (todayRefundResult[0]?.total || 0);

    // Today's expenses (unified)
    const todayStart = new Date(today);
    const todayExpenses = await getUnifiedExpenseTotal({ $gte: todayStart, $lt: tomorrow });

    // Floating (unverified) cash
    const floatingResult = await Transaction.aggregate([
      { $match: { type: "INCOME", status: "FLOATING" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const floatingCash = floatingResult[0]?.total || 0;

    // Fee collection stats (exclude Withdrawn students to prevent ghost revenue)
    const [totalExpectedFees, totalCollectedFees] = await Promise.all([
      Student.aggregate([
        { $match: { studentStatus: { $ne: "Withdrawn" } } },
        { $group: { _id: null, total: { $sum: "$totalFee" } } },
      ]),
      Student.aggregate([
        { $match: { studentStatus: { $ne: "Withdrawn" } } },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]),
    ]);
    const totalExpected = totalExpectedFees[0]?.total || 0;
    const totalCollected = totalCollectedFees[0]?.total || 0;
    const totalPending = totalExpected - totalCollected;

    // Teacher liabilities (what academy owes teachers — manual credits)
    const teacherLiabilities = await Teacher.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: null,
          totalFloating: { $sum: "$balance.floating" },
          totalVerified: { $sum: "$balance.verified" },
          totalPending: { $sum: "$balance.pending" },
        },
      },
    ]);
    const teacherOwed =
      (teacherLiabilities[0]?.totalFloating || 0) +
      (teacherLiabilities[0]?.totalVerified || 0) +
      (teacherLiabilities[0]?.totalPending || 0);

    // Total manual credits (LIABILITY transactions) this month
    const monthlyLiabilityResult = await Transaction.aggregate([
      { $match: { type: "LIABILITY", date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlyLiabilities = monthlyLiabilityResult[0]?.total || 0;

    // Net Revenue = Total Cash In - Total Cash Out (Expenses only, not liabilities)
    const netRevenue = monthlyIncome - monthlyExpenses;

    // Fee collection stats for current month (from FeeRecord model)
    const monthlyFeeCollection = await FeeRecord.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    return res.json({
      success: true,
      data: {
        // Core KPIs
        totalStudents,
        activeStudents,
        studentsByStatus,  // Student status breakdown
        totalTeachers,
        monthlyIncome,
        monthlyExpenses,
        todayIncome,
        todayExpenses,
        floatingCash,

        // Fee stats
        totalExpected,
        totalCollected,
        totalPending,
        collectionRate:
          totalExpected > 0
            ? Math.round((totalCollected / totalExpected) * 100)
            : 0,

        // Monthly fee collection (from FeeRecord)
        monthlyFeesCollected: monthlyFeeCollection[0]?.total || 0,
        monthlyFeesCount: monthlyFeeCollection[0]?.count || 0,

        // Teacher financials
        teacherOwed,
        monthlyLiabilities,

        // Owner summary (Cash-Based: Income minus actual Expenses)
        ownerNetRevenue: netRevenue,
        netProfit: netRevenue,

        // Legacy compat (frontend may still reference these)
        academyShare: monthlyIncome,
        chemistryRevenue: 0,
        pendingReimbursements: 0,
        poolRevenue: 0,
      },
    });
  } catch (error) {
    console.error("getDashboardStats Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// FLOATING AMOUNTS DETAIL API — Real-time breakdown for Owner/Partners
// =====================================================================
exports.getFloatingAmountsDetail = async (req, res) => {
  try {
    const { userId } = req.query; // Optional: filter by specific owner/partner

    // Get all DailyRevenue entries (uncollected floating amounts)
    const query = userId ? { partner: userId, status: "UNCOLLECTED" } : { status: "UNCOLLECTED" };

    const floatingBreakdown = await DailyRevenue.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            partner: "$partner",
            revenueType: "$revenueType",
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.partner": 1, "_id.revenueType": 1 } },
    ]);

    // Enrich with owner/partner names
    const result = [];
    const partnerMap = new Map();

    for (const entry of floatingBreakdown) {
      const partnerId = entry._id.partner;
      if (!partnerMap.has(partnerId.toString())) {
        const user = await User.findById(partnerId).select("_id fullName role").lean();
        partnerMap.set(partnerId.toString(), user);
      }

      const partnerInfo = partnerMap.get(partnerId.toString());
      result.push({
        userId: partnerId,
        fullName: partnerInfo?.fullName || "Unknown",
        role: partnerInfo?.role || "UNKNOWN",
        revenueType: entry._id.revenueType,
        amount: entry.total,
        entryCount: entry.count,
      });
    }

    // Summary by partner
    const summary = await DailyRevenue.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$partner",
          totalFloating: { $sum: "$amount" },
          tuitionShare: {
            $sum: {
              $cond: [{ $eq: ["$revenueType", "TUITION_SHARE"] }, "$amount", 0],
            },
          },
          academyShare: {
            $sum: {
              $cond: [{ $eq: ["$revenueType", "ACADEMY_SHARE"] }, "$amount", 0],
            },
          },
          withdrawalAdjustments: {
            $sum: {
              $cond: [{ $eq: ["$revenueType", "WITHDRAWAL_ADJUSTMENT"] }, "$amount", 0],
            },
          },
          entryCount: { $sum: 1 },
        },
      },
      { $sort: { totalFloating: -1 } },
    ]);

    // Enrich summary with partner names
    const enrichedSummary = [];
    for (const s of summary) {
      const partnerId = s._id;
      if (!partnerMap.has(partnerId.toString())) {
        const user = await User.findById(partnerId).select("_id fullName role").lean();
        partnerMap.set(partnerId.toString(), user);
      }

      const partnerInfo = partnerMap.get(partnerId.toString());
      enrichedSummary.push({
        userId: partnerId,
        fullName: partnerInfo?.fullName || "Unknown",
        role: partnerInfo?.role || "UNKNOWN",
        totalFloating: s.totalFloating,
        tuitionShare: s.tuitionShare || 0,
        academyShare: s.academyShare || 0,
        withdrawalAdjustments: s.withdrawalAdjustments || 0,
        entryCount: s.entryCount,
      });
    }

    // Grand totals
    const grandTotals = enrichedSummary.reduce(
      (agg, s) => ({
        totalFloating: agg.totalFloating + s.totalFloating,
        tuitionShare: agg.tuitionShare + s.tuitionShare,
        academyShare: agg.academyShare + s.academyShare,
        partnerCount: enrichedSummary.length,
      }),
      { totalFloating: 0, tuitionShare: 0, academyShare: 0, partnerCount: 0 }
    );

    return res.json({
      success: true,
      data: {
        details: result,
        summary: enrichedSummary,
        grand: grandTotals,
      },
    });
  } catch (error) {
    console.error("getFloatingAmountsDetail Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// TEACHER PAYROLL SUMMARY — Real-time floating amounts for teachers
// =====================================================================
exports.getTeacherPayrollSummary = async (req, res) => {
  try {
    const teachers = await Teacher.aggregate([
      { $match: { status: "active" } },
      {
        $project: {
          _id: 1,
          name: 1,
          subject: 1,
          status: 1,
          compensation: 1,
          balance: 1,
          totalPaid: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    const enriched = teachers.map((t) => ({
      _id: t._id,
      name: t.name,
      subject: t.subject || "Multiple",
      compensationType: t.compensation?.type || "percentage",
      floatingBalance: t.balance?.floating || 0,
      verifiedBalance: t.balance?.verified || 0,
      pendingBalance: t.balance?.pending || 0,
      totalBalance: (t.balance?.floating || 0) + (t.balance?.verified || 0) + (t.balance?.pending || 0),
      totalPaid: t.totalPaid || 0,
      lifetimeEarnings: ((t.balance?.floating || 0) + (t.balance?.verified || 0) + (t.balance?.pending || 0)) + (t.totalPaid || 0),
    }));

    // Summary totals
    const totals = enriched.reduce(
      (agg, t) => ({
        totalFloating: agg.totalFloating + t.floatingBalance,
        totalVerified: agg.totalVerified + t.verifiedBalance,
        totalPending: agg.totalPending + t.pendingBalance,
        totalOwed: agg.totalOwed + t.totalBalance,
        teacherCount: enriched.length,
      }),
      { totalFloating: 0, totalVerified: 0, totalPending: 0, totalOwed: 0, teacherCount: 0 }
    );

    return res.json({
      success: true,
      data: {
        teachers: enriched,
        summary: totals,
      },
    });
  } catch (error) {
    console.error("getTeacherPayrollSummary Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// RECORD STUDENT MISC PAYMENT — Trip, Test, Lab, Event fees etc.
// =====================================================================
exports.recordStudentMiscPayment = async (req, res) => {
  try {
    const { studentId, amount, paymentType, description, paymentMethod } = req.body;

    if (!studentId || !amount || !paymentType) {
      return res.status(400).json({
        success: false,
        message: "Student, amount, and payment type are required.",
      });
    }

    const amountNum = Number(amount);
    if (amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0.",
      });
    }

    // Find the student
    const Student = require("../models/Student");
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // Map payment types to Transaction categories
    const categoryMap = {
      trip: "Trip_Fee",
      test: "Test_Fee",
      lab: "Lab_Fee",
      library: "Library_Fee",
      sports: "Sports_Fee",
      event: "Event_Fee",
      misc: "Student_Misc",
    };

    const category = categoryMap[paymentType] || "Student_Misc";
    const paymentLabel = paymentType.charAt(0).toUpperCase() + paymentType.slice(1);

    // Generate receipt ID
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptId = `MISC-${student.studentId}-${dateStr}-${randomSuffix}`;

    // Create transaction in ledger
    const transaction = await Transaction.create({
      type: "INCOME",
      category,
      amount: amountNum,
      description: description || `${paymentLabel} fee from ${student.studentName} (${student.studentId})`,
      date: now,
      collectedBy: req.user._id,
      status: "FLOATING",
      studentId: student._id,
    });

    // Send notification to owner
    try {
      const Notification = require("../models/Notification");
      const User = require("../models/User");
      const owner = await User.findOne({ role: "OWNER" });

      if (owner) {
        await Notification.create({
          recipient: owner._id,
          recipientRole: "OWNER",
          message: `${paymentLabel} fee of PKR ${amountNum.toLocaleString()} collected from ${student.studentName} (${student.studentId})`,
          type: "FINANCE",
          relatedId: transaction._id.toString(),
        });
      }
    } catch (notifErr) {
      console.log("Notification skipped:", notifErr.message);
    }

    // Track collector's cash
    if (req.user?._id) {
      try {
        const User = require("../models/User");
        const collector = await User.findById(req.user._id);
        if (collector) {
          collector.totalCash = (collector.totalCash || 0) + amountNum;
          await collector.save();
        }
      } catch (e) {
        console.log("TotalCash update skipped:", e.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: `${paymentLabel} fee of PKR ${amountNum.toLocaleString()} collected from ${student.studentName}.`,
      data: {
        transaction,
        receiptData: {
          receiptId,
          studentId: student.studentId,
          studentName: student.studentName,
          fatherName: student.fatherName || "-",
          class: student.class || "-",
          contact: student.parentCell || student.studentCell || "-",
          paymentType: paymentLabel,
          category,
          amount: amountNum,
          description: description || `${paymentLabel} Fee`,
          paymentMethod: paymentMethod || "Cash",
          paymentDate: now,
          collectedBy: req.user?.fullName || "Staff",
        },
      },
    });
  } catch (error) {
    console.error("RecordStudentMiscPayment Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GET STUDENT MISC PAYMENT HISTORY
// =====================================================================
exports.getStudentMiscPayments = async (req, res) => {
  try {
    const miscCategories = ["Trip_Fee", "Test_Fee", "Lab_Fee", "Library_Fee", "Sports_Fee", "Event_Fee", "Student_Misc"];

    const transactions = await Transaction.find({
      category: { $in: miscCategories },
    })
      .populate("studentId", "studentName studentId class fatherName parentCell")
      .populate("collectedBy", "fullName")
      .sort({ date: -1 })
      .limit(200);

    return res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("GetStudentMiscPayments Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// RECORD TRANSACTION — Create a new income or expense transaction
// =====================================================================
exports.recordTransaction = async (req, res) => {
  try {
    const { type, category, amount, description, date } = req.body;

    if (!type || !category || !amount) {
      return res.status(400).json({
        success: false,
        message: "Type, category, and amount are required.",
      });
    }

    const transaction = await Transaction.create({
      type,
      category,
      amount: Number(amount),
      description: description || `${type}: ${category}`,
      date: date ? new Date(date) : new Date(),
      collectedBy: req.user._id,
      status: type === "EXPENSE" ? "VERIFIED" : "FLOATING",
    });

    return res.status(201).json({
      success: true,
      message: `${type} of PKR ${amount} recorded.`,
      data: transaction,
    });
  } catch (error) {
    console.error("RecordTransaction Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GET FINANCE HISTORY — Unified chronological ledger
// =====================================================================
exports.getFinanceHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, startDate, endDate } = req.query;

    let query = {};
    if (type && type !== "ALL") query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Also get expenses
    let expenseQuery = {};
    if (startDate || endDate) {
      expenseQuery.expenseDate = {};
      if (startDate) expenseQuery.expenseDate.$gte = new Date(startDate);
      if (endDate) expenseQuery.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(expenseQuery)
      .sort({ expenseDate: -1 })
      .lean();

    // Get teacher payments (payouts)
    let teacherPaymentQuery = {};
    if (startDate || endDate) {
      teacherPaymentQuery.paymentDate = {};
      if (startDate) teacherPaymentQuery.paymentDate.$gte = new Date(startDate);
      if (endDate) teacherPaymentQuery.paymentDate.$lte = new Date(endDate);
    }

    const teacherPayments = await TeacherPayment.find(teacherPaymentQuery)
      .sort({ paymentDate: -1 })
      .lean();

    // Merge and sort
    const combined = [
      ...transactions.map((t) => ({
        ...t,
        sortDate: t.date || t.createdAt,
        source: "transaction",
      })),
      ...expenses
        .filter(() => !type || type === "ALL" || type === "EXPENSE")
        .map((e) => ({
          ...e,
          type: "EXPENSE",
          amount: e.amount,
          description: e.title || e.description,
          category: e.category,
          date: e.expenseDate || e.createdAt,
          sortDate: e.expenseDate || e.createdAt,
          source: "expense",
        })),
      ...teacherPayments
        .filter(() => !type || type === "ALL" || type === "EXPENSE")
        .map((tp) => ({
          ...tp,
          type: "EXPENSE",
          amount: tp.amountPaid,
          description: `Teacher Payout: ${tp.teacherName} (${tp.subject}) - ${tp.voucherId}`,
          category: "Teacher Payout",
          date: tp.paymentDate,
          sortDate: tp.paymentDate,
          source: "teacher-payment",
          teacherPaymentId: tp._id,
          voucherId: tp.voucherId,
        })),
    ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

    const total = await Transaction.countDocuments(query);

    return res.json({
      success: true,
      count: combined.length,
      total,
      data: combined,
    });
  } catch (error) {
    console.error("getFinanceHistory Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// PROCESS TEACHER PAYOUT — Owner pays teacher from verified balance
// =====================================================================
exports.processTeacherPayout = async (req, res) => {
  try {
    const { teacherId, amount, notes } = req.body;

    if (!teacherId || !amount) {
      return res.status(400).json({
        success: false,
        message: "teacherId and amount are required.",
      });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found." });
    }

    const payoutAmount = Number(amount);
    const compType = teacher.compensation?.type || "percentage";

    const verifiedBal = teacher.balance?.verified || 0;
    const floatingBal = teacher.balance?.floating || 0;
    const pendingBal = teacher.balance?.pending || 0;

    const availableBalance = pendingBal;

    if (payoutAmount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: PKR ${availableBalance}`,
      });
    }

    const originalBalance = {
      verified: verifiedBal,
      floating: floatingBal,
      pending: pendingBal,
    };
    const originalTotalPaid = teacher.totalPaid || 0;

    teacher.balance.pending = pendingBal - payoutAmount;

    teacher.totalPaid = originalTotalPaid + payoutAmount;
    await teacher.save();

    let paymentRecord;
    try {
      paymentRecord = await TeacherPayment.create({
        teacherId: teacher._id,
        teacherName: teacher.name,
        subject: teacher.subject,
        amountPaid: payoutAmount,
        compensationType: compType,
        month: new Date().toLocaleString("en-US", { month: "long" }),
        year: new Date().getFullYear(),
        paymentMethod: "cash",
        status: "paid",
        notes: notes || "Teacher payout",
      });
    } catch (paymentError) {
      teacher.balance.verified = originalBalance.verified;
      teacher.balance.floating = originalBalance.floating;
      teacher.balance.pending = originalBalance.pending;
      teacher.totalPaid = originalTotalPaid;
      await teacher.save();
      throw paymentError;
    }

    // Record payout transaction
    await Transaction.create({
      type: "EXPENSE",
      category: "Teacher Payout",
      amount: payoutAmount,
      description: `Payout to ${teacher.name}: PKR ${payoutAmount}${notes ? ` — ${notes}` : ""}`,
      date: new Date(),
      collectedBy: req.user._id,
      status: "VERIFIED",
      splitDetails: {
        teacherId: teacher._id,
        teacherName: teacher.name,
      },
    });

    // Notification
    try {
      await Notification.create({
        recipient: teacher._id,
        message: `Payout received: PKR ${payoutAmount}`,
        type: "FINANCE",
      });

      await Notification.create({
        recipient: req.user._id,
        message: `PKR ${payoutAmount} paid to ${teacher.name}.`,
        type: "FINANCE",
      });
    } catch (e) {
      /* non-critical */
    }

    return res.json({
      success: true,
      message: `PKR ${payoutAmount} paid to ${teacher.name}.`,
      data: {
        teacher: teacher.name,
        paid: payoutAmount,
        voucher: {
          voucherId: paymentRecord.voucherId,
          teacherName: paymentRecord.teacherName,
          subject: paymentRecord.subject,
          amountPaid: paymentRecord.amountPaid,
          paymentDate: paymentRecord.paymentDate,
          paymentMethod: paymentRecord.paymentMethod,
          notes: paymentRecord.notes,
        },
        remainingBalance: teacher.balance?.pending || 0,
      },
    });
  } catch (error) {
    console.error("processTeacherPayout Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// PROCESS MANUAL PAYOUT — Owner gives advance/salary to any user
// =====================================================================
exports.processManualPayout = async (req, res) => {
  try {
    const { userId, amount, type: payoutType, notes } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: "userId and amount are required.",
      });
    }

    const payoutAmount = Number(amount);

    // Try finding as teacher first
    const teacher = await Teacher.findById(userId);
    if (teacher) {
      teacher.totalPaid = (teacher.totalPaid || 0) + payoutAmount;
      await teacher.save();

      await Transaction.create({
        type: "EXPENSE",
        category:
          payoutType === "advance" ? "Teacher Advance" : "Teacher Salary",
        amount: payoutAmount,
        description: `${payoutType || "Payout"} to ${teacher.name}: PKR ${amount}${notes ? ` — ${notes}` : ""}`,
        date: new Date(),
        collectedBy: req.user._id,
        status: "VERIFIED",
        splitDetails: { teacherId: teacher._id, teacherName: teacher.name },
      });

      return res.json({
        success: true,
        message: `PKR ${amount} paid to ${teacher.name} as ${payoutType || "payout"}.`,
      });
    }

    // Try as User
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    user.walletBalance = (user.walletBalance || 0) - payoutAmount;
    await user.save();

    await Transaction.create({
      type: "EXPENSE",
      category: payoutType === "advance" ? "Advance" : "Salary",
      amount: payoutAmount,
      description: `${payoutType || "Payout"} to ${user.fullName}: PKR ${amount}${notes ? ` — ${notes}` : ""}`,
      date: new Date(),
      collectedBy: req.user._id,
      status: "VERIFIED",
    });

    return res.json({
      success: true,
      message: `PKR ${amount} paid to ${user.fullName}.`,
    });
  } catch (error) {
    console.error("processManualPayout Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// UPDATE MANUAL BALANCE — Set what academy owes a user
// =====================================================================
exports.updateManualBalance = async (req, res) => {
  try {
    const { userId, amount, action } = req.body;

    if (!userId || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "userId and amount are required.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (action === "set") {
      user.manualBalance = Number(amount);
    } else {
      user.manualBalance = (user.manualBalance || 0) + Number(amount);
    }
    await user.save();

    return res.json({
      success: true,
      message: `Balance updated for ${user.fullName}: PKR ${user.manualBalance}`,
      data: { userId: user._id, manualBalance: user.manualBalance },
    });
  } catch (error) {
    console.error("updateManualBalance Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GET TEACHER PAYROLL DATA — All teachers with balances
// =====================================================================
exports.getTeacherPayrollData = async (req, res) => {
  try {
    const teachers = await Teacher.find({ status: "active" })
      .select(
        "name subject teacherId balance totalPaid compensation profileImage",
      )
      .lean();

    const payrollData = teachers.map((t) => ({
      _id: t._id,
      teacherId: t.teacherId,
      name: t.name,
      subject: t.subject,
      profileImage: t.profileImage,
      compensation: t.compensation,
      balance: {
        floating: t.balance?.floating || 0,
        verified: t.balance?.verified || 0,
        pending: t.balance?.pending || 0,
        total:
          (t.balance?.floating || 0) +
          (t.balance?.verified || 0) +
          (t.balance?.pending || 0),
        payable:
          t.compensation?.type === "fixed"
            ? t.balance?.pending || 0
            : (t.balance?.floating || 0) + (t.balance?.verified || 0),
      },
      totalPaid: t.totalPaid || 0,
    }));

    return res.json({
      success: true,
      count: payrollData.length,
      data: payrollData,
    });
  } catch (error) {
    console.error("getTeacherPayrollData Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GET PAYOUT HISTORY — Transaction history for a specific user
// =====================================================================
exports.getPayoutHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const isOwner = req.user.role === "OWNER";

    if (!isOwner && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own payout history.",
      });
    }

    const payouts = await Transaction.find({
      $or: [
        { "splitDetails.teacherId": userId },
        {
          collectedBy: userId,
          type: "EXPENSE",
          category: {
            $in: [
              "Teacher Payout",
              "Teacher Advance",
              "Teacher Salary",
              "Advance",
              "Salary",
            ],
          },
        },
      ],
    })
      .sort({ date: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      count: payouts.length,
      data: payouts,
    });
  } catch (error) {
    console.error("getPayoutHistory Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// DELETE TRANSACTION
// =====================================================================
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    let doc = await Transaction.findByIdAndDelete(id);
    if (doc) {
      return res.json({
        success: true,
        message: "Transaction deleted.",
        data: doc,
      });
    }

    doc = await Expense.findByIdAndDelete(id);
    if (doc) {
      return res.json({
        success: true,
        message: "Expense deleted.",
        data: doc,
      });
    }

    return res
      .status(404)
      .json({ success: false, message: "Record not found." });
  } catch (error) {
    console.error("deleteTransaction Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// RESET SYSTEM — DANGER: Wipe all financial data (dev/testing only)
// =====================================================================
exports.resetSystem = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "System reset is disabled in production.",
      });
    }

    await Promise.all([
      Transaction.deleteMany({}),
      DailyClosing.deleteMany({}),
      FeeRecord.deleteMany({}),
      Expense.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    await Teacher.updateMany(
      {},
      {
        $set: {
          "balance.floating": 0,
          "balance.verified": 0,
          "balance.pending": 0,
          totalPaid: 0,
        },
      },
    );

    await User.updateMany(
      {},
      { $set: { walletBalance: 0, totalCash: 0, manualBalance: 0 } },
    );

    await Student.updateMany(
      {},
      { $set: { paidAmount: 0, feeStatus: "Pending" } },
    );

    return res.json({
      success: true,
      message: "All financial data has been wiped. System is clean.",
    });
  } catch (error) {
    console.error("resetSystem Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// ANALYTICS DASHBOARD — Charts data for Owner
// =====================================================================
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Monthly Revenue & Expenses
    const [monthlyRevenue, monthlyExpensesTxn, monthlyRefunds, monthlyExpensesModel] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: "INCOME", date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Transaction.aggregate([
        { $match: { type: "EXPENSE", date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Transaction.aggregate([
        { $match: { type: "REFUND", date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Expense.aggregate([
        { $match: { expenseDate: { $gte: sixMonthsAgo }, status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: { year: { $year: "$expenseDate" }, month: { $month: "$expenseDate" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    const revenueVsExpenses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const label = `${monthNames[d.getMonth()]} ${year}`;
      const rev = monthlyRevenue.find(
        (r) => r._id.year === year && r._id.month === month,
      );
      const refund = monthlyRefunds.find(
        (r) => r._id.year === year && r._id.month === month,
      );
      const expTxn = monthlyExpensesTxn.find(
        (e) => e._id.year === year && e._id.month === month,
      );
      const expModel = monthlyExpensesModel.find(
        (e) => e._id.year === year && e._id.month === month,
      );
      // Revenue = income minus refunds
      const revenue = (rev ? rev.total : 0) - (refund ? refund.total : 0);
      // Expenses: use whichever is higher (Transaction or Expense model) to avoid undercount
      // This handles cases where some records are in both models
      const expenses = Math.max(expTxn ? expTxn.total : 0, expModel ? expModel.total : 0);
      revenueVsExpenses.push({
        month: label,
        revenue,
        expenses,
        profit: revenue - expenses,
      });
    }

    // Student Enrollment Growth
    const studentGrowth = await Student.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          newStudents: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    let cumulativeStudents = await Student.countDocuments({
      createdAt: { $lt: sixMonthsAgo },
    });
    const enrollmentData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const label = `${monthNames[d.getMonth()]} ${year}`;
      const growth = studentGrowth.find(
        (g) => g._id.year === year && g._id.month === month,
      );
      const newCount = growth ? growth.newStudents : 0;
      cumulativeStudents += newCount;
      enrollmentData.push({
        month: label,
        newStudents: newCount,
        totalStudents: cumulativeStudents,
      });
    }

    // Fee Collection Status - Using Student feeStatus and paidAmount
    const feeStats = await Student.aggregate([
      { $match: { studentStatus: "Active" } },
      {
        $group: {
          _id: "$feeStatus",
          total: { $sum: "$paidAmount" },
          count: { $sum: 1 },
        },
      },
    ]);
    const feeCollection = {
      paid: { amount: 0, count: 0 },
      pending: { amount: 0, count: 0 },
    };
    feeStats.forEach((f) => {
      const key = f._id?.toLowerCase();
      if (key === "paid" || key === "partial") {
        // Both fully paid and partially paid students count as "Paid"
        feeCollection.paid.amount += f.total;
        feeCollection.paid.count += f.count;
      } else if (key === "pending") {
        feeCollection.pending.amount += f.total;
        feeCollection.pending.count += f.count;
      }
    });

    // Expense Breakdown
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenseBreakdown = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: startOfMonth },
          status: { $ne: "REJECTED" },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);
    const expenseCategories = expenseBreakdown.map((e) => ({
      category: e._id || "Uncategorized",
      amount: e.total,
      count: e.count,
    }));

    // Quick Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tmr = new Date(today);
    tmr.setDate(tmr.getDate() + 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [todayRev, weeklyRev, monthlyRev, todayRefunds, weeklyRefunds, monthlyRefundsAmt] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: "INCOME", date: { $gte: today, $lt: tmr } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { type: "INCOME", date: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { type: "INCOME", date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { type: "REFUND", date: { $gte: today, $lt: tmr } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { type: "REFUND", date: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { type: "REFUND", date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments({ status: "active" });

    // Quick stat expenses (unified)
    const todayExpenses = await getUnifiedExpenseTotal({ $gte: today, $lt: tmr });
    const weeklyExpenses = await getUnifiedExpenseTotal({ $gte: weekStart });
    const monthlyExpensesTotal = await getUnifiedExpenseTotal({ $gte: startOfMonth });

    const todayRevenue = (todayRev[0]?.total || 0) - (todayRefunds[0]?.total || 0);
    const weeklyRevenue = (weeklyRev[0]?.total || 0) - (weeklyRefunds[0]?.total || 0);
    const monthlyRevenueTotal = (monthlyRev[0]?.total || 0) - (monthlyRefundsAmt[0]?.total || 0);

    return res.json({
      success: true,
      data: {
        revenueVsExpenses,
        enrollmentData,
        feeCollection,
        expenseCategories,
        quickStats: {
          todayRevenue,
          weeklyRevenue,
          monthlyRevenue: monthlyRevenueTotal,
          todayExpenses,
          weeklyExpenses,
          monthlyExpenses: monthlyExpensesTotal,
          todayNet: todayRevenue - todayExpenses,
          weeklyNet: weeklyRevenue - weeklyExpenses,
          monthlyNet: monthlyRevenueTotal - monthlyExpensesTotal,
          totalStudents,
          totalTeachers,
        },
      },
    });
  } catch (error) {
    console.error("Analytics Dashboard Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GENERATE FINANCIAL REPORT — Detailed printable report for any period
// =====================================================================
exports.generateFinancialReport = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    let dateFilter = {};
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === "today") {
      const tmr = new Date(today);
      tmr.setDate(tmr.getDate() + 1);
      dateFilter = { $gte: today, $lt: tmr };
    } else if (period === "week") {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      dateFilter = { $gte: weekStart };
    } else if (period === "month") {
      dateFilter = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    } else if (period === "custom" && startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (period === "full") {
      dateFilter = { $gte: new Date("2020-01-01") };
    } else {
      dateFilter = { $gte: today };
    }

    // ── Revenue from Transaction (INCOME) ──
    const revenueByCategory = await Transaction.aggregate([
      { $match: { type: "INCOME", date: dateFilter } },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const refundResult = await Transaction.aggregate([
      { $match: { type: "REFUND", date: dateFilter } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalRefunds = refundResult[0]?.total || 0;

    // ── Expenses ──
    const expenseBreakdown = await getUnifiedExpenseBreakdown(dateFilter);
    const expenseByCategory = expenseBreakdown.map(e => ({
      _id: e.category, total: e.total, count: e.count,
    }));

    const totalRevenue = revenueByCategory.reduce((s, r) => s + r.total, 0) - totalRefunds;
    const totalExpenses = expenseByCategory.reduce((s, e) => s + e.total, 0);

    // ── Detailed Fee Records (per-student) ──
    const feeRecords = await FeeRecord.find({
      createdAt: dateFilter,
      status: "PAID",
    }).sort({ createdAt: -1 }).lean();

    const feeDetails = feeRecords.map(fr => ({
      receiptNumber: fr.receiptNumber,
      studentName: fr.studentName,
      className: fr.className,
      subject: fr.subject || "",
      amount: fr.amount,
      teacherName: fr.teacherName || "",
      isPartnerTeacher: fr.isPartnerTeacher || false,
      teacherShare: fr.splitBreakdown?.teacherShare || 0,
      academyShare: fr.splitBreakdown?.academyShare || 0,
      teacherPercentage: fr.splitBreakdown?.teacherPercentage || 0,
      academyPercentage: fr.splitBreakdown?.academyPercentage || 0,
      paymentMethod: fr.paymentMethod || "CASH",
      collectedByName: fr.collectedByName || "",
      revenueSource: fr.revenueSource || "",
      date: fr.createdAt,
    }));

    const feesSummary = {
      total: feeRecords.reduce((s, fr) => s + fr.amount, 0),
      count: feeRecords.length,
    };

    // ── DailyRevenue: Owner/Partner revenue entries ──
    const DailyRevenue = require("../models/DailyRevenue");
    const dailyRevEntries = await DailyRevenue.find({
      date: dateFilter,
    }).sort({ date: -1 }).lean();

    // Group by partner
    const partnerRevenue = {};
    for (const entry of dailyRevEntries) {
      const pid = entry.partner?.toString() || "unknown";
      if (!partnerRevenue[pid]) {
        partnerRevenue[pid] = {
          partnerId: pid,
          tuitionTotal: 0, tuitionCount: 0,
          academyTotal: 0, academyCount: 0,
          adjustmentTotal: 0,
          items: [],
        };
      }
      const pr = partnerRevenue[pid];
      if (entry.revenueType === "TUITION_SHARE") {
        pr.tuitionTotal += entry.amount || 0;
        pr.tuitionCount++;
      } else if (entry.revenueType === "ACADEMY_SHARE") {
        pr.academyTotal += entry.amount || 0;
        pr.academyCount++;
      } else if (entry.revenueType === "WITHDRAWAL_ADJUSTMENT") {
        pr.adjustmentTotal += entry.amount || 0;
      }
      pr.items.push({
        type: entry.revenueType,
        amount: entry.amount,
        className: entry.className || "",
        studentName: entry.studentName || "",
        status: entry.status,
        date: entry.date,
        description: entry.splitDetails?.description || "",
      });
    }

    // Enrich partner names
    const partnerIds = Object.keys(partnerRevenue).filter(id => id !== "unknown");
    if (partnerIds.length > 0) {
      const users = await User.find({ _id: { $in: partnerIds } }).select("fullName role").lean();
      for (const u of users) {
        const pid = u._id.toString();
        if (partnerRevenue[pid]) {
          partnerRevenue[pid].partnerName = u.fullName;
          partnerRevenue[pid].role = u.role;
        }
      }
    }

    // ── Per-teacher revenue breakdown ──
    const teacherRevMap = {};
    for (const fr of feeRecords) {
      const tid = fr.teacher?.toString();
      if (!tid) continue;
      if (!teacherRevMap[tid]) {
        teacherRevMap[tid] = {
          teacherId: tid,
          teacherName: fr.teacherName || "",
          isPartner: fr.isPartnerTeacher || false,
          totalFeeCollected: 0,
          totalTeacherShare: 0,
          totalAcademyShare: 0,
          feeCount: 0,
          students: [],
        };
      }
      const tm = teacherRevMap[tid];
      tm.totalFeeCollected += fr.amount || 0;
      tm.totalTeacherShare += fr.splitBreakdown?.teacherShare || 0;
      tm.totalAcademyShare += fr.splitBreakdown?.academyShare || 0;
      tm.feeCount++;
      tm.students.push({
        studentName: fr.studentName,
        className: fr.className,
        amount: fr.amount,
        teacherShare: fr.splitBreakdown?.teacherShare || 0,
        academyShare: fr.splitBreakdown?.academyShare || 0,
      });
    }

    // Enrich teacher compensation type
    const teacherIds = Object.keys(teacherRevMap);
    if (teacherIds.length > 0) {
      const teachers = await Teacher.find({ _id: { $in: teacherIds } })
        .select("name subject compensation balance").lean();
      for (const t of teachers) {
        const tid = t._id.toString();
        if (teacherRevMap[tid]) {
          teacherRevMap[tid].subject = t.subject;
          teacherRevMap[tid].compensationType = t.compensation?.type || "percentage";
          teacherRevMap[tid].compensationDetails = t.compensation;
          teacherRevMap[tid].currentBalance = t.balance;
        }
      }
    }

    const periodLabels = {
      today: "Today's", week: "This Week's", month: "This Month's",
      full: "All-Time", custom: "Custom Period",
    };

    return res.json({
      success: true,
      data: {
        period: periodLabels[period] || "Today's",
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalRefunds,
        revenueByCategory: revenueByCategory.map(r => ({
          category: r._id || "Uncategorized", amount: r.total, transactions: r.count,
        })),
        expenseByCategory: expenseByCategory.map(e => ({
          category: e._id || "Uncategorized", amount: e.total, transactions: e.count,
        })),
        feesCollected: feesSummary,
        feeDetails,
        teacherRevenue: Object.values(teacherRevMap),
        partnerRevenue: Object.values(partnerRevenue),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Generate Report Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// ACADEMY POOL REPORT — per-class, per-teacher, per-student breakdown
// =====================================================================
exports.getAcademyPoolReport = async (req, res) => {
  try {
    const DailyRevenue = require("../models/DailyRevenue");
    const config = await Configuration.findOne().lean();

    // Get all ACADEMY_SHARE DailyRevenue entries
    const entries = await DailyRevenue.find({
      revenueType: "ACADEMY_SHARE",
    }).sort({ date: -1 }).lean();

    const totalPool = entries.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Group by partner
    const byPartner = {};
    for (const e of entries) {
      const pid = e.partner?.toString() || "unknown";
      if (!byPartner[pid]) byPartner[pid] = { total: 0, count: 0, items: [] };
      byPartner[pid].total += e.amount || 0;
      byPartner[pid].count++;
      byPartner[pid].items.push({
        amount: e.amount, className: e.className || "", studentName: e.studentName || "",
        date: e.date, description: e.splitDetails?.description || "",
      });
    }

    // Enrich
    const partnerIds = Object.keys(byPartner).filter(id => id !== "unknown");
    if (partnerIds.length > 0) {
      const users = await User.find({ _id: { $in: partnerIds } }).select("fullName role").lean();
      for (const u of users) {
        const pid = u._id.toString();
        if (byPartner[pid]) {
          byPartner[pid].name = u.fullName;
          byPartner[pid].role = u.role;
        }
      }
    }

    // Also get TUITION_SHARE totals for comparison
    const tuitionEntries = await DailyRevenue.find({ revenueType: "TUITION_SHARE" }).lean();
    const totalTuition = tuitionEntries.reduce((sum, e) => sum + (e.amount || 0), 0);

    return res.json({
      success: true,
      data: {
        totalPool,
        totalTuition,
        grandTotal: totalPool + totalTuition,
        entryCount: entries.length,
        byPartner: Object.entries(byPartner).map(([id, info]) => ({
          partnerId: id,
          partnerName: info.name || "Unknown",
          role: info.role || "UNKNOWN",
          total: info.total,
          count: info.count,
          items: info.items,
        })),
        academyShareSplit: config?.academyShareSplit || [],
      },
    });
  } catch (error) {
    console.error("Academy Pool Report Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.distributeRevenue = async ({ studentId, paidAmount, feeRecordId }) => {
  try {
    const normalizeSubjectName = (value) => {
      if (!value) return "";
      if (typeof value === "string") return value.trim();
      if (typeof value === "object") {
        return (
          value.name ||
          value.subject ||
          value.subName ||
          value.title ||
          ""
        ).trim();
      }
      return "";
    };

    const normalizeSubjectList = (list) => {
      if (!Array.isArray(list)) return [];
      return list
        .map(normalizeSubjectName)
        .filter(Boolean)
        .map((s) => s.toLowerCase());
    };

    let resolvedStudentId = studentId;
    let resolvedPaidAmount = paidAmount;

    if (feeRecordId) {
      const feeRecord = await FeeRecord.findById(feeRecordId).lean();
      if (!feeRecord) {
        throw new Error("Fee record not found");
      }
      if (!resolvedStudentId) {
        resolvedStudentId = feeRecord.student;
      }
      if (!resolvedPaidAmount) {
        resolvedPaidAmount = feeRecord.amount;
      }
    }

    if (!resolvedStudentId) {
      throw new Error("Student reference is missing");
    }
    if (!resolvedPaidAmount || resolvedPaidAmount <= 0) {
      throw new Error("Paid amount is missing or invalid");
    }

    const student = await Student.findById(resolvedStudentId).lean();
    if (!student) {
      throw new Error("Student not found");
    }

    const config = await Configuration.findOne().lean();
    const teacherSharePct = config?.salaryConfig?.teacherShare ?? 70;
    const teacherPool = Math.floor(
      resolvedPaidAmount * (teacherSharePct / 100),
    );
    const academyShare = resolvedPaidAmount - teacherPool;

    const classQuery = student.classRef
      ? { _id: student.classRef }
      : { $or: [{ classTitle: student.class }, { gradeLevel: student.class }] };
    const classDoc = await Class.findOne(classQuery).lean();

    const enrolledSubjects = normalizeSubjectList(student.subjects || []);
    let subjectCandidates = enrolledSubjects;

    if (subjectCandidates.length === 0) {
      subjectCandidates = normalizeSubjectList(
        (classDoc?.subjectTeachers || []).map((entry) => entry.subject),
      );
    }
    if (subjectCandidates.length === 0) {
      subjectCandidates = normalizeSubjectList(classDoc?.subjects || []);
    }

    subjectCandidates = [...new Set(subjectCandidates)];

    let teacherUpdates = [];
    let transactionCreates = [];
    let sharePerSubject = 0;
    let unallocatedAmount = 0;
    let allocatedAmount = 0;

    if (subjectCandidates.length > 0) {
      sharePerSubject = Math.floor(teacherPool / subjectCandidates.length);

      const subjectTeacherMap = new Map();
      (classDoc?.subjectTeachers || []).forEach((entry) => {
        const subjectName = normalizeSubjectName(entry?.subject)
          .toLowerCase()
          .trim();
        if (!subjectName) return;
        const existing = subjectTeacherMap.get(subjectName) || [];
        existing.push(entry);
        subjectTeacherMap.set(subjectName, existing);
      });

      for (const subjectName of subjectCandidates) {
        const matchingEntries = subjectTeacherMap.get(subjectName) || [];
        const validEntries = matchingEntries.filter((e) => e?.teacherId);
        if (validEntries.length === 0) {
          console.log(
            `⚠️ No teacher for ${subjectName} - Funds diverted to Unallocated`,
          );
          unallocatedAmount += sharePerSubject;
          continue;
        }

        const perTeacherShare = Math.floor(
          sharePerSubject / validEntries.length,
        );

        for (const entry of validEntries) {
          const teacherId = entry.teacherId;
          const teacherName = entry.teacherName || "";
          const displaySubject =
            normalizeSubjectName(entry.subject) || subjectName;

          if (perTeacherShare > 0) {
            teacherUpdates.push({
              updateOne: {
                filter: { _id: teacherId },
                update: { $inc: { "balance.pending": perTeacherShare } },
              },
            });

            transactionCreates.push({
              type: "CREDIT",
              category: "Teacher Share",
              amount: perTeacherShare,
              description: `Credit: Share from ${student.studentName} - ${displaySubject}`,
              date: new Date(),
              status: "VERIFIED",
              splitDetails: {
                teacherId: teacherId,
                teacherName: teacherName,
                studentId: resolvedStudentId,
                studentName: student.studentName,
                subject: displaySubject,
                shareType: "SESSION_SPLIT",
              },
            });
            allocatedAmount += perTeacherShare;
          }
        }

        const remainderForSubject =
          sharePerSubject - perTeacherShare * validEntries.length;
        if (remainderForSubject > 0) {
          unallocatedAmount += remainderForSubject;
        }
      }
    } else if (classDoc?.assignedTeacher) {
      const classTeacher = await Teacher.findById(
        classDoc.assignedTeacher,
      ).lean();
      if (classTeacher) {
        sharePerSubject = teacherPool;
        teacherUpdates.push({
          updateOne: {
            filter: { _id: classTeacher._id },
            update: { $inc: { "balance.pending": teacherPool } },
          },
        });

        transactionCreates.push({
          type: "CREDIT",
          category: "Teacher Share",
          amount: teacherPool,
          description: `Credit: Share from ${student.studentName} - Class Teacher`,
          date: new Date(),
          status: "VERIFIED",
          splitDetails: {
            teacherId: classTeacher._id,
            teacherName: classTeacher.name,
            studentId: resolvedStudentId,
            studentName: student.studentName,
            shareType: "CLASS_TEACHER_FALLBACK",
          },
        });
        allocatedAmount = teacherPool;
      }
    } else {
      unallocatedAmount = teacherPool;
    }

    const totalAllocated = allocatedAmount + unallocatedAmount;
    if (teacherPool > totalAllocated) {
      unallocatedAmount += teacherPool - totalAllocated;
    }

    if (unallocatedAmount > 0) {
      transactionCreates.push({
        type: "CREDIT",
        category: "Unallocated Pool",
        amount: unallocatedAmount,
        description: `Unallocated teacher share from ${student.studentName}`,
        date: new Date(),
        status: "VERIFIED",
        splitDetails: {
          studentId: resolvedStudentId,
          studentName: student.studentName,
          shareType: "UNALLOCATED_POOL",
        },
      });
    }

    if (teacherUpdates.length > 0) {
      await Teacher.bulkWrite(teacherUpdates);
    }

    if (transactionCreates.length > 0) {
      await Transaction.insertMany(transactionCreates);
    }

    await Transaction.create({
      type: "INCOME",
      category: "Academy Share",
      amount: academyShare,
      description: `Academy share from ${student.studentName}`,
      date: new Date(),
      status: "VERIFIED",
      splitDetails: {
        studentId: resolvedStudentId,
        studentName: student.studentName,
        shareType: "ACADEMY_SPLIT",
      },
    });

    return {
      success: true,
      teacherPool,
      academyShare,
      teachersCount: teacherUpdates.length,
      sharePerTeacher: sharePerSubject,
      unallocatedAmount,
      teacherUpdates: teacherUpdates.length,
      transactionsCreated: transactionCreates.length + 1,
    };
  } catch (error) {
    console.error("Revenue distribution error:", error);
    throw error;
  }
};

// =====================================================================
// TEACHER PAYROLL REPORT — What each teacher is owed (for manual credit)
// =====================================================================
exports.getTeacherPayrollReport = async (req, res) => {
  try {
    const { startDate, endDate, teacherId, classId } = req.query;

    // Date range filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    if (!startDate && !endDate) {
      // Default: current month
      const now = new Date();
      dateFilter.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter.$lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // Get all teachers (not OWNER/PARTNER)
    const teacherFilter = { status: "active" };
    if (teacherId) teacherFilter._id = teacherId;

    const teachers = await Teacher.find(teacherFilter).lean();
    const config = await Configuration.findOne().lean();

    // Filter out Owner/Partner teachers — they close from dashboard
    const ownerPartnerUsers = await User.find({ role: { $in: ["OWNER", "PARTNER"] } }).select("teacherId").lean();
    const ownerPartnerTeacherIds = new Set(
      ownerPartnerUsers.filter(u => u.teacherId).map(u => u.teacherId.toString())
    );

    // Owner/Partner should close from their own dashboards, not appear in teacher payroll.
    const payrollTeachers = teachers.filter(t => !ownerPartnerTeacherIds.has(t._id.toString()));

    const report = [];

    for (const teacher of payrollTeachers) {
      const compType = teacher.compensation?.type || "percentage";
      const teacherIdStr = teacher._id.toString();
      const normalize = (value) => (value || "").toString().toLowerCase().trim();

      // Find all classes this teacher is assigned to
      const assignedClasses = await Class.find({
        status: "active",
        $or: [
          { assignedTeacher: teacher._id },
          { "subjectTeachers.teacherId": teacher._id },
        ],
        ...(classId ? { _id: classId } : {}),
      }).lean();

      // Get fee records for this teacher in the period (supports legacy + multi-teacher array)
      const feeRecords = await FeeRecord.find({
        status: "PAID",
        $or: [
          { teacher: teacher._id },
          { "teachers.teacherId": teacher._id },
        ],
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      }).lean();

      // Build subject-level fee flow proof (student paid -> teacher share + academy pool + stakeholder split)
      const classIds = assignedClasses.map((c) => c._id).filter(Boolean);
      const taughtSubjects = new Set();

      for (const cls of assignedClasses) {
        for (const st of cls.subjectTeachers || []) {
          const primaryId = st.teacherId?.toString?.();
          if (primaryId === teacherIdStr) {
            taughtSubjects.add(normalize(st.subject));
          }
          for (const co of st.coTeachers || []) {
            const coId = co.teacherId?.toString?.();
            if (coId === teacherIdStr) {
              taughtSubjects.add(normalize(st.subject));
            }
          }
        }
      }
      if (teacher.subject) {
        taughtSubjects.add(normalize(teacher.subject));
      }

      const classFeeRecordsForFlow = classIds.length > 0
        ? await FeeRecord.find({
            status: "PAID",
            class: { $in: classIds },
            ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          })
            .select("studentName className createdAt receiptNumber subjectBreakdown academyDistribution")
            .lean()
        : [];

      const subjectFlowItems = [];
      const subjectFlowTotals = {
        subjectFeesCollected: 0,
        teacherShareFromFees: 0,
        academyPoolRouted: 0,
        ownerPartnerDirectRouted: 0,
        feePaymentCount: 0,
      };

      for (const fr of classFeeRecordsForFlow) {
        for (const sb of fr.subjectBreakdown || []) {
          const subjectNorm = normalize(sb.subject);
          const sbTeacherId = sb.teacherId?.toString?.();
          const matchesTeacherId = !!sbTeacherId && sbTeacherId === teacherIdStr;
          const matchesTeacherSubject = subjectNorm && taughtSubjects.has(subjectNorm);

          if (!matchesTeacherId && !matchesTeacherSubject) {
            continue;
          }

          const stakeholderSplits = (fr.academyDistribution || [])
            .filter((dist) => normalize(dist.subject) === subjectNorm && Number(dist.amount || 0) > 0)
            .map((dist) => ({
              fullName: dist.fullName,
              role: dist.role,
              percentage: dist.percentage,
              amount: Number(dist.amount || 0),
            }));

          const row = {
            studentName: fr.studentName,
            className: fr.className,
            date: fr.createdAt,
            receipt: fr.receiptNumber,
            subject: sb.subject,
            subjectFee: Number(sb.subjectPrice || 0),
            teacherShare: Number(sb.teacherShare || 0),
            academyPoolShare: Number(sb.academyShare || 0),
            ownerPartnerDirectShare: Number(sb.ownerPartnerShare || 0),
            compensationType: sb.compensationType || "percentage",
            stakeholderSplits,
          };

          subjectFlowItems.push(row);
          subjectFlowTotals.subjectFeesCollected += row.subjectFee;
          subjectFlowTotals.teacherShareFromFees += row.teacherShare;
          subjectFlowTotals.academyPoolRouted += row.academyPoolShare;
          subjectFlowTotals.ownerPartnerDirectRouted += row.ownerPartnerDirectShare;
          subjectFlowTotals.feePaymentCount += 1;
        }
      }

      let owedAmount = 0;
      let proof = [];

      if (compType === "percentage") {
        // Use per-teacher Transaction records (NOT FeeRecord.splitBreakdown which is the TOTAL for all teachers)
        const teacherShare = teacher.compensation?.teacherShare || config?.salaryConfig?.teacherShare || 70;
        const teacherTransactions = await Transaction.find({
          type: "INCOME",
          category: "Tuition",
          "splitDetails.teacherId": teacher._id,
          status: { $in: ["FLOATING", "VERIFIED"] },
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        }).lean();

        owedAmount = teacherTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const flowBackedProof = subjectFlowItems
          .filter((item) => item.teacherShare > 0)
          .map((item) => ({
            studentName: item.studentName,
            className: item.className,
            amount: item.subjectFee,
            teacherShare: item.teacherShare,
            academyPoolShare: item.academyPoolShare,
            ownerPartnerDirectShare: item.ownerPartnerDirectShare,
            date: item.date,
            subject: item.subject,
            receipt: item.receipt,
            compensationType: item.compensationType,
            stakeholderSplits: item.stakeholderSplits,
          }));

        if (flowBackedProof.length > 0) {
          proof = flowBackedProof;
        } else {
          proof = teacherTransactions.map(tx => {
            // Parse student name and subject from description: "Biology teacher share: Kashif Ullah (March 2026)"
            const desc = tx.description || "";
            const subjectMatch = desc.match(/^(.+?) teacher share:/);
            const studentMatch = desc.match(/teacher share: (.+?) \(/);
            const subjectFee = Number(tx.splitDetails?.subjectFee || tx.amount || 0);
            const teacherFeeShare = Number(tx.amount || 0);
            return {
              studentName: tx.splitDetails?.studentName || studentMatch?.[1] || "Student",
              className: feeRecords.find(fr => fr.student?.toString() === tx.splitDetails?.studentId?.toString())?.className || "",
              amount: subjectFee,
              teacherShare: teacherFeeShare,
              academyPoolShare: Math.max(0, subjectFee - teacherFeeShare),
              date: tx.date || tx.createdAt,
              subject: tx.splitDetails?.subject || subjectMatch?.[1] || "",
              stakeholderSplits: [],
            };
          });
        }

        // Fallback: if no transactions found, use FeeRecord method (legacy + multi-teacher data)
        if (teacherTransactions.length === 0 && feeRecords.length > 0) {
          let fallbackTotal = 0;
          const fallbackProof = [];

          for (const fr of feeRecords) {
            const teacherEntries = Array.isArray(fr.teachers)
              ? fr.teachers.filter((t) => t?.teacherId?.toString?.() === teacher._id.toString())
              : [];

            if (teacherEntries.length > 0) {
              const teacherShare = teacherEntries.reduce((s, t) => s + (t.teacherShare || 0), 0);
              fallbackTotal += teacherShare;
              fallbackProof.push({
                studentName: fr.studentName,
                className: fr.className,
                amount: fr.amount,
                teacherShare,
                date: fr.createdAt,
                receipt: fr.receiptNumber,
                subject: teacherEntries.map((t) => t.subject).filter(Boolean).join(", "),
              });
            } else if (fr.teacher?.toString?.() === teacher._id.toString()) {
              const teacherShare = fr.splitBreakdown?.teacherShare || 0;
              fallbackTotal += teacherShare;
              fallbackProof.push({
                studentName: fr.studentName,
                className: fr.className,
                amount: fr.amount,
                teacherShare,
                date: fr.createdAt,
                receipt: fr.receiptNumber,
              });
            }
          }

          owedAmount = fallbackTotal;
          proof = fallbackProof;
        }

        // Legacy compatibility fallback:
        // Some older admission payments were stored as FeeRecords without teacher tags.
        // Estimate this teacher's share from class/subject assignment so payroll remains accurate.
        if (teacherTransactions.length === 0 && proof.length === 0 && assignedClasses.length > 0) {
          const classIds = assignedClasses.map((c) => c._id);
          const classFeeRecords = await FeeRecord.find({
            class: { $in: classIds },
            status: "PAID",
            ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          }).lean();

          const classMap = new Map(assignedClasses.map((c) => [c._id.toString(), c]));
          const teacherSharePct = teacher.compensation?.teacherShare || config?.salaryConfig?.teacherShare || 70;

          const normalize = (val) => (val || "").toString().toLowerCase().trim();
          let estimatedTotal = 0;
          const estimatedProof = [];

          for (const fr of classFeeRecords) {
            const cls = classMap.get(fr.class?.toString?.());
            if (!cls) continue;

            // Build subjects this teacher teaches in this class (primary + co-teachers)
            const taughtSubjects = new Set();
            for (const st of cls.subjectTeachers || []) {
              const primaryId = st.teacherId?.toString?.();
              if (primaryId === teacher._id.toString()) {
                taughtSubjects.add(normalize(st.subject));
              }
              for (const co of st.coTeachers || []) {
                const coId = co.teacherId?.toString?.();
                if (coId === teacher._id.toString()) {
                  taughtSubjects.add(normalize(st.subject));
                }
              }
            }

            const isClassTeacher = cls.assignedTeacher?.toString?.() === teacher._id.toString();

            const studentDoc = await Student.findById(fr.student)
              .select("studentName subjects")
              .lean();

            const studentSubjects = Array.isArray(studentDoc?.subjects)
              ? studentDoc.subjects
              : [];

            let estimatedShare = 0;

            // If mapped as whole-class assigned teacher and no subject map, apply class-wide percentage
            if (isClassTeacher && taughtSubjects.size === 0) {
              estimatedShare = Math.round((fr.amount * teacherSharePct) / 100);
            } else if (taughtSubjects.size > 0 && studentSubjects.length > 0) {
              const subjectWeights = studentSubjects.map((s) => {
                if (typeof s === "string") {
                  return { name: normalize(s), fee: 0 };
                }
                return { name: normalize(s.name), fee: Number(s.fee) || 0 };
              });

              const totalWeight = subjectWeights.reduce((sum, s) => sum + (s.fee || 0), 0);

              for (let i = 0; i < subjectWeights.length; i++) {
                const subj = subjectWeights[i];
                if (!taughtSubjects.has(subj.name)) continue;

                let subjectAmount = 0;
                if (totalWeight > 0) {
                  subjectAmount = Math.round((subj.fee / totalWeight) * fr.amount);
                } else {
                  // If no per-subject fee weights exist, split equally by enrolled subjects
                  subjectAmount = Math.round(fr.amount / subjectWeights.length);
                }

                estimatedShare += Math.round((subjectAmount * teacherSharePct) / 100);
              }
            }

            if (estimatedShare > 0) {
              estimatedTotal += estimatedShare;
              estimatedProof.push({
                studentName: fr.studentName || studentDoc?.studentName || "Student",
                className: fr.className || cls.classTitle || "",
                amount: fr.amount,
                teacherShare: estimatedShare,
                date: fr.createdAt,
                receipt: fr.receiptNumber,
                source: "legacy-estimation",
              });
            }
          }

          if (estimatedTotal > 0) {
            owedAmount = estimatedTotal;
            proof = estimatedProof;
          }
        }
      } else if (compType === "perStudent") {
        // Count active enrolled students per class × perStudentAmount
        const perStudentAmount = teacher.compensation?.perStudentAmount || 0;
        for (const cls of assignedClasses) {
          const activeStudents = await Student.find({
            classRef: cls._id,
            status: "active",
            studentStatus: "Active",
          }).select("studentName studentId").lean();
          const classOwed = activeStudents.length * perStudentAmount;
          owedAmount += classOwed;
          proof.push({
            className: cls.classTitle,
            studentCount: activeStudents.length,
            perStudentAmount,
            total: classOwed,
            students: activeStudents.map(s => ({ name: s.studentName, id: s.studentId })),
          });
        }
      } else if (compType === "fixed") {
        owedAmount = teacher.compensation?.fixedSalary || 0;
        proof = [{ type: "Fixed Monthly Salary", amount: owedAmount }];
      } else if (compType === "hybrid") {
        const baseSalary = teacher.compensation?.baseSalary || 0;
        const profitShare = teacher.compensation?.profitShare || 0;
        const feeTotal = feeRecords.reduce((sum, fr) => sum + fr.amount, 0);
        const profitAmount = Math.round((feeTotal * profitShare) / 100);
        owedAmount = baseSalary + profitAmount;
        proof = [{
          baseSalary,
          profitShare: `${profitShare}%`,
          totalFees: feeTotal,
          profitAmount,
          total: owedAmount,
        }];
      }

      // Deduct any already-paid amounts in this period
      const payments = await TeacherPayment.find({
        teacherId: teacher._id,
        status: "paid",
        ...(Object.keys(dateFilter).length > 0 ? { paymentDate: dateFilter } : {}),
      }).lean();
      const alreadyPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

      // Deduct withdrawal adjustments
      const withdrawalAdj = await Transaction.aggregate([
        {
          $match: {
            type: "WITHDRAWAL_REVERSAL",
            "splitDetails.teacherId": teacher._id,
            ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const withdrawalDeduction = withdrawalAdj[0]?.total || 0;

      const netOwed = Math.max(0, owedAmount - alreadyPaid - withdrawalDeduction);

      report.push({
        teacherId: teacher._id,
        teacherName: teacher.name,
        subject: teacher.subject,
        compensationType: compType,
        compensationDetails: teacher.compensation,
        classes: assignedClasses.map(c => ({ _id: c._id, title: c.classTitle })),
        grossOwed: owedAmount,
        grossEarned: owedAmount,
        alreadyPaid,
        withdrawalDeduction,
        withdrawalAdjustments: withdrawalDeduction,
        netOwed,
        revenueFlow: {
          subjectFeesCollected: subjectFlowTotals.subjectFeesCollected,
          teacherShareFromFees: subjectFlowTotals.teacherShareFromFees,
          academyPoolRouted: subjectFlowTotals.academyPoolRouted,
          ownerPartnerDirectRouted: subjectFlowTotals.ownerPartnerDirectRouted,
          feePaymentCount: subjectFlowTotals.feePaymentCount,
          sampleItems: subjectFlowItems.slice(0, 20),
        },
        proof: compType === "percentage" ? {
          teacherSharePercent: teacher.compensation?.teacherShare || config?.salaryConfig?.teacherShare || 70,
          feeRecordCount: proof.length,
          totalFromFees: owedAmount,
          totalAcademyPoolFromFees: proof.reduce((sum, item) => sum + Number(item.academyPoolShare || 0), 0),
          totalOwnerPartnerDirectFromFees: proof.reduce((sum, item) => sum + Number(item.ownerPartnerDirectShare || 0), 0),
          items: proof,
        } : compType === "perStudent" ? {
          perStudentAmount: teacher.compensation?.perStudentAmount || 0,
          activeStudentCount: proof.reduce((s, p) => s + (p.studentCount || 0), 0),
          calculatedAmount: owedAmount,
          collectionHandling: "Student fee for these subjects is routed to academy pool/stakeholders at collection time. Teacher amount is calculated from active student count in payroll.",
          subjectFeesCollected: subjectFlowTotals.subjectFeesCollected,
          academyPoolRouted: subjectFlowTotals.academyPoolRouted,
          ownerPartnerDirectRouted: subjectFlowTotals.ownerPartnerDirectRouted,
          feeFlowItems: subjectFlowItems,
          items: proof,
        } : compType === "fixed" ? {
          fixedSalary: teacher.compensation?.fixedSalary || 0,
          collectionHandling: "Student fee for these subjects is routed to academy pool/stakeholders at collection time. Fixed salary is paid via monthly payroll.",
          subjectFeesCollected: subjectFlowTotals.subjectFeesCollected,
          academyPoolRouted: subjectFlowTotals.academyPoolRouted,
          ownerPartnerDirectRouted: subjectFlowTotals.ownerPartnerDirectRouted,
          feeFlowItems: subjectFlowItems,
          items: proof,
        } : compType === "hybrid" ? {
          baseSalary: teacher.compensation?.baseSalary || 0,
          profitSharePercent: teacher.compensation?.profitShare || 0,
          profitShareAmount: owedAmount - (teacher.compensation?.baseSalary || 0),
          subjectFeesCollected: subjectFlowTotals.subjectFeesCollected,
          academyPoolRouted: subjectFlowTotals.academyPoolRouted,
          ownerPartnerDirectRouted: subjectFlowTotals.ownerPartnerDirectRouted,
          feeFlowItems: subjectFlowItems,
          items: proof,
        } : { items: proof },
        currentBalance: teacher.balance,
      });
    }

    return res.json({
      success: true,
      period: dateFilter,
      teacherCount: report.length,
      totalOwed: report.reduce((sum, r) => sum + r.netOwed, 0),
      data: report,
    });
  } catch (error) {
    console.error("TeacherPayrollReport Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// ACADEMY SHARE SPLIT CONFIG — Get/Update the academy share split
// =====================================================================
exports.getAcademyShareSplit = async (req, res) => {
  try {
    const config = await Configuration.findOne().lean();
    return res.json({
      success: true,
      data: config?.academyShareSplit || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAcademyShareSplit = async (req, res) => {
  try {
    const { splits } = req.body; // Array of { userId, teacherId, fullName, role, percentage }

    if (!splits || !Array.isArray(splits)) {
      return res.status(400).json({ success: false, message: "splits array is required" });
    }

    const total = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (total !== 100) {
      return res.status(400).json({
        success: false,
        message: `Percentages must total 100%, got ${total}%`,
      });
    }

    const config = await Configuration.findOne();
    if (!config) {
      return res.status(404).json({ success: false, message: "Configuration not found" });
    }

    config.academyShareSplit = splits;
    await config.save();

    return res.json({
      success: true,
      message: "Academy share split updated successfully",
      data: config.academyShareSplit,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/finance/academy-pool-report
 * Real-time academy pool revenue report with per-class, per-student, per-teacher details.
 * Shows how every PKR of academy revenue was generated and distributed.
 */
exports.getAcademyPoolReport = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get academy share split configuration
    const config = await Configuration.findOne().lean();
    const academyShareSplit = config?.academyShareSplit || [];

    // Get all DailyRevenue entries for this month for ACADEMY_SHARE
    const academyEntries = await DailyRevenue.find({
      revenueType: "ACADEMY_SHARE",
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1 }).lean();

    // Get all DailyRevenue entries for TUITION_SHARE this month
    const tuitionEntries = await DailyRevenue.find({
      revenueType: "TUITION_SHARE",
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1 }).lean();

    // Get WITHDRAWAL_ADJUSTMENT entries this month
    const adjustmentEntries = await DailyRevenue.find({
      revenueType: "WITHDRAWAL_ADJUSTMENT",
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1 }).lean();

    // Get all fee records this month with class & student details
    const feeRecords = await FeeRecord.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: "PAID",
    }).populate("student", "fullName studentId").lean();

    // Get all classes with teacher assignments (include inactive/archived)
    // so monthly class totals remain consistent with fee records and summary cards.
    const classes = await Class.find({})
      .populate({
        path: "subjectTeachers.teacherId",
        select: "name compensation userId",
        populate: { path: "userId", select: "fullName role" },
      })
      .lean();

    // Build class map
    const classMap = new Map();
    for (const cls of classes) {
      classMap.set(cls._id.toString(), cls);
    }

    // === SECTION 1: Academy Pool Revenue per Class ===
    // Group fee records by class with teacher split details
    const classRevenue = new Map();
    for (const fee of feeRecords) {
      const classId = fee.class?.toString() || null;
      const cls = classId ? classMap.get(classId) : null;

      // Use classRef when available; fallback to className bucket for archived/missing class docs.
      const classKey = classId || `archived:${fee.className || "Unknown Class"}`;

      if (!classRevenue.has(classKey)) {
        // Determine teachers and their splits
        const teachers = [];
        let hasAcademyTeachers = false;
        if (cls) {
          for (const st of cls.subjectTeachers || []) {
            if (!st.teacherId) continue;
            const teacher = st.teacherId;
            const userRole = teacher.userId?.role || "TEACHER";
            const compType = teacher.compensation?.type || "percentage";
            const teacherShare = teacher.compensation?.teacherShare || 70;
            const academyShare = teacher.compensation?.academyShare || 30;
            const perStudentAmount = teacher.compensation?.perStudentAmount || 0;
            const fixedSalary = teacher.compensation?.fixedSalary || 0;

            if (userRole === "OWNER" || userRole === "PARTNER") {
              teachers.push({
                name: teacher.userId?.fullName || teacher.name,
                role: userRole,
                subject: st.subject,
                compType: "tuition",
                teacherShare: 100,
                academyShare: 0,
              });
            } else {
              hasAcademyTeachers = true;
              teachers.push({
                name: teacher.userId?.fullName || teacher.name,
                role: "TEACHER",
                subject: st.subject,
                compType,
                teacherShare: compType === "percentage" ? teacherShare : 0,
                academyShare: compType === "percentage" ? academyShare : (compType === "perStudent" ? 0 : 0),
                perStudentAmount: compType === "perStudent" ? perStudentAmount : 0,
                fixedSalary: compType === "fixed" ? fixedSalary : 0,
                profitShare: compType === "hybrid" ? (teacher.compensation?.profitShare || 0) : 0,
              });
            }
          }
        }

        classRevenue.set(classKey, {
          classId: classId || null,
          classTitle: cls?.classTitle || cls?.title || cls?.className || fee.className || "Archived Class",
          gradeLevel: cls?.gradeLevel || "Archived",
          teachers,
          hasAcademyTeachers,
          students: [],
          totalFeeCollected: 0,
          totalAcademyPool: 0,
          totalTeacherPayout: 0,
        });
      }

      const entry = classRevenue.get(classKey);
      const paidAmt = fee.amount || 0;
      entry.totalFeeCollected += paidAmt;

      // Calculate academy pool contribution for this student
      // Mixed classes (Owner/Partners + regular teachers) are handled per-subject.
      const hasOwnerPartner = entry.teachers.some(t => t.role === "OWNER" || t.role === "PARTNER");
      let academyPool = 0;
      let teacherPayout = 0;
      if (entry.teachers.length > 0) {
        const numTeachers = entry.teachers.length;
        for (const t of entry.teachers) {
          const subjectShare = Math.round(paidAmt / numTeachers);
          if (t.role === "OWNER" || t.role === "PARTNER") {
            // Owner/Partner teaching this subject: 100% goes to them (TUITION_SHARE)
            teacherPayout += subjectShare;
          } else if (t.compType === "percentage") {
            const tShare = Math.round((subjectShare * t.teacherShare) / 100);
            const aShare = subjectShare - tShare;
            academyPool += aShare;
            teacherPayout += tShare;
          } else if (t.compType === "perStudent") {
            const perAmt = t.perStudentAmount || 0;
            teacherPayout += perAmt;
            academyPool += Math.max(0, subjectShare - perAmt);
          } else if (t.compType === "fixed") {
            // Fixed salary teacher: full subject fee goes to academy pool
            academyPool += subjectShare;
          } else if (t.compType === "hybrid") {
            const profitShare = t.profitShare || 0;
            const tShare = Math.round((subjectShare * profitShare) / 100);
            academyPool += subjectShare - tShare;
            teacherPayout += tShare;
          } else if (t.compType === "tuition") {
            // tuition type stored for Owner/Partners (legacy): same as OWNER/PARTNER handling
            teacherPayout += subjectShare;
          } else {
            // Unknown comp type: default 70% teacher / 30% academy
            const tShare = Math.round((subjectShare * 70) / 100);
            academyPool += subjectShare - tShare;
            teacherPayout += tShare;
          }
        }
      } else {
        // No teacher info in class: use the split recorded on the fee record
        const fallbackAcademy = fee.splitBreakdown?.academyShare || 0;
        academyPool = fallbackAcademy;
        teacherPayout = Math.max(0, paidAmt - fallbackAcademy);
      }

      entry.totalAcademyPool += academyPool;
      entry.totalTeacherPayout += teacherPayout;
      entry.students.push({
        studentName: fee.student?.fullName || fee.studentName || "Unknown",
        studentId: fee.student?.studentId || "",
        feePaid: paidAmt,
        paidDate: fee.createdAt,
        academyContribution: academyPool,
        teacherPayout,
      });
    }

    // === SECTION 2: Per-stakeholder breakdown from DailyRevenue ===
    const stakeholderMap = new Map();
    for (const entry of [...tuitionEntries, ...academyEntries, ...adjustmentEntries]) {
      const partnerId = entry.partner?.toString();
      if (!partnerId) continue;
      if (!stakeholderMap.has(partnerId)) {
        stakeholderMap.set(partnerId, {
          userId: partnerId,
          tuitionTotal: 0,
          tuitionCount: 0,
          academyTotal: 0,
          academyCount: 0,
          adjustmentTotal: 0,
          adjustmentCount: 0,
          uncollected: 0,
          collected: 0,
          entries: [],
        });
      }
      const sh = stakeholderMap.get(partnerId);
      if (entry.revenueType === "TUITION_SHARE") {
        sh.tuitionTotal += entry.amount;
        sh.tuitionCount++;
      } else if (entry.revenueType === "WITHDRAWAL_ADJUSTMENT") {
        sh.adjustmentTotal += entry.amount; // Already negative
        sh.adjustmentCount++;
      } else {
        sh.academyTotal += entry.amount;
        sh.academyCount++;
      }
      if (entry.status === "UNCOLLECTED") sh.uncollected += entry.amount;
      else sh.collected += entry.amount;
      sh.entries.push({
        type: entry.revenueType,
        amount: entry.amount,
        className: entry.className,
        studentName: entry.studentName,
        date: entry.date,
        status: entry.status,
        description: entry.splitDetails?.description || "",
      });
    }

    // Populate stakeholder names
    const userIds = [...stakeholderMap.keys()];
    const users = await User.find({ _id: { $in: userIds } }).select("fullName role").lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const stakeholders = [];
    for (const [id, data] of stakeholderMap) {
      const u = userMap.get(id);
      const splitConfig = academyShareSplit.find(s => s.userId?.toString() === id);
      stakeholders.push({
        ...data,
        fullName: u?.fullName || "Unknown",
        role: u?.role || "UNKNOWN",
        configPercentage: splitConfig?.percentage || 0,
      });
    }

    // === SECTION 3: Summary totals ===
    const totalAcademyPool = [...classRevenue.values()].reduce((s, c) => s + c.totalAcademyPool, 0);
    const totalTuitionRevenue = tuitionEntries.reduce((s, e) => s + e.amount, 0);
    const totalAcademyRevenue = academyEntries.reduce((s, e) => s + e.amount, 0);
    const totalFeeCollected = feeRecords.reduce((s, f) => s + (f.amount || 0), 0);

    return res.json({
      success: true,
      data: {
        period: { start: startOfMonth, end: endOfMonth },
        summary: {
          totalFeeCollected,
          totalAcademyPool,
          totalTuitionRevenue,
          totalAcademyRevenue,
          academyShareSplit,
        },
        classBreakdown: [...classRevenue.values()].sort((a, b) => b.totalFeeCollected - a.totalFeeCollected),
        stakeholders: stakeholders.sort((a, b) => (b.tuitionTotal + b.academyTotal) - (a.tuitionTotal + a.academyTotal)),
      },
    });
  } catch (error) {
    console.error("getAcademyPoolReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
