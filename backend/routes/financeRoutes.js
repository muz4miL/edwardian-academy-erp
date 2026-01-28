const express = require("express");
const router = express.Router();
const {
  closeDay,
  getDashboardStats,
  recordTransaction,
  getPartnerPortalStats,
  processRefund,
  distributePool,
  getPoolStatus,
  markExpenseAsPaid,
  confirmExpenseReceipt,
  getPendingExpenseConfirmations,
} = require("../controllers/financeController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// @route   POST /api/finance/close-day
// @desc    Close the day and lock floating cash
// @access  Partners & Owner only
router.post("/close-day", authorize("OWNER", "PARTNER"), closeDay);

// @route   GET /api/finance/dashboard-stats
// @desc    Get financial stats for dashboard widgets
// @access  All authenticated users
router.get("/dashboard-stats", getDashboardStats);

// @route   POST /api/finance/record-transaction
// @desc    Record a new income or expense transaction
// @access  Partners & Owner only
router.post(
  "/record-transaction",
  authorize("OWNER", "PARTNER"),
  recordTransaction,
);

// @route   GET /api/finance/partner-stats
// @desc    Get Partner Portal financial stats (SRS 3.0)
// @access  Partners & Owner only
router.get(
  "/partner-stats",
  authorize("OWNER", "PARTNER"),
  getPartnerPortalStats,
);

// @route   POST /api/finance/refund
// @desc    Process student refund with reverse financial logic (SRS 3.0 Module 5)
// @access  Owner/Admin only
router.post("/refund", authorize("OWNER", "ADMIN"), processRefund);

// ========================================
// POOL DISTRIBUTION ROUTES (SRS 3.0)
// ========================================

// @route   POST /api/finance/distribute-pool
// @desc    Distribute UNALLOCATED_POOL to partners (40/30/30 split)
// @access  Owner only
router.post("/distribute-pool", authorize("OWNER"), distributePool);

// @route   GET /api/finance/pool-status
// @desc    Get current pool status and distribution history
// @access  Partners & Owner
router.get("/pool-status", authorize("OWNER", "PARTNER"), getPoolStatus);

// ========================================
// EXPENSE APPROVAL WORKFLOW ROUTES (SRS 3.0)
// ========================================

// @route   POST /api/finance/expenses/mark-paid
// @desc    Partner marks their expense share as paid
// @access  Partners only
router.post("/expenses/mark-paid", authorize("PARTNER"), markExpenseAsPaid);

// @route   POST /api/finance/expenses/confirm-receipt
// @desc    Owner confirms receipt of partner payment
// @access  Owner only
router.post(
  "/expenses/confirm-receipt",
  authorize("OWNER"),
  confirmExpenseReceipt,
);

// @route   GET /api/finance/expenses/pending-confirmations
// @desc    Get all expenses awaiting owner confirmation
// @access  Owner only
router.get(
  "/expenses/pending-confirmations",
  authorize("OWNER"),
  getPendingExpenseConfirmations,
);

module.exports = router;
