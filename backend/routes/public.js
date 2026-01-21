const express = require("express");
const router = express.Router();
const {
    publicRegister,
    getPendingRegistrations,
    approveRegistration,
    rejectRegistration,
    getPendingCount,
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
router.get("/pending", protect, restrictTo("OWNER", "OPERATOR"), getPendingRegistrations);

// Get pending count (for sidebar badge)
router.get("/pending-count", protect, getPendingCount);

// Approve a registration
router.post("/approve/:id", protect, restrictTo("OWNER", "OPERATOR"), approveRegistration);

// Reject a registration  
router.delete("/reject/:id", protect, restrictTo("OWNER", "OPERATOR"), rejectRegistration);

module.exports = router;
