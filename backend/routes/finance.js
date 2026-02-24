/**
 * ================================================================
 * GENIUS ACADEMY — FINANCE ROUTES (Clean Single-Owner Edition)
 * ================================================================
 * All partner/pool/split routes removed. Single-owner model.
 * ================================================================
 */

const express = require("express");
const router = express.Router();
const FinanceRecord = require("../models/FinanceRecord");
const {
  getDashboardStats,
  closeDay,
  recordTransaction,
  getFinanceHistory,
  processTeacherPayout,
  processManualPayout,
  updateManualBalance,
  getTeacherPayrollData,
  getPayoutHistory,
  deleteTransaction,
  resetSystem,
  getAnalyticsDashboard,
  generateFinancialReport,
  recordStudentMiscPayment,
  getStudentMiscPayments,
} = require("../controllers/financeController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// ------------------------------------------------------------------
// CRITICAL: Place static routes BEFORE "/:id" to avoid route capture.
// ------------------------------------------------------------------

// @route   GET /api/finance/dashboard-stats
// @desc    Get financial stats for dashboard widgets
// @access  Protected (OWNER)
router.get("/dashboard-stats", protect, getDashboardStats);

// @route   GET /api/finance/history
// @desc    Get finance history (ledger) — full transaction log
// @access  Protected (OWNER, STAFF)
router.get("/history", protect, getFinanceHistory);

// @route   POST /api/finance/reset-system
// @desc    DANGER: Wipe all financial data for clean testing
// @access  Protected (OWNER only, disabled in production)
router.post(
  "/reset-system",
  protect,
  restrictTo("ADMIN", "OWNER"),
  resetSystem,
);

// @route   GET /api/finance/analytics-dashboard
// @desc    Get analytics data for charts/graphs (revenue, enrollment, etc.)
// @access  Protected (OWNER only)
router.get(
  "/analytics-dashboard",
  protect,
  restrictTo("OWNER"),
  getAnalyticsDashboard,
);

// @route   GET /api/finance/generate-report
// @desc    Generate financial report for a given period (today, week, month, custom)
// @access  Protected (OWNER only)
router.get(
  "/generate-report",
  protect,
  restrictTo("OWNER"),
  generateFinancialReport,
);

// @route   DELETE /api/finance/transaction/:id
// @desc    Delete a single transaction
// @access  Protected (OWNER only)
router.delete(
  "/transaction/:id",
  protect,
  restrictTo("OWNER", "ADMIN"),
  deleteTransaction,
);

// @route   POST /api/finance/student-misc-payment
// @desc    Record a misc student payment (trip, test, lab, event, etc.)
// @access  Protected (OWNER, STAFF)
router.post(
  "/student-misc-payment",
  protect,
  restrictTo("OWNER", "STAFF"),
  recordStudentMiscPayment,
);

// @route   GET /api/finance/student-misc-payments
// @desc    Get history of misc student payments
// @access  Protected (OWNER, STAFF)
router.get(
  "/student-misc-payments",
  protect,
  getStudentMiscPayments,
);

// @route   POST /api/finance/close-day
// @desc    Close the day and lock floating cash into verified balance
// @access  Protected (OWNER, STAFF)
router.post("/close-day", protect, restrictTo("OWNER", "STAFF", "PARTNER"), closeDay);

// @route   POST /api/finance/record-transaction
// @desc    Record a new income or expense transaction
// @access  Protected (OWNER, STAFF)
router.post(
  "/record-transaction",
  protect,
  restrictTo("OWNER", "STAFF"),
  recordTransaction,
);

// @route   POST /api/finance/teacher-payout
// @desc    Process payout to teacher from verified balance
// @access  Protected (OWNER only)
router.post(
  "/teacher-payout",
  protect,
  restrictTo("OWNER"),
  processTeacherPayout,
);

// @route   POST /api/finance/manual-payout
// @desc    Process manual payout/advance to any user
// @access  Protected (OWNER only)
router.post(
  "/manual-payout",
  protect,
  restrictTo("OWNER"),
  processManualPayout,
);

// @route   POST /api/finance/update-manual-balance
// @desc    Set/adjust a user's manual owed balance
// @access  Protected (OWNER only)
router.post(
  "/update-manual-balance",
  protect,
  restrictTo("OWNER"),
  updateManualBalance,
);

// @route   GET /api/finance/teacher-payroll
// @desc    Get payroll data for all active teachers
// @access  Protected (OWNER only)
router.get(
  "/teacher-payroll",
  protect,
  restrictTo("OWNER"),
  getTeacherPayrollData,
);

// @route   GET /api/finance/payout-history/:userId
// @desc    Get payout history for a specific user
// @access  Protected (OWNER or self)
router.get("/payout-history/:userId", protect, getPayoutHistory);

// ------------------------------------------------------------------
// PARTNER FINANCIAL ENDPOINTS
// ------------------------------------------------------------------

const Expense = require("../models/Expense");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const Settlement = require("../models/Settlement");
const User = require("../models/User");
const Configuration = require("../models/Configuration");

// @route   GET /api/finance/partner/dashboard
// @desc    Partner-specific financial dashboard stats (includes teacher credits)
// @access  Protected (PARTNER, OWNER)
router.get("/partner/dashboard", protect, restrictTo("PARTNER", "OWNER"), async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const Teacher = require("../models/Teacher");
    const TeacherPayment = require("../models/TeacherPayment");

    // Determine partner's split percentage from config
    const config = await Configuration.findOne();
    let splitPercentage = 0;

    // Check dynamic expenseShares first
    if (config?.expenseShares && config.expenseShares.length > 0) {
      const myShare = config.expenseShares.find(s => s.userId?.toString() === userId.toString());
      if (myShare) splitPercentage = myShare.percentage || 0;
    } else {
      // Legacy: check partnerIds mapping
      let partnerKey = null;
      if (config?.partnerIds) {
        for (const [key, id] of Object.entries(config.partnerIds)) {
          if (id && id.toString() === userId.toString()) {
            partnerKey = key;
            break;
          }
        }
      }
      if (partnerKey) splitPercentage = config?.expenseSplit?.[partnerKey] || 0;
    }

    // Get expense shares for this partner
    const unpaidExpenses = await Expense.find({
      "shares.partner": userId,
      "shares.status": "UNPAID",
    }).sort({ expenseDate: -1 });

    let totalDebt = 0;
    const debtDetails = [];
    unpaidExpenses.forEach(exp => {
      const myShare = exp.shares.find(s => s.partner?.toString() === userId.toString() && s.status === "UNPAID");
      if (myShare) {
        totalDebt += myShare.amount;
        debtDetails.push({
          expenseId: exp._id,
          title: exp.title,
          category: exp.category,
          totalAmount: exp.amount,
          myShare: myShare.amount,
          myPercentage: myShare.percentage,
          expenseDate: exp.expenseDate,
          status: myShare.repaymentStatus,
        });
      }
    });

    // Get settlements (payments partner has made)
    const settlements = await Settlement.find({ partnerId: userId, status: "COMPLETED" });
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);

    // Teacher credit data (if partner is also a teacher)
    let teacherCredits = null;
    if (user?.teacherId) {
      const teacher = await Teacher.findById(user.teacherId).select("name subject balance totalPaid compensation");
      if (teacher) {
        const balance = teacher.balance || {};
        teacherCredits = {
          teacherId: teacher._id,
          subject: teacher.subject,
          floating: balance.floating || 0,
          verified: balance.verified || 0,
          pending: balance.pending || 0,
          totalCredits: (balance.floating || 0) + (balance.verified || 0) + (balance.pending || 0),
          totalPaid: teacher.totalPaid || 0,
          compensationType: teacher.compensation?.type || "percentage",
        };

        // Get recent payout history
        const payouts = await TeacherPayment.find({ teacherId: teacher._id })
          .sort({ paymentDate: -1 })
          .limit(20)
          .lean();
        teacherCredits.payoutHistory = payouts;
      }
    }

    res.json({
      success: true,
      data: {
        partnerName: user?.fullName || "Partner",
        expenseDebt: user?.expenseDebt || 0,
        debtToOwner: user?.debtToOwner || 0,
        totalSettled,
        floatingCash: user?.walletBalance?.floating || 0,
        verifiedCash: user?.walletBalance?.verified || 0,
        debtDetails,
        splitPercentage,
        teacherCredits,
      },
    });
  } catch (error) {
    console.error("Partner dashboard error:", error);
    res.status(500).json({ success: false, message: "Error fetching partner dashboard", error: error.message });
  }
});

// @route   GET /api/finance/partner/ledger
// @desc    Get partner's complete financial ledger (their transactions + expense shares)
// @access  Protected (PARTNER, OWNER)
router.get("/partner/ledger", protect, restrictTo("PARTNER", "OWNER"), async (req, res) => {
  try {
    const userId = req.user._id;

    // Get transactions collected by or related to this partner
    const transactions = await Transaction.find({
      $or: [
        { collectedBy: userId },
        { recipientPartner: userId },
      ],
    }).sort({ date: -1 }).limit(200);

    // Get expense shares for this partner
    const expenses = await Expense.find({
      "shares.partner": userId,
    }).sort({ expenseDate: -1 }).limit(200);

    // Build unified ledger
    const ledger = [];

    transactions.forEach(t => {
      ledger.push({
        _id: t._id,
        date: t.date || t.createdAt,
        type: t.type,
        category: t.category,
        description: t.description,
        amount: t.amount,
        status: t.status,
        source: "transaction",
      });
    });

    expenses.forEach(exp => {
      const myShare = exp.shares.find(s => s.partner?.toString() === userId.toString());
      if (myShare) {
        ledger.push({
          _id: exp._id,
          date: exp.expenseDate,
          type: "EXPENSE_SHARE",
          category: exp.category,
          description: `${exp.title} (${myShare.percentage}% share)`,
          amount: myShare.amount,
          status: myShare.status,
          repaymentStatus: myShare.repaymentStatus,
          source: "expense_share",
        });
      }
    });

    // Get settlements
    const settlements = await Settlement.find({ partnerId: userId }).sort({ date: -1 });
    settlements.forEach(s => {
      ledger.push({
        _id: s._id,
        date: s.date,
        type: "SETTLEMENT",
        category: "Expense Settlement",
        description: s.notes || "Debt repayment to owner",
        amount: s.amount,
        status: s.status,
        source: "settlement",
      });
    });

    // Sort by date descending
    ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ success: true, data: ledger });
  } catch (error) {
    console.error("Partner ledger error:", error);
    res.status(500).json({ success: false, message: "Error fetching partner ledger", error: error.message });
  }
});

// @route   POST /api/finance/partner/request-payment
// @desc    Partner requests payment (creates settlement + notifies owner)
// @access  Protected (PARTNER)
router.post("/partner/request-payment", protect, restrictTo("PARTNER"), async (req, res) => {
  try {
    const { amount, notes } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid payment amount" });
    }

    const currentDebt = user?.expenseDebt || 0;
    if (amount > currentDebt) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (PKR ${amount}) exceeds your outstanding debt (PKR ${currentDebt})`,
      });
    }

    // Create settlement record
    const settlement = await Settlement.create({
      partnerId: userId,
      partnerName: user.fullName,
      amount: parseFloat(amount),
      method: "CASH",
      recordedBy: userId,
      notes: notes || `Payment request by ${user.fullName}`,
      status: "PENDING",
    });

    // Create a DEBT transaction to track this
    await Transaction.create({
      type: "DEBT",
      category: "ExpenseShare",
      stream: "PARTNER_EXPENSE_DEBT",
      amount: parseFloat(amount),
      description: `Expense debt payment by ${user.fullName}`,
      date: new Date(),
      collectedBy: userId,
      status: "FLOATING",
    });

    // Reduce the partner's expense debt
    await User.findByIdAndUpdate(userId, {
      $inc: { expenseDebt: -parseFloat(amount), debtToOwner: -parseFloat(amount) },
    });

    // Notify all OWNER users
    const owners = await User.find({ role: "OWNER", isActive: true });
    for (const owner of owners) {
      await Notification.create({
        recipient: owner._id,
        recipientRole: "OWNER",
        message: `${user.fullName} has submitted a debt payment of PKR ${parseFloat(amount).toLocaleString()}. Settlement ID: ${settlement._id}`,
        type: "FINANCE",
        relatedId: settlement._id.toString(),
      });
    }

    res.json({
      success: true,
      message: `Payment of PKR ${parseFloat(amount).toLocaleString()} recorded successfully. Owner has been notified.`,
      data: settlement,
    });
  } catch (error) {
    console.error("Partner payment request error:", error);
    res.status(500).json({ success: false, message: "Error processing payment request", error: error.message });
  }
});

// @route   GET /api/finance/partner/all-debts
// @desc    Get all partners' outstanding debts (Owner view)
// @access  Protected (OWNER)
router.get("/partner/all-debts", protect, restrictTo("OWNER"), async (req, res) => {
  try {
    const config = await Configuration.findOne();

    // Build partners list from dynamic expenseShares or legacy partnerIds
    const partnerEntries = [];
    if (config?.expenseShares && config.expenseShares.length > 0) {
      for (const share of config.expenseShares) {
        if (!share.userId) continue;
        partnerEntries.push({
          userId: share.userId,
          fullName: share.fullName,
          splitPercentage: share.percentage || 0,
        });
      }
    } else {
      // Legacy fallback
      const partnerIds = config?.partnerIds || {};
      const expenseSplit = config?.expenseSplit || {};
      for (const [key, userId] of Object.entries(partnerIds)) {
        if (!userId) continue;
        const user = await User.findById(userId).select("fullName");
        partnerEntries.push({
          userId,
          fullName: user?.fullName || key,
          splitPercentage: expenseSplit[key] || 0,
        });
      }
    }

    const partnerDebts = [];
    for (const entry of partnerEntries) {
      const user = await User.findById(entry.userId).select("fullName role expenseDebt debtToOwner teacherId");
      if (!user) continue;

      // Get unpaid expense shares
      const unpaidExpenses = await Expense.find({
        "shares.partner": entry.userId,
        "shares.status": "UNPAID",
      }).sort({ expenseDate: -1 });

      let totalDebt = 0;
      const debtDetails = [];
      unpaidExpenses.forEach(exp => {
        const myShare = exp.shares.find(s => s.partner?.toString() === entry.userId.toString() && s.status === "UNPAID");
        if (myShare) {
          totalDebt += myShare.amount;
          debtDetails.push({
            expenseId: exp._id,
            title: exp.title,
            category: exp.category,
            totalAmount: exp.amount,
            myShare: myShare.amount,
            myPercentage: myShare.percentage,
            expenseDate: exp.expenseDate,
            status: myShare.repaymentStatus,
          });
        }
      });

      // Get settlement history
      const settlements = await Settlement.find({ partnerId: entry.userId, status: "COMPLETED" });
      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);

      const pendingSettlements = await Settlement.find({ partnerId: entry.userId, status: "PENDING" });
      const totalPending = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);

      partnerDebts.push({
        userId: entry.userId,
        fullName: user.fullName,
        role: user.role,
        splitPercentage: entry.splitPercentage,
        expenseDebt: user.expenseDebt || 0,
        debtToOwner: user.debtToOwner || 0,
        totalSettled,
        totalPending,
        debtDetails,
      });
    }

    res.json({ success: true, data: partnerDebts });
  } catch (error) {
    console.error("All partner debts error:", error);
    res.status(500).json({ success: false, message: "Error fetching partner debts", error: error.message });
  }
});

// @route   POST /api/finance/partner/record-settlement
// @desc    Owner records a settlement (partner paid their share)
// @access  Protected (OWNER)
router.post("/partner/record-settlement", protect, restrictTo("OWNER"), async (req, res) => {
  try {
    const { partnerId, amount, notes, method } = req.body;

    if (!partnerId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Partner ID and valid amount are required" });
    }

    const partner = await User.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const currentDebt = partner.expenseDebt || 0;
    if (amount > currentDebt) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (PKR ${amount}) exceeds partner's outstanding debt (PKR ${currentDebt})`,
      });
    }

    // Create settlement record (COMPLETED since owner is recording it directly)
    const settlement = await Settlement.create({
      partnerId: partnerId,
      partnerName: partner.fullName,
      amount: parseFloat(amount),
      method: method || "CASH",
      recordedBy: req.user._id,
      notes: notes || `Settlement recorded by ${req.user.fullName}`,
      status: "COMPLETED",
    });

    // Reduce the partner's expense debt
    await User.findByIdAndUpdate(partnerId, {
      $inc: { expenseDebt: -parseFloat(amount), debtToOwner: -parseFloat(amount) },
    });

    // Notify the partner
    await Notification.create({
      recipient: partnerId,
      recipientRole: partner.role,
      message: `Settlement of PKR ${parseFloat(amount).toLocaleString()} has been recorded by ${req.user.fullName}.`,
      type: "FINANCE",
      relatedId: settlement._id.toString(),
    });

    res.json({
      success: true,
      message: `Settlement of PKR ${parseFloat(amount).toLocaleString()} recorded for ${partner.fullName}`,
      data: settlement,
    });
  } catch (error) {
    console.error("Record settlement error:", error);
    res.status(500).json({ success: false, message: "Error recording settlement", error: error.message });
  }
});

// @route   POST /api/finance/partner/recalculate-splits
// @desc    Recalculate expense splits for a given month (fixes expenses with null partner IDs)
// @access  Protected (OWNER)
router.post("/partner/recalculate-splits", protect, restrictTo("OWNER"), async (req, res) => {
  try {
    const { month, year } = req.body;
    const targetMonth = month || new Date().getMonth() + 1; // 1-12
    const targetYear = year || new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const config = await Configuration.findOne();
    if (!config?.expenseShares || config.expenseShares.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No expense shares configured. Go to Configuration and set up partner expense splits first.",
      });
    }

    // Find all expenses in the month
    const expenses = await Expense.find({
      expenseDate: { $gte: startDate, $lte: endDate },
    });

    let updatedCount = 0;
    let skippedCount = 0;
    let totalDebtAssigned = 0;

    for (const expense of expenses) {
      // Check if this expense needs recalculation (shares have null partner IDs)
      const needsRecalc = expense.shares.some(s => !s.partner) || expense.shares.length === 0;

      if (!needsRecalc) {
        skippedCount++;
        continue;
      }

      // First, reverse any previous partial debts from this expense (cleanup)
      for (const oldShare of expense.shares) {
        if (oldShare.partner && oldShare.status === "UNPAID") {
          await User.findByIdAndUpdate(oldShare.partner, {
            $inc: { expenseDebt: -oldShare.amount, debtToOwner: -oldShare.amount },
          });
        }
      }

      // Recalculate shares using current config
      const newShares = [];
      for (const share of config.expenseShares) {
        const pct = share.percentage || 0;
        if (pct <= 0 || !share.userId) continue;
        const shareAmount = Math.round((expense.amount * pct) / 100);
        newShares.push({
          partner: share.userId,
          partnerName: share.fullName || "Partner",
          partnerKey: null,
          percentage: pct,
          amount: shareAmount,
          status: "UNPAID",
          repaymentStatus: "PENDING",
        });

        // Update user debt
        await User.findByIdAndUpdate(share.userId, {
          $inc: { expenseDebt: shareAmount, debtToOwner: shareAmount },
        });
        totalDebtAssigned += shareAmount;
      }

      expense.shares = newShares;
      expense.hasPartnerDebt = newShares.length > 0;
      await expense.save();
      updatedCount++;
    }

    const monthName = new Date(targetYear, targetMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

    res.json({
      success: true,
      message: `${monthName}: ${updatedCount} expenses recalculated, ${skippedCount} already had partners. PKR ${totalDebtAssigned.toLocaleString()} total debt assigned.`,
      data: { updatedCount, skippedCount, totalDebtAssigned, month: monthName },
    });
  } catch (error) {
    console.error("Recalculate splits error:", error);
    res.status(500).json({ success: false, message: "Error recalculating splits", error: error.message });
  }
});

// @route   GET /api/finance/partner/settlements
// @desc    Get all settlements for the current partner (or all for OWNER)
// @access  Protected (PARTNER, OWNER)
router.get("/partner/settlements", protect, restrictTo("PARTNER", "OWNER"), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "PARTNER") {
      query.partnerId = req.user._id;
    }
    // OWNER sees all settlements

    const settlements = await Settlement.find(query)
      .populate("partnerId", "fullName username")
      .populate("recordedBy", "fullName")
      .sort({ date: -1 });

    // Also get summary stats
    const summary = await Settlement.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({ success: true, data: settlements, summary });
  } catch (error) {
    console.error("Settlements fetch error:", error);
    res.status(500).json({ success: false, message: "Error fetching settlements", error: error.message });
  }
});

// @route   PATCH /api/finance/partner/settlements/:id/confirm
// @desc    Owner confirms a pending settlement
// @access  Protected (OWNER)
router.patch("/partner/settlements/:id/confirm", protect, restrictTo("OWNER"), async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) {
      return res.status(404).json({ success: false, message: "Settlement not found" });
    }
    if (settlement.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Settlement is not in PENDING status" });
    }

    settlement.status = "COMPLETED";
    settlement.recordedBy = req.user._id;
    await settlement.save();

    // Mark the DEBT transaction as VERIFIED
    await Transaction.updateOne(
      { type: "DEBT", category: "ExpenseShare", collectedBy: settlement.partnerId, status: "FLOATING" },
      { $set: { status: "VERIFIED" } }
    );

    // Notify the partner
    await Notification.create({
      recipient: settlement.partnerId,
      recipientRole: "PARTNER",
      message: `Your payment of PKR ${settlement.amount.toLocaleString()} has been confirmed by ${req.user.fullName}.`,
      type: "FINANCE",
      relatedId: settlement._id.toString(),
    });

    res.json({ success: true, message: "Settlement confirmed", data: settlement });
  } catch (error) {
    console.error("Settlement confirm error:", error);
    res.status(500).json({ success: false, message: "Error confirming settlement", error: error.message });
  }
});

// ------------------------------------------------------------------
// FINANCE RECORD CRUD (FinanceRecord model - used by frontend)
// ------------------------------------------------------------------

// @route   GET /api/finance
// @desc    Get all finance records
// @access  Protected
router.get("/", protect, async (req, res) => {
  try {
    const { status, month, year } = req.query;
    let query = {};
    if (status) query.status = status;
    if (month) query.month = month;
    if (year) query.year = parseInt(year);

    const records = await FinanceRecord.find(query)
      .populate("studentId", "name class")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching finance records",
      error: error.message,
    });
  }
});

// @route   GET /api/finance/stats/overview
// @desc    Get real-time finance overview (MONTHLY - synced with Dashboard)
// @access  Protected (OWNER)
router.get("/stats/overview", protect, async (req, res) => {
  try {
    const Student = require("../models/Student");
    const Teacher = require("../models/Teacher");
    const Expense = require("../models/Expense");
    const Transaction = require("../models/Transaction");

    // THIS MONTH ONLY - Sync with Dashboard
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Monthly Income from Transactions (consistent with Dashboard)
    const monthlyIncomeResult = await Transaction.aggregate([
      { $match: { type: "INCOME", date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalIncome = monthlyIncomeResult[0]?.total || 0;

    // Monthly Expenses from Transactions (consistent with Dashboard)
    const monthlyExpensesResult = await Transaction.aggregate([
      { $match: { type: "EXPENSE", date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpenses = monthlyExpensesResult[0]?.total || 0;

    // Total Expected & Pending (all-time student data)
    const expectedResult = await Student.aggregate([
      { $group: { _id: null, totalExpected: { $sum: "$totalFee" } } },
    ]);
    const totalExpected = expectedResult[0]?.totalExpected || 0;

    const collectedResult = await Student.aggregate([
      { $group: { _id: null, totalCollected: { $sum: "$paidAmount" } } },
    ]);
    const totalCollected = collectedResult[0]?.totalCollected || 0;
    const totalPending = totalExpected - totalCollected;

    const pendingStudentsCount = await Student.countDocuments({
      feeStatus: { $in: ["pending", "partial", "Pending"] },
    });

    // Teacher liabilities
    const teachers = await Teacher.find({ status: "active" });
    let totalTeacherLiabilities = 0;
    const teacherPayroll = [];

    for (const teacher of teachers) {
      const balance = teacher.balance || {};
      const owed =
        (balance.floating || 0) +
        (balance.verified || 0) +
        (balance.pending || 0);
      totalTeacherLiabilities += owed;

      teacherPayroll.push({
        teacherId: teacher._id,
        name: teacher.name,
        subject: teacher.subject,
        compensationType: teacher.compensation?.type || "percentage",
        earnedAmount: owed,
        totalPaid: teacher.totalPaid || 0,
      });
    }

    // Net Profit = Monthly Income - Monthly Expenses (matches Dashboard exactly)
    const netProfit = totalIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        totalIncome,       // Monthly INCOME transactions
        totalExpected,     // All-time total fees
        totalPending,      // All-time unpaid fees
        pendingStudentsCount,
        totalTeacherLiabilities,  // Current owed to teachers
        teacherPayroll,
        teacherCount: teachers.length,
        academyShare: netProfit,
        totalExpenses,     // Monthly EXPENSE transactions
        netProfit,         // Monthly Net (INCOME - EXPENSE)
        collectionRate:
          totalExpected > 0
            ? Math.round((totalCollected / totalExpected) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Finance stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching finance statistics",
      error: error.message,
    });
  }
});

// @route   GET /api/finance/:id
// @desc    Get single finance record
// @access  Protected
router.get("/:id", protect, async (req, res) => {
  try {
    const record = await FinanceRecord.findById(req.params.id).populate(
      "studentId",
      "name class",
    );
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Finance record not found" });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching finance record",
      error: error.message,
    });
  }
});

// @route   POST /api/finance
// @desc    Create a new finance record
// @access  Protected
router.post("/", protect, async (req, res) => {
  try {
    const newRecord = new FinanceRecord(req.body);
    const savedRecord = await newRecord.save();
    res.status(201).json({
      success: true,
      message: "Finance record created successfully",
      data: savedRecord,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error creating finance record",
      error: error.message,
    });
  }
});

// @route   PUT /api/finance/:id
// @desc    Update a finance record
// @access  Protected
router.put("/:id", protect, async (req, res) => {
  try {
    const updatedRecord = await FinanceRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!updatedRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Finance record not found" });
    }
    res.json({
      success: true,
      message: "Finance record updated successfully",
      data: updatedRecord,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating finance record",
      error: error.message,
    });
  }
});

// @route   DELETE /api/finance/:id
// @desc    Delete a finance record
// @access  Protected (OWNER only)
router.delete("/:id", protect, async (req, res) => {
  try {
    const deletedRecord = await FinanceRecord.findByIdAndDelete(req.params.id);
    if (!deletedRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Finance record not found" });
    }
    res.json({
      success: true,
      message: "Finance record deleted successfully",
      data: deletedRecord,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting finance record",
      error: error.message,
    });
  }
});

module.exports = router;
