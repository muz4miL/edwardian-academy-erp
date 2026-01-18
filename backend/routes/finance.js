const express = require("express");
const router = express.Router();
const FinanceRecord = require("../models/FinanceRecord");
const {
  getDashboardStats,
  closeDay,
  recordTransaction,
  collectPartnerRevenue,
  createSharedExpense,
  getPartnerExpenseDebt,
  markExpenseSharePaid,
  getReimbursementReport,
  getFinanceHistory,
  getPartnerPortalStats,
} = require("../controllers/financeController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// ------------------------------------------------------------------
// CRITICAL: Place static routes BEFORE "/:id" to avoid route capture.
// These endpoints power the dashboard and must not be treated as IDs.
// ------------------------------------------------------------------

// @route   GET /api/finance/dashboard-stats
// @desc    Get financial stats for dashboard widgets
// @access  Protected
router.get("/dashboard-stats", protect, getDashboardStats);

// @route   GET /api/finance/partner-portal-stats
// @desc    Get Partner Portal personalized stats (cashInHand, expenseLiability, totalEarnings)
// @access  Protected (PARTNER only)
router.get(
  "/partner-portal-stats",
  protect,
  restrictTo("PARTNER"),
  getPartnerPortalStats,
);

// @route   GET /api/finance/history
// @desc    Get finance history (ledger) - OWNER sees all, PARTNER sees own
// @access  Protected (OWNER, PARTNER)
router.get("/history", protect, getFinanceHistory);

// @route   POST /api/finance/close-day
// @desc    Close the day and lock floating cash
// @access  Protected (OWNER, PARTNER)
router.post("/close-day", protect, restrictTo("OWNER", "PARTNER"), closeDay);

// @route   POST /api/finance/record-transaction
// @desc    Record a new income or expense transaction
// @access  Protected (OWNER, PARTNER)
router.post(
  "/record-transaction",
  protect,
  restrictTo("OWNER", "PARTNER"),
  recordTransaction,
);

// @route   POST /api/finance/collect-partner-revenue
// @desc    Partner withdraws accumulated daily revenue (Module 1: Partner Tuition Management)
// @access  Protected (PARTNER only)
router.post(
  "/collect-partner-revenue",
  protect,
  restrictTo("PARTNER"),
  collectPartnerRevenue,
);

// ========================================
// MODULE 3: EXPENSE MANAGEMENT ROUTES
// ========================================

// @route   POST /api/finance/create-shared-expense
// @desc    Create a shared expense with automatic split calculation
// @access  Protected (OWNER only)
router.post(
  "/create-shared-expense",
  protect,
  restrictTo("OWNER"),
  createSharedExpense,
);

// @route   GET /api/finance/partner-expense-debt
// @desc    Get partner's expense debt (what they owe to owner)
// @access  Protected (PARTNER)
router.get(
  "/partner-expense-debt",
  protect,
  restrictTo("PARTNER"),
  getPartnerExpenseDebt,
);

// @route   POST /api/finance/mark-expense-paid
// @desc    Mark partner's expense share as paid (Owner action)
// @access  Protected (OWNER only)
router.post(
  "/mark-expense-paid",
  protect,
  restrictTo("OWNER"),
  markExpenseSharePaid,
);

// @route   GET /api/finance/reimbursement-report
// @desc    Get Owner's reimbursement report (who owes what)
// @access  Protected (OWNER only)
router.get(
  "/reimbursement-report",
  protect,
  restrictTo("OWNER"),
  getReimbursementReport,
);

// @route   GET /api/finance
// @desc    Get all finance records
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { status, month, year } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (month) {
      query.month = month;
    }

    if (year) {
      query.year = parseInt(year);
    }

    const records = await FinanceRecord.find(query)
      .populate("studentId", "name class")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching finance records",
      error: error.message,
    });
  }
});

// @route   GET /api/finance/:id
// @desc    Get single finance record by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const record = await FinanceRecord.findById(req.params.id).populate(
      "studentId",
      "name class",
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Finance record not found",
      });
    }

    res.json({
      success: true,
      data: record,
    });
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
// @access  Public
router.post("/", async (req, res) => {
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
// @access  Public
router.put("/:id", async (req, res) => {
  try {
    const updatedRecord = await FinanceRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: "Finance record not found",
      });
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
// @access  Public
router.delete("/:id", async (req, res) => {
  try {
    const deletedRecord = await FinanceRecord.findByIdAndDelete(req.params.id);

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        message: "Finance record not found",
      });
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

// @route   GET /api/finance/stats/overview
// @desc    Get real-time finance statistics from Student and Teacher data
// @access  Protected (Role-based response filtering)
router.get("/stats/overview", protect, async (req, res) => {
  try {
    const userRole = req.user?.role || "OPERATOR";
    const isOwner = userRole === "OWNER";

    const Student = require("../models/Student");
    const Teacher = require("../models/Teacher");
    const Class = require("../models/Class");

    // TASK 1: Real-Time Metrics from Student Data

    // Total Income: Sum of all paidAmount
    const incomeResult = await Student.aggregate([
      { $group: { _id: null, totalIncome: { $sum: "$paidAmount" } } },
    ]);
    const totalIncome = incomeResult[0]?.totalIncome || 0;

    // Total Expected: Sum of all totalFee
    const expectedResult = await Student.aggregate([
      { $group: { _id: null, totalExpected: { $sum: "$totalFee" } } },
    ]);
    const totalExpected = expectedResult[0]?.totalExpected || 0;

    // Total Pending: Expected - Collected
    const totalPending = totalExpected - totalIncome;

    // Count students with pending fees
    const pendingStudentsCount = await Student.countDocuments({
      feeStatus: { $in: ["pending", "partial"] },
    });

    // TASK 2: Teacher Compensation Calculations

    // Get all active teachers with their assigned classes
    const teachers = await Teacher.find({ status: "active" });

    let totalTeacherLiabilities = 0;
    const teacherPayroll = [];

    for (const teacher of teachers) {
      // Find classes taught by this teacher
      const teacherClasses = await Class.find({
        subjects: {
          $elemMatch: {
            name: { $regex: new RegExp(`^${teacher.subject}$`, "i") },
          },
        },
      });

      // Calculate total collected from this teacher's classes
      let teacherRevenue = 0;
      for (const cls of teacherClasses) {
        const classRevenue = await Student.aggregate([
          { $match: { classRef: cls._id } },
          { $group: { _id: null, collected: { $sum: "$paidAmount" } } },
        ]);
        teacherRevenue += classRevenue[0]?.collected || 0;
      }

      // Calculate teacher's earned amount based on compensation model
      let earnedAmount = 0;
      const compensationType = teacher.compensation?.type || "percentage";

      if (compensationType === "percentage") {
        const teacherShare = teacher.compensation?.teacherShare || 70;
        earnedAmount = teacherRevenue * (teacherShare / 100);
      } else if (compensationType === "fixed") {
        earnedAmount = teacher.compensation?.fixedSalary || 0;
      } else if (compensationType === "hybrid") {
        const baseSalary = teacher.compensation?.baseSalary || 0;
        const profitShare = teacher.compensation?.profitShare || 0;
        earnedAmount = baseSalary + teacherRevenue * (profitShare / 100);
      }

      // Check if teacher already paid for current month
      const TeacherPayment = require("../models/TeacherPayment");
      const now = new Date();
      const currentMonth = now.toLocaleString("en-US", { month: "long" });
      const currentYear = now.getFullYear();

      const alreadyPaid = await TeacherPayment.findOne({
        teacherId: teacher._id,
        month: currentMonth,
        year: currentYear,
        status: "paid",
      });

      // Subtract already paid amount from earned amount
      if (alreadyPaid) {
        earnedAmount = Math.max(0, earnedAmount - alreadyPaid.amountPaid);
      }

      totalTeacherLiabilities += earnedAmount;

      teacherPayroll.push({
        teacherId: teacher._id,
        name: teacher.name,
        subject: teacher.subject,
        compensationType,
        revenue: teacherRevenue,
        earnedAmount: Math.round(earnedAmount),
        classesCount: teacherClasses.length,
      });
    }

    // TASK 2 & 3: Net Balance Calculation with Real Expenses
    const Expense = require("../models/Expense");
    const TeacherPayment = require("../models/TeacherPayment");

    // ========================================
    // CRITICAL: JOINT_POOL Expense Handling
    // ========================================
    // Get JOINT_POOL expenses - these are deducted from GROSS revenue
    // BEFORE the 70/30 teacher split is applied
    const jointPoolExpensesResult = await Expense.aggregate([
      { $match: { paidByType: "JOINT_POOL" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const jointPoolExpenses = jointPoolExpensesResult[0]?.total || 0;

    // Get OTHER expenses (ACADEMY_CASH, partner-paid, etc.)
    const otherExpensesResult = await Expense.aggregate([
      { $match: { paidByType: { $ne: "JOINT_POOL" } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const otherExpenses = otherExpensesResult[0]?.total || 0;

    // Total expenses for reporting
    const totalExpenses = jointPoolExpenses + otherExpenses;

    // ========================================
    // ADJUSTED REVENUE for Teacher Calculations
    // ========================================
    // Deduct JOINT_POOL expenses from gross revenue FIRST
    // This ensures the 70/30 split applies to the NET revenue after joint costs
    const adjustedRevenueForSplit = totalIncome - jointPoolExpenses;

    console.log(`💰 Gross Revenue: PKR ${totalIncome.toLocaleString()}`);
    console.log(`🏦 Joint Pool Expenses: PKR ${jointPoolExpenses.toLocaleString()}`);
    console.log(`📊 Adjusted Revenue (for 70/30 split): PKR ${adjustedRevenueForSplit.toLocaleString()}`);

    // ========================================
    // NOTE: Teacher calculations above already use 'teacherRevenue'
    // which is based on student paidAmount. The JOINT_POOL deduction
    // affects the academy's final net profit, not individual teacher shares.
    // ========================================

    // Get total teacher payouts (money already paid out)
    const now = new Date();
    const currentMonth = now.toLocaleString("en-US", { month: "long" });
    const currentYear = now.getFullYear();

    const teacherPayoutsResult = await TeacherPayment.aggregate([
      {
        $match: {
          status: "paid",
          month: currentMonth,
          year: currentYear,
        },
      },
      { $group: { _id: null, totalPaid: { $sum: "$amountPaid" } } },
    ]);
    const totalTeacherPayouts = teacherPayoutsResult[0]?.totalPaid || 0;

    // Net Profit Formula: Income - (Teacher Pending Liabilities + Already Paid Payouts + Expenses)
    const netProfit =
      totalIncome -
      totalTeacherLiabilities -
      totalTeacherPayouts -
      totalExpenses;

    // Academy's share (what's left after all costs)
    const academyShare = netProfit;

    // === ROLE-BASED RESPONSE FILTERING ===
    // OPERATOR/PARTNER: Cannot see total revenue, net profit, academy balance
    // OWNER: Gets full analytics dashboard data

    if (!isOwner) {
      // Minimal response for OPERATOR/PARTNER/STAFF
      return res.json({
        success: true,
        data: {
          // Only show what's needed for expense entry
          pendingStudentsCount,
          teacherCount: teachers.length,
          // Percentages only (not absolute values)
          collectionRate:
            totalExpected > 0
              ? Math.round((totalIncome / totalExpected) * 100)
              : 0,
        },
        message: "Limited view - contact administrator for full analytics",
      });
    }

    // OWNER: Full analytics dashboard
    res.json({
      success: true,
      data: {
        // Income Metrics
        totalIncome,
        totalExpected,
        totalPending,
        pendingStudentsCount,

        // Teacher Metrics
        totalTeacherLiabilities, // What we OWE (pending)
        totalTeacherPayouts, // What we've PAID (current month)
        teacherPayroll,
        teacherCount: teachers.length,

        // Academy Metrics
        academyShare,
        totalExpenses,
        jointPoolExpenses,  // NEW: Show joint pool expenses separately
        otherExpenses,      // NEW: Show other expenses separately
        netProfit,

        // Percentages for UI
        collectionRate:
          totalExpected > 0
            ? Math.round((totalIncome / totalExpected) * 100)
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

module.exports = router;
