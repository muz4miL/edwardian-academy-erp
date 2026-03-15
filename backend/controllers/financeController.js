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
const Session = require("../models/Session");
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

    // Fee collection stats
    const [totalExpectedFees, totalCollectedFees] = await Promise.all([
      Student.aggregate([
        { $group: { _id: null, total: { $sum: "$totalFee" } } },
      ]),
      Student.aggregate([
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

    const activeSession = await Session.findOne({ status: "active" })
      .sort({ startDate: -1 })
      .lean();

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
        sessionId: activeSession?._id,
        sessionName: activeSession?.sessionName,
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
          sessionName: paymentRecord.sessionName,
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
// GENERATE FINANCIAL REPORT — Printable report for any period
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
      // All-time: no date filter needed, use a very old start date
      dateFilter = { $gte: new Date("2020-01-01") };
    } else {
      dateFilter = { $gte: today };
    }

    // Revenue from Transaction (INCOME)
    const revenueByCategory = await Transaction.aggregate([
      { $match: { type: "INCOME", date: dateFilter } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Deduct refunds from revenue
    const refundResult = await Transaction.aggregate([
      { $match: { type: "REFUND", date: dateFilter } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalRefunds = refundResult[0]?.total || 0;

    // Expenses — unified breakdown using helper
    const expenseBreakdown = await getUnifiedExpenseBreakdown(dateFilter);
    const expenseByCategory = expenseBreakdown.map(e => ({
      _id: e.category,
      total: e.total,
      count: e.count,
    }));

    const totalRevenue = revenueByCategory.reduce((s, r) => s + r.total, 0) - totalRefunds;
    const totalExpenses = expenseByCategory.reduce((s, e) => s + e.total, 0);

    const feesSummary = await FeeRecord.aggregate([
      { $match: { updatedAt: dateFilter, status: "PAID" } },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const periodLabels = {
      today: "Today's",
      week: "This Week's",
      month: "This Month's",
      full: "All-Time",
      custom: "Custom Period",
    };

    return res.json({
      success: true,
      data: {
        period: periodLabels[period] || "Today's",
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        revenueByCategory: revenueByCategory.map((r) => ({
          category: r._id || "Uncategorized",
          amount: r.total,
          transactions: r.count,
        })),
        expenseByCategory: expenseByCategory.map((e) => ({
          category: e._id || "Uncategorized",
          amount: e.total,
          transactions: e.count,
        })),
        feesCollected: {
          total: feesSummary[0]?.totalCollected || 0,
          count: feesSummary[0]?.count || 0,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Generate Report Error:", error);
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

    const regularTeachers = teachers.filter(t => !ownerPartnerTeacherIds.has(t._id.toString()));

    const report = [];

    for (const teacher of regularTeachers) {
      const compType = teacher.compensation?.type || "percentage";

      // Find all classes this teacher is assigned to
      const assignedClasses = await Class.find({
        status: "active",
        $or: [
          { assignedTeacher: teacher._id },
          { "subjectTeachers.teacherId": teacher._id },
        ],
        ...(classId ? { _id: classId } : {}),
      }).lean();

      // Get fee records for this teacher in the period
      const feeRecords = await FeeRecord.find({
        teacher: teacher._id,
        status: "PAID",
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      }).lean();

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
        proof = teacherTransactions.map(tx => {
          // Parse student name and subject from description: "Biology teacher share: Kashif Ullah (March 2026)"
          const desc = tx.description || "";
          const subjectMatch = desc.match(/^(.+?) teacher share:/);
          const studentMatch = desc.match(/teacher share: (.+?) \(/);
          return {
            studentName: tx.splitDetails?.studentName || studentMatch?.[1] || "Student",
            className: feeRecords.find(fr => fr.student?.toString() === tx.splitDetails?.studentId?.toString())?.className || "",
            amount: tx.splitDetails?.subjectFee || tx.amount || 0,
            teacherShare: tx.amount || 0,
            date: tx.date || tx.createdAt,
            subject: tx.splitDetails?.subject || subjectMatch?.[1] || "",
          };
        });

        // Fallback: if no transactions found, use FeeRecord method (legacy data)
        if (teacherTransactions.length === 0 && feeRecords.length > 0) {
          owedAmount = feeRecords.reduce((sum, fr) => sum + (fr.splitBreakdown?.teacherShare || 0), 0);
          proof = feeRecords.map(fr => ({
            studentName: fr.studentName,
            className: fr.className,
            amount: fr.amount,
            teacherShare: fr.splitBreakdown?.teacherShare || 0,
            date: fr.createdAt,
            receipt: fr.receiptNumber,
          }));
        }
      } else if (compType === "perStudent") {
        // Count active enrolled students per class × perStudentAmount
        const perStudentAmount = teacher.compensation?.perStudentAmount || 0;
        for (const cls of assignedClasses) {
          const studentCount = await Student.countDocuments({
            classRef: cls._id,
            status: "active",
            studentStatus: "Active",
          });
          const classOwed = studentCount * perStudentAmount;
          owedAmount += classOwed;
          proof.push({
            className: cls.classTitle,
            studentCount,
            perStudentAmount,
            total: classOwed,
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
        proof: compType === "percentage" ? {
          teacherSharePercent: teacher.compensation?.teacherShare || config?.salaryConfig?.teacherShare || 70,
          feeRecordCount: proof.length,
          totalFromFees: owedAmount,
          items: proof,
        } : compType === "perStudent" ? {
          perStudentAmount: teacher.compensation?.perStudentAmount || 0,
          activeStudentCount: proof.reduce((s, p) => s + (p.studentCount || 0), 0),
          calculatedAmount: owedAmount,
          items: proof,
        } : compType === "fixed" ? {
          fixedSalary: teacher.compensation?.fixedSalary || 0,
          items: proof,
        } : compType === "hybrid" ? {
          baseSalary: teacher.compensation?.baseSalary || 0,
          profitSharePercent: teacher.compensation?.profitShare || 0,
          profitShareAmount: owedAmount - (teacher.compensation?.baseSalary || 0),
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

    // Get all classes with teacher assignments
    const classes = await Class.find({ status: "active" })
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
      const classId = fee.class?.toString();
      if (!classId) continue;
      const cls = classMap.get(classId);
      if (!cls) continue;

      if (!classRevenue.has(classId)) {
        // Determine teachers and their splits
        const teachers = [];
        let hasAcademyTeachers = false;
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
            });
          }
        }

        classRevenue.set(classId, {
          classId,
          classTitle: cls.classTitle || cls.title || cls.className,
          gradeLevel: cls.gradeLevel,
          teachers,
          hasAcademyTeachers,
          students: [],
          totalFeeCollected: 0,
          totalAcademyPool: 0,
          totalTeacherPayout: 0,
        });
      }

      const entry = classRevenue.get(classId);
      const paidAmt = fee.amount || 0;
      entry.totalFeeCollected += paidAmt;

      // Calculate academy pool contribution for this student
      // TUITION-mode classes (any Owner/Partner teaches) → 0 academy pool
      const hasOwnerPartner = entry.teachers.some(t => t.role === "OWNER" || t.role === "PARTNER");
      let academyPool = 0;
      let teacherPayout = 0;
      if (!hasOwnerPartner) {
        // ACADEMY mode only: regular teachers contribute to academy pool
        const academyTeachers = entry.teachers.filter(t => t.role === "TEACHER");
        for (const t of academyTeachers) {
          const subjectShare = Math.round(paidAmt / (academyTeachers.length || 1));
          if (t.compType === "percentage") {
            const tShare = Math.round((subjectShare * t.teacherShare) / 100);
            const aShare = subjectShare - tShare;
            academyPool += aShare;
            teacherPayout += tShare;
          } else if (t.compType === "perStudent") {
            teacherPayout += t.perStudentAmount;
            academyPool += Math.max(0, subjectShare - t.perStudentAmount);
          } else if (t.compType === "fixed") {
            academyPool += subjectShare;
          }
        }
      } else {
        // TUITION mode: 100% goes to Owner/Partners (closed from dashboard), no academy pool
        teacherPayout = paidAmt;
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
