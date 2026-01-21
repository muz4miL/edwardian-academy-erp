const express = require("express");
const router = express.Router();
const {
  publicRegister,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  getPendingCount,
  getNextStudentId,
  updateStudentCredentials,
} = require("../controllers/publicController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

/**
 * Public Routes
 * Some routes are public (no auth), others are protected.
 */

// ========================================
// PUBLIC ROUTES (No Login Required)
// ========================================

// Student self-registration
router.post("/register", publicRegister);

// ========================================
// PROTECTED ROUTES (Admin approval)
// ========================================

// Get all pending registrations
router.get(
  "/pending",
  protect,
  restrictTo("OWNER", "OPERATOR"),
  getPendingRegistrations,
);

// Get pending count (for sidebar badge)
router.get("/pending-count", protect, getPendingCount);

// Get next available Student ID
router.get(
  "/next-id",
  protect,
  restrictTo("OWNER", "OPERATOR"),
  getNextStudentId,
);

// Approve a registration
router.post(
  "/approve/:id",
  protect,
  restrictTo("OWNER", "OPERATOR"),
  approveRegistration,
);

// Reject a registration
router.delete(
  "/reject/:id",
  protect,
  restrictTo("OWNER", "OPERATOR"),
  rejectRegistration,
);

// Update student credentials (ID/Password)
router.patch(
  "/update-credentials/:id",
  protect,
  restrictTo("OWNER", "OPERATOR"),
  updateStudentCredentials,
);

module.exports = router;
