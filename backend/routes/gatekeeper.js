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
 * Protected: OWNER and OPERATOR only
 */

// Barcode scanning endpoint
router.post("/scan", protect, restrictTo("OWNER", "OPERATOR", "PARTNER"), scanBarcode);

// Manual student search
router.get("/search", protect, restrictTo("OWNER", "OPERATOR", "PARTNER"), searchStudent);

// Generate barcode for a student
router.post("/generate-barcode/:id", protect, restrictTo("OWNER", "OPERATOR"), generateBarcode);

// Record a reprint (for anti-fraud tracking)
router.post("/reprint/:id", protect, restrictTo("OWNER", "OPERATOR"), recordReprint);

module.exports = router;
