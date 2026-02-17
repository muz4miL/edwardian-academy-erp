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
router.post("/close-day", protect, restrictTo("OWNER", "STAFF"), closeDay);

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
// FINANCE RECORD CRUD (FinanceRecord model — used by frontend)
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
