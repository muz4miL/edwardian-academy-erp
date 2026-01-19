const express = require("express");
const router = express.Router();
const {
    createLead,
    getLeads,
    getLeadById,
    updateLead,
    updateLeadStatus,
    deleteLead,
    getLeadStats,
} = require("../controllers/leadController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

/**
 * Lead Routes - CRM Module
 * All routes are protected and accessible to OWNER, PARTNER, OPERATOR
 */

// Stats route (must be before /:id to avoid route capture)
router.get("/stats", protect, getLeadStats);

// CRUD Routes
router.post("/", protect, createLead);
router.get("/", protect, getLeads);
router.get("/:id", protect, getLeadById);
router.patch("/:id", protect, updateLead);
router.patch("/:id/status", protect, updateLeadStatus);
router.delete("/:id", protect, restrictTo("OWNER"), deleteLead);

module.exports = router;
