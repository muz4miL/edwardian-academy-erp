/**
 * ================================================================
 * EDWARDIAN ACADEMY — REPORTS ROUTES
 * ================================================================
 * Comprehensive reporting endpoints for class, teacher, and 
 * financial reports with full data export capabilities.
 * ================================================================
 */

const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  getClassReport,
  getTeacherReport,
  getAllClassesForReport,
  getAllTeachersForReport,
  getAcademySummaryReport,
  getFinancialOverviewReport,
} = require("../controllers/reportController");

// @route   GET /api/reports/classes
// @desc    Get all classes for report dropdown
// @access  Protected (OWNER, STAFF)
router.get("/classes", protect, getAllClassesForReport);

// @route   GET /api/reports/teachers
// @desc    Get all teachers for report dropdown
// @access  Protected (OWNER, STAFF)
router.get("/teachers", protect, getAllTeachersForReport);

// @route   GET /api/reports/class/:classId
// @desc    Get comprehensive class report with student roster
// @access  Protected (OWNER, STAFF)
router.get("/class/:classId", protect, getClassReport);

// @route   GET /api/reports/teacher/:teacherId
// @desc    Get comprehensive teacher report with earnings breakdown
// @access  Protected (OWNER, STAFF, TEACHER - own report only)
router.get("/teacher/:teacherId", protect, getTeacherReport);

// @route   GET /api/reports/academy-summary
// @desc    Get overall academy summary statistics
// @access  Protected (OWNER)
router.get("/academy-summary", protect, restrictTo("OWNER"), getAcademySummaryReport);

// @route   GET /api/reports/financial-overview
// @desc    Get financial overview with period filter
// @access  Protected (OWNER)
router.get("/financial-overview", protect, restrictTo("OWNER"), getFinancialOverviewReport);

module.exports = router;
