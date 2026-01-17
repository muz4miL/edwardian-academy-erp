/**
 * Website Configuration Routes
 * Public and protected endpoints for CMS
 */

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getPublicConfig,
  getConfig,
  updateConfig,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAdmissionStatus,
} = require("../controllers/websiteController");

// ========================================
// PUBLIC ROUTES (no auth required)
// ========================================

// Get public website configuration (for landing page)
router.get("/public", getPublicConfig);

// ========================================
// PROTECTED ROUTES (OWNER only)
// ========================================

// Get full config for CMS
router.get("/config", protect, getConfig);

// Update website configuration
router.put("/config", protect, updateConfig);

// Announcement management
router.post("/announcements", protect, addAnnouncement);
router.put("/announcements/:id", protect, updateAnnouncement);
router.delete("/announcements/:id", protect, deleteAnnouncement);

// Toggle admission status
router.patch("/admission-status", protect, toggleAdmissionStatus);

module.exports = router;
