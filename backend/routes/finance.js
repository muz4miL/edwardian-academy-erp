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
  getClosePreview,
  getClosingHistory,
  processWithdrawalReversal,
  getTeacherPayrollReport,
  getAcademyShareSplit,
  updateAcademyShareSplit,
  getAcademyPoolReport,
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

// @route   GET  /api/finance/close-day/preview — report without closing
// @route   POST /api/finance/close-day          — actually close
// @access  Protected (OWNER, STAFF, PARTNER)
router.get("/close-day/preview", protect, restrictTo("OWNER", "STAFF", "PARTNER"), (req, res, next) => {
  req.query.preview = "true";
  return closeDay(req, res, next);
});
router.post("/close-day", protect, restrictTo("OWNER", "STAFF", "PARTNER"), closeDay);

// @route   GET /api/finance/close-preview/:userId
// @desc    Real-time close preview for Owner/Partner dashboard
// @access  Protected (OWNER, PARTNER)
router.get("/close-preview/:userId", protect, restrictTo("OWNER", "PARTNER"), getClosePreview);
router.get("/close-preview", protect, restrictTo("OWNER", "PARTNER"), getClosePreview);

// @route   GET /api/finance/closing-history/:userId
// @desc    Past closing records with breakdown
// @access  Protected (OWNER, PARTNER)
router.get("/closing-history/:userId", protect, restrictTo("OWNER", "PARTNER"), getClosingHistory);
router.get("/closing-history", protect, restrictTo("OWNER", "PARTNER"), getClosingHistory);

// @route   POST /api/finance/withdrawal-reversal
// @desc    Process withdrawal refund with proportional reversal
// @access  Protected (OWNER)
router.post("/withdrawal-reversal", protect, restrictTo("OWNER"), processWithdrawalReversal);

// @route   GET /api/finance/teacher-payroll-report
// @desc    Teacher payroll report (what each teacher is owed)
// @access  Protected (OWNER)
router.get("/teacher-payroll-report", protect, restrictTo("OWNER"), getTeacherPayrollReport);

// @route   GET/PUT /api/finance/academy-share-split
// @desc    Get/Update academy share split configuration
// @access  Protected (OWNER)
router.get("/academy-share-split", protect, restrictTo("OWNER"), getAcademyShareSplit);
router.put("/academy-share-split", protect, restrictTo("OWNER"), updateAcademyShareSplit);

// @route   GET /api/finance/academy-pool-report
// @desc    Detailed academy pool revenue report with per-class, per-student, per-teacher breakdowns
// @access  Protected (OWNER, PARTNER)
router.get("/academy-pool-report", protect, restrictTo("OWNER", "PARTNER"), getAcademyPoolReport);

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
        expenseDebt: totalDebt,
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

    // Compute actual debt from UNPAID expense shares (source of truth)
    const unpaidExpenses = await Expense.find({
      "shares.partner": userId,
      "shares.status": "UNPAID",
    });
    let computedDebt = 0;
    unpaidExpenses.forEach(exp => {
      const myShare = exp.shares.find(s => s.partner?.toString() === userId.toString() && s.status === "UNPAID");
      if (myShare) computedDebt += myShare.amount;
    });

    if (amount > computedDebt) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (PKR ${amount}) exceeds your outstanding debt (PKR ${computedDebt})`,
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
        expenseDebt: totalDebt,
        debtToOwner: totalDebt,
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

    // Compute actual debt from UNPAID expense shares (source of truth)
    const unpaidExpenses = await Expense.find({
      "shares.partner": partnerId,
      "shares.status": "UNPAID",
    });
    let computedDebt = 0;
    unpaidExpenses.forEach(exp => {
      const myShare = exp.shares.find(s => s.partner?.toString() === partnerId.toString() && s.status === "UNPAID");
      if (myShare) computedDebt += myShare.amount;
    });

    if (amount > computedDebt) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (PKR ${amount}) exceeds partner's outstanding debt (PKR ${computedDebt})`,
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

    // Mark the partner's oldest UNPAID expense shares as PAID (up to the settled amount)
    let remaining = parseFloat(amount);
    if (remaining > 0) {
      const unpaidExpenses = await Expense.find({
        "shares.partner": partnerId,
        "shares.status": "UNPAID",
      }).sort({ expenseDate: 1 }); // oldest first

      for (const expense of unpaidExpenses) {
        if (remaining <= 0) break;
        const shareIdx = expense.shares.findIndex(
          s => s.partner?.toString() === partnerId.toString() && s.status === "UNPAID"
        );
        if (shareIdx === -1) continue;
        const shareAmt = expense.shares[shareIdx].amount || 0;
        if (shareAmt <= remaining) {
          expense.shares[shareIdx].status = "PAID";
          expense.shares[shareIdx].repaymentStatus = "SETTLED";
          remaining -= shareAmt;
          await expense.save();
        }
        // If settlement is partial and doesn't cover this share fully, leave it UNPAID
      }
    }

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

    // Enforce once-per-month: check if already split for this month
    if (config.lastExpenseSplitMonth === targetMonth && config.lastExpenseSplitYear === targetYear) {
      const monthLabel = new Date(targetYear, targetMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
      return res.status(400).json({
        success: false,
        message: `Expenses for ${monthLabel} have already been split. You can only split once per month.`,
        alreadySplit: true,
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

    // Record that this month has been split (use $set to bypass pre-save validation hook)
    await Configuration.findOneAndUpdate({}, { $set: { lastExpenseSplitMonth: targetMonth, lastExpenseSplitYear: targetYear } });

    const monthName = new Date(targetYear, targetMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

    res.json({
      success: true,
      message: `${monthName}: ${updatedCount} expenses recalculated, ${skippedCount} already had partners. PKR ${totalDebtAssigned.toLocaleString()} total debt assigned.`,
      data: { updatedCount, skippedCount, totalDebtAssigned, month: monthName, lastExpenseSplitMonth: targetMonth, lastExpenseSplitYear: targetYear },
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
// PARTNER/OWNER PAYOUT SUMMARY — Real-time earnings breakdown
// ------------------------------------------------------------------

// @route   GET /api/finance/partner/payout-summary
// @desc    Get payout summary for all partners + owner (or self if PARTNER)
// @access  Protected (OWNER, PARTNER)
router.get("/partner/payout-summary", protect, restrictTo("OWNER", "PARTNER"), async (req, res) => {
  try {
    const config = await Configuration.findOne();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const Teacher = require("../models/Teacher");
    const Student = require("../models/Student");
    const Class = require("../models/Class");
    const FeeRecord = require("../models/FeeRecord");

    // Build partner/owner list
    const partnersAndOwner = [];

    // Get all PARTNER and OWNER users
    const poUsers = await User.find({ role: { $in: ["OWNER", "PARTNER"] }, isActive: true })
      .select("fullName role teacherId");

    for (const poUser of poUsers) {
      // If PARTNER user requesting, only return their own data
      if (req.user.role === "PARTNER" && poUser._id.toString() !== req.user._id.toString()) {
        continue;
      }

      const teacher = poUser.teacherId
        ? await Teacher.findById(poUser.teacherId).select("name subject balance totalPaid compensation")
        : null;

      // Get classes this person teaches (via subjectTeachers or assignedTeacher)
      let myClasses = [];
      if (teacher) {
        myClasses = await Class.find({
          status: "active",
          $or: [
            { assignedTeacher: teacher._id },
            { "subjectTeachers.teacherId": teacher._id },
          ],
        }).select("classTitle gradeLevel subjects subjectTeachers enrolledCount session sessionType").lean();
      }

      // Get students in their classes
      const classIds = myClasses.map(c => c._id);
      const classNames = myClasses.map(c => c.classTitle);
      const myStudents = await Student.find({
        studentStatus: "Active",
        $or: [
          { classRef: { $in: classIds } },
          { class: { $in: classNames } },
        ],
      }).select("studentName studentId class totalFee paidAmount feeStatus subjects classRef").lean();

      // Get this month's fee records for their students
      const studentIds = myStudents.map(s => s._id);
      const monthlyFeeRecords = await FeeRecord.find({
        student: { $in: studentIds },
        createdAt: { $gte: startOfMonth },
        status: "PAID",
      }).select("student studentName amount month createdAt splitBreakdown teacher revenueSource").lean();

      // Get INCOME transactions collected by or for this person this month
      const streamFilters = [];
      if (poUser.role === "OWNER") {
        streamFilters.push("OWNER_CHEMISTRY", "OWNER_DIVIDEND");
      } else {
        streamFilters.push("PARTNER_BIO", "PARTNER_CHEMISTRY", "PARTNER_ETEA", "PARTNER_DIVIDEND");
      }

      // Direct teaching income (transactions where this teacher was credited)
      let teachingIncome = 0;
      let dividendIncome = 0;
      let teachingTransactions = [];
      let dividendTransactions = [];

      if (teacher) {
        // Teaching income: Transactions where this teacher was credited (per-subject attribution)
        const teacherCreditTxns = await Transaction.find({
          type: "INCOME",
          category: "Tuition",
          "splitDetails.teacherId": teacher._id,
          date: { $gte: startOfMonth },
        }).select("amount description date splitDetails").lean();

        for (const txn of teacherCreditTxns) {
          teachingIncome += txn.amount;
          teachingTransactions.push({
            studentId: txn.splitDetails?.studentId,
            studentName: txn.splitDetails?.studentName || txn.description,
            month: txn.splitDetails?.month || "",
            feeAmount: txn.splitDetails?.subjectFee || txn.amount,
            teacherShare: txn.amount,
            subject: txn.splitDetails?.subject || "—",
            splitType: txn.splitDetails?.shareType || "UNKNOWN",
            date: txn.date,
          });
        }

        // Also include legacy FeeRecord-based income (from before this update)
        const legacyFeeRecords = await FeeRecord.find({
          teacher: teacher._id,
          createdAt: { $gte: startOfMonth },
          status: "PAID",
        }).select("student studentName amount month splitBreakdown revenueSource createdAt").lean();

        for (const fr of legacyFeeRecords) {
          const teacherShare = fr.splitBreakdown?.teacherShare || 0;
          // Avoid double-counting if already in transactions
          const alreadyCounted = teachingTransactions.some(
            (t) => t.studentId?.toString() === fr.student?.toString() && t.month === fr.month
          );
          if (!alreadyCounted) {
            teachingIncome += teacherShare;
            teachingTransactions.push({
              studentId: fr.student,
              studentName: fr.studentName,
              month: fr.month,
              feeAmount: fr.amount,
              teacherShare,
              subject: "General",
              splitType: fr.revenueSource || "LEGACY",
              date: fr.createdAt,
            });
          }
        }
      }

      // Dividend income from pool distributions
      const dividends = await Transaction.find({
        type: "DIVIDEND",
        date: { $gte: startOfMonth },
        "splitDetails.partnerName": { $regex: new RegExp(poUser.fullName?.split(" ").pop() || "NOMATCH", "i") },
      }).select("amount description date splitDetails").lean();

      for (const d of dividends) {
        dividendIncome += d.amount;
        dividendTransactions.push({
          amount: d.amount,
          description: d.description,
          poolType: d.splitDetails?.poolType || "TUITION",
          percentage: d.splitDetails?.percentage || 0,
          date: d.date,
        });
      }

      // All-time teaching income
      let allTimeTeachingIncome = 0;
      if (teacher) {
        const allTimeTxns = await Transaction.aggregate([
          { $match: { type: "INCOME", category: "Tuition", "splitDetails.teacherId": teacher._id } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const allTimeLegacy = await FeeRecord.aggregate([
          { $match: { teacher: teacher._id, status: "PAID" } },
          { $group: { _id: null, total: { $sum: "$splitBreakdown.teacherShare" } } },
        ]);
        allTimeTeachingIncome = (allTimeTxns[0]?.total || 0) + (allTimeLegacy[0]?.total || 0);
      }

      // All-time dividends
      const allTimeDividends = await Transaction.aggregate([
        {
          $match: {
            type: "DIVIDEND",
            "splitDetails.partnerName": { $regex: new RegExp(poUser.fullName?.split(" ").pop() || "NOMATCH", "i") },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const allTimeDividendIncome = allTimeDividends[0]?.total || 0;

      // Teacher balance details
      const balance = teacher?.balance || {};

      // New students added to their classes this month
      const newStudents = await Student.find({
        studentStatus: "Active",
        $or: [
          { classRef: { $in: classIds } },
          { class: { $in: classNames } },
        ],
        createdAt: { $gte: startOfMonth },
      }).select("studentName studentId class createdAt totalFee").lean();

      partnersAndOwner.push({
        userId: poUser._id,
        fullName: poUser.fullName,
        role: poUser.role,
        teacherId: teacher?._id || null,
        subject: teacher?.subject || null,

        // Classes they teach
        classes: myClasses.map(c => ({
          classId: c._id,
          classTitle: c.classTitle,
          gradeLevel: c.gradeLevel,
          enrolledCount: c.enrolledCount || 0,
          sessionType: c.sessionType,
          subjects: c.subjects,
          mySubjects: teacher
            ? (c.subjectTeachers || [])
                .filter(st => st.teacherId?.toString() === teacher._id.toString())
                .map(st => st.subject)
            : [],
        })),

        // Students in their classes
        totalStudents: myStudents.length,
        students: myStudents.map(s => ({
          studentId: s.studentId,
          studentName: s.studentName,
          class: s.class,
          totalFee: s.totalFee || 0,
          paidAmount: s.paidAmount || 0,
          feeStatus: s.feeStatus,
          subjects: s.subjects,
        })),

        // New students this month
        newStudents: newStudents.map(s => ({
          studentId: s.studentId,
          studentName: s.studentName,
          class: s.class,
          totalFee: s.totalFee || 0,
          addedDate: s.createdAt,
        })),

        // Monthly earnings
        monthlyEarnings: {
          teachingIncome,
          dividendIncome,
          totalMonthly: teachingIncome + dividendIncome,
        },

        // All-time earnings
        allTimeEarnings: {
          teachingIncome: allTimeTeachingIncome,
          dividendIncome: allTimeDividendIncome,
          totalAllTime: allTimeTeachingIncome + allTimeDividendIncome,
          totalPaid: teacher?.totalPaid || 0,
        },

        // Balance (from teacher record)
        balance: {
          floating: balance.floating || 0,
          verified: balance.verified || 0,
          pending: balance.pending || 0,
          total: (balance.floating || 0) + (balance.verified || 0) + (balance.pending || 0),
        },

        // Money trail - per student breakdown
        moneyTrail: teachingTransactions,

        // Pool dividends breakdown
        dividends: dividendTransactions,

        // Fee records this month
        monthlyFeeRecords: monthlyFeeRecords.length,
      });
    }

    res.json({
      success: true,
      data: {
        month: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
        partnersAndOwner,
      },
    });
  } catch (error) {
    console.error("Payout summary error:", error);
    res.status(500).json({ success: false, message: "Error fetching payout summary", error: error.message });
  }
});

// @route   POST /api/finance/partner/credit-balance
// @desc    Owner manually credits/adjusts a partner's teacher balance
// @access  Protected (OWNER)
router.post("/partner/credit-balance", protect, restrictTo("OWNER"), async (req, res) => {
  try {
    const { userId, amount, type, note } = req.body;
    const Teacher = require("../models/Teacher");

    if (!userId || !amount || amount === 0) {
      return res.status(400).json({ success: false, message: "User ID and amount are required" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const amountNum = Number(amount);

    // If user is linked to a teacher, update teacher balance
    if (targetUser.teacherId) {
      const teacher = await Teacher.findById(targetUser.teacherId);
      if (teacher) {
        if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
        teacher.balance.verified = (teacher.balance.verified || 0) + amountNum;
        await teacher.save();

        // Record transaction
        await Transaction.create({
          type: amountNum > 0 ? "CREDIT" : "EXPENSE",
          category: "Teacher Credit",
          amount: Math.abs(amountNum),
          description: note || `Manual ${amountNum > 0 ? "credit" : "deduction"} for ${targetUser.fullName} by ${req.user.fullName}`,
          collectedBy: req.user._id,
          status: "VERIFIED",
          splitDetails: {
            teacherId: teacher._id,
            teacherName: teacher.name,
          },
          date: new Date(),
        });

        // Record in payout history
        targetUser.payoutHistory = targetUser.payoutHistory || [];
        targetUser.payoutHistory.push({
          date: new Date(),
          amount: amountNum,
          type: type || "Adjustment",
          note: note || `Manual balance ${amountNum > 0 ? "credit" : "deduction"}`,
          processedBy: req.user._id,
        });
        await targetUser.save();

        // Notify partner
        await Notification.create({
          recipient: targetUser._id,
          recipientRole: targetUser.role,
          message: `Your balance has been ${amountNum > 0 ? "credited" : "adjusted"} by PKR ${Math.abs(amountNum).toLocaleString()} by ${req.user.fullName}. ${note ? `Note: ${note}` : ""}`,
          type: "FINANCE",
        });

        return res.json({
          success: true,
          message: `Balance ${amountNum > 0 ? "credited" : "adjusted"}: PKR ${Math.abs(amountNum).toLocaleString()} for ${targetUser.fullName}`,
          data: {
            userId: targetUser._id,
            newBalance: {
              floating: teacher.balance.floating || 0,
              verified: teacher.balance.verified || 0,
              pending: teacher.balance.pending || 0,
            },
          },
        });
      }
    }

    // Fallback: update user's walletBalance directly
    if (!targetUser.walletBalance) targetUser.walletBalance = { floating: 0, verified: 0 };
    targetUser.walletBalance.verified = (targetUser.walletBalance.verified || 0) + amountNum;
    targetUser.payoutHistory = targetUser.payoutHistory || [];
    targetUser.payoutHistory.push({
      date: new Date(),
      amount: amountNum,
      type: type || "Adjustment",
      note: note || `Manual balance adjustment`,
      processedBy: req.user._id,
    });
    await targetUser.save();

    res.json({
      success: true,
      message: `Wallet ${amountNum > 0 ? "credited" : "adjusted"}: PKR ${Math.abs(amountNum).toLocaleString()} for ${targetUser.fullName}`,
      data: { userId: targetUser._id, newWalletBalance: targetUser.walletBalance },
    });
  } catch (error) {
    console.error("Partner credit balance error:", error);
    res.status(500).json({ success: false, message: "Error updating balance", error: error.message });
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
    const FeeRecord = require("../models/FeeRecord");

    // THIS MONTH ONLY - Sync with Dashboard
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Monthly Income from Transactions — same filters as getDashboardStats
    const monthlyIncomeResult = await Transaction.aggregate([
      { $match: { type: "INCOME", date: { $gte: startOfMonth, $lte: endOfMonth }, status: { $in: ["FLOATING", "VERIFIED"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlyIncomeGross = monthlyIncomeResult[0]?.total || 0;

    // Deduct refunds (same as getDashboardStats)
    const monthlyRefundResult = await Transaction.aggregate([
      { $match: { type: "REFUND", date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlyRefunds = monthlyRefundResult[0]?.total || 0;
    const totalIncome = monthlyIncomeGross - monthlyRefunds;

    // Monthly Expenses — unified: Transaction(EXPENSE) + Expense model, deduplicated
    const txnExpResult = await Transaction.aggregate([
      { $match: { type: "EXPENSE", date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const txnExpTotal = txnExpResult[0]?.total || 0;

    const expModelResult = await Expense.aggregate([
      { $match: { expenseDate: { $gte: startOfMonth, $lte: endOfMonth }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const expModelTotal = expModelResult[0]?.total || 0;

    // Calculate overlap between Expense model and Transaction(EXPENSE)
    const expRecords = await Expense.find({
      expenseDate: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $ne: "cancelled" },
    }).lean();

    let overlapTotal = 0;
    for (const exp of expRecords) {
      const expDate = new Date(exp.expenseDate || exp.createdAt);
      const dayStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const match = await Transaction.findOne({
        type: "EXPENSE", amount: exp.amount, date: { $gte: dayStart, $lt: dayEnd },
      }).lean();
      if (match) overlapTotal += exp.amount;
    }

    const totalExpenses = txnExpTotal + (expModelTotal - overlapTotal);

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

    // Monthly fee records
    const monthlyFeeCollection = await FeeRecord.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

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
        totalIncome,       // Monthly INCOME transactions (net of refunds)
        totalExpected,     // All-time total fees
        totalCollected,    // All-time collected fees
        totalPending,      // All-time unpaid fees
        pendingStudentsCount,
        totalTeacherLiabilities,  // Current owed to teachers
        teacherPayroll,
        teacherCount: teachers.length,
        academyShare: netProfit,
        totalExpenses,     // Monthly unified expenses
        netProfit,         // Monthly Net (INCOME - EXPENSE)
        monthlyFeesCollected: monthlyFeeCollection[0]?.total || 0,
        monthlyFeesCount: monthlyFeeCollection[0]?.count || 0,
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
