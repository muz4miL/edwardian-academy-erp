const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/inventoryController");

/**
 * Inventory Management System Routes
 * Full CRUD + Stock Management + Maintenance + Reports
 */

// ── Dashboard Stats ──
router.get("/stats", protect, ctrl.getInventoryStats);

// ── Transactions Log ──
router.get("/transactions", protect, ctrl.getTransactions);

// ── Maintenance ──
router.get("/maintenance", protect, ctrl.getMaintenanceLogs);
router.put("/maintenance/:id", protect, ctrl.updateMaintenance);

// ── Items CRUD ──
router.get("/items", protect, ctrl.getItems);
router.get("/items/:id", protect, ctrl.getItem);
router.post("/items", protect, ctrl.createItem);
router.put("/items/:id", protect, ctrl.updateItem);
router.delete("/items/:id", protect, ctrl.deleteItem);

// ── Stock Transactions ──
router.post("/items/:id/stock", protect, ctrl.stockTransaction);

// ── Maintenance per Item ──
router.post("/items/:id/maintenance", protect, ctrl.createMaintenance);

// ── Legacy Routes (backward compat for Finance asset registry) ──
router.get("/", protect, ctrl.getLegacyAssets);
router.post("/", protect, ctrl.createLegacyAsset);
router.delete("/:id", protect, ctrl.deleteLegacyAsset);

module.exports = router;
