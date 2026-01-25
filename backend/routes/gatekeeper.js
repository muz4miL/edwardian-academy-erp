const express = require("express");
const router = express.Router();
const {
    scanBarcode,
    searchStudent,
    generateBarcode,
    recordReprint,
} = require("../controllers/gatekeeperController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

/**
 * Gatekeeper Routes - Smart Gate Scanner Module
 * Protected: All trusted roles (OWNER, OPERATOR, ADMIN, STAFF, PARTNER)
 * Anyone manning the desk needs scanner access
 */

// Barcode scanning endpoint - Allow all trusted roles
router.post("/scan", protect, restrictTo("OWNER", "OPERATOR", "ADMIN", "STAFF", "PARTNER"), scanBarcode);

// Manual student search - Allow all trusted roles
router.get("/search", protect, restrictTo("OWNER", "OPERATOR", "ADMIN", "STAFF", "PARTNER"), searchStudent);

// Generate barcode for a student - Admin level only
router.post("/generate-barcode/:id", protect, restrictTo("OWNER", "OPERATOR", "ADMIN"), generateBarcode);

// Record a reprint (for anti-fraud tracking) - Admin level only
router.post("/reprint/:id", protect, restrictTo("OWNER", "OPERATOR", "ADMIN"), recordReprint);

module.exports = router;
