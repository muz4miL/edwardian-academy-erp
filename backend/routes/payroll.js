const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  createPayoutRequest,
  getAllPayoutRequests,
  getTeacherPayoutRequests,
  approvePayoutRequest,
  rejectPayoutRequest,
  getPayrollDashboard,
} = require("../controllers/payrollController");

// @route   POST /api/payroll/request
// @desc    Teacher requests a cash payout
// @access  Protected
router.post("/request", protect, createPayoutRequest);

// @route   GET /api/payroll/requests
// @desc    Get all payout requests (for Owner dashboard)
// @access  Protected (OWNER only)
router.get("/requests", protect, restrictTo("OWNER"), getAllPayoutRequests);

// @route   GET /api/payroll/my-requests/:teacherId
// @desc    Get teacher's own payout requests
// @access  Protected
router.get("/my-requests/:teacherId", protect, getTeacherPayoutRequests);

// @route   POST /api/payroll/approve/:requestId
// @desc    Approve a payout request
// @access  Protected (OWNER only)
router.post(
  "/approve/:requestId",
  protect,
  restrictTo("OWNER"),
  approvePayoutRequest,
);

// @route   POST /api/payroll/reject/:requestId
// @desc    Reject a payout request
// @access  Protected (OWNER only)
router.post(
  "/reject/:requestId",
  protect,
  restrictTo("OWNER"),
  rejectPayoutRequest,
);

// @route   GET /api/payroll/dashboard
// @desc    Get payroll dashboard stats
// @access  Protected (OWNER only)
router.get("/dashboard", protect, restrictTo("OWNER"), getPayrollDashboard);

module.exports = router;
