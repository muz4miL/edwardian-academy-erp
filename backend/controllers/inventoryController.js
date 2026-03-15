const { Inventory, InventoryTransaction, MaintenanceLog } = require("../models/Inventory");

// ========================================
// DASHBOARD & STATS
// ========================================

/**
 * GET /api/inventory/stats — Dashboard KPIs
 */
exports.getInventoryStats = async (req, res) => {
  try {
    const [
      totalItems,
      activeItems,
      totalValue,
      lowStockItems,
      maintenanceItems,
      damagedItems,
      recentTransactions,
      categoryBreakdown,
    ] = await Promise.all([
      Inventory.countDocuments(),
      Inventory.countDocuments({ status: { $in: ["Active", "In Use"] } }),
      Inventory.aggregate([
        { $match: { status: { $ne: "Disposed" } } },
        { $group: { _id: null, total: { $sum: { $multiply: ["$purchasePrice", "$totalQuantity"] } } } },
      ]),
      Inventory.countDocuments({
        $expr: { $lte: ["$availableQuantity", "$minimumStock"] },
        minimumStock: { $gt: 0 },
      }),
      Inventory.countDocuments({ status: "Maintenance" }),
      Inventory.countDocuments({ status: "Damaged" }),
      InventoryTransaction.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("item", "itemName itemCode")
        .lean(),
      Inventory.aggregate([
        { $match: { status: { $ne: "Disposed" } } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalValue: { $sum: { $multiply: ["$purchasePrice", "$totalQuantity"] } },
          },
        },
        { $sort: { totalValue: -1 } },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        totalItems,
        activeItems,
        totalValue: totalValue[0]?.total || 0,
        lowStockItems,
        maintenanceItems,
        damagedItems,
        recentTransactions,
        categoryBreakdown,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching inventory stats:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch stats", error: error.message });
  }
};

// ========================================
// INVENTORY ITEMS — CRUD
// ========================================

/**
 * GET /api/inventory/items — List all items with filters
 */
exports.getItems = async (req, res) => {
  try {
    const { category, status, condition, search, lowStock, location } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (condition) filter.condition = condition;
    if (location) filter["location.room"] = { $regex: location, $options: "i" };
    if (search) {
      filter.$or = [
        { itemName: { $regex: search, $options: "i" } },
        { itemCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "supplier.name": { $regex: search, $options: "i" } },
        { assignedTo: { $regex: search, $options: "i" } },
      ];
    }
    if (lowStock === "true") {
      filter.$expr = { $lte: ["$availableQuantity", "$minimumStock"] };
      filter.minimumStock = { $gt: 0 };
    }

    const items = await Inventory.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error("❌ Error fetching inventory items:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch items", error: error.message });
  }
};

/**
 * GET /api/inventory/items/:id — Get single item with history
 */
exports.getItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    const [transactions, maintenance] = await Promise.all([
      InventoryTransaction.find({ item: req.params.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("performedBy", "fullName username")
        .lean(),
      MaintenanceLog.find({ item: req.params.id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return res.json({ success: true, data: { ...item, transactions, maintenance } });
  } catch (error) {
    console.error("❌ Error fetching item:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch item", error: error.message });
  }
};

/**
 * POST /api/inventory/items — Create new item
 */
exports.createItem = async (req, res) => {
  try {
    const {
      itemName, description, category, image, location,
      totalQuantity, minimumStock, unit, purchasePrice,
      depreciationRate, investorName, supplier,
      purchaseDate, warrantyExpiry, condition, status,
      assignedTo, notes,
    } = req.body;

    if (!itemName || !purchasePrice || !purchaseDate || !category) {
      return res.status(400).json({
        success: false,
        message: "itemName, category, purchasePrice, and purchaseDate are required",
      });
    }

    const qty = Number(totalQuantity) || 1;
    const item = await Inventory.create({
      itemName,
      description,
      category,
      image,
      location: location || {},
      totalQuantity: qty,
      availableQuantity: qty,
      minimumStock: Number(minimumStock) || 0,
      unit: unit || "piece",
      purchasePrice: Number(purchasePrice),
      originalCost: Number(purchasePrice),
      depreciationRate: depreciationRate != null ? Number(depreciationRate) : 10,
      investorName: investorName || "Academy",
      supplier: supplier || {},
      purchaseDate,
      warrantyExpiry,
      condition: condition || "New",
      status: status || "Active",
      assignedTo,
      notes,
      addedBy: req.user?._id,
    });

    // Log the initial purchase transaction
    await InventoryTransaction.create({
      item: item._id,
      type: "Purchase",
      quantity: qty,
      previousQuantity: 0,
      newQuantity: qty,
      unitCost: Number(purchasePrice),
      totalCost: Number(purchasePrice) * qty,
      notes: "Initial stock entry",
      performedBy: req.user?._id,
    });

    console.log(`📦 Inventory item created: ${item.itemName} (${item.itemCode}) — PKR ${item.purchasePrice} x ${qty}`);
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error("❌ Error creating item:", error);
    return res.status(500).json({ success: false, message: "Failed to create item", error: error.message });
  }
};

/**
 * PUT /api/inventory/items/:id — Update item
 */
exports.updateItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    const allowedFields = [
      "itemName", "description", "category", "image", "location",
      "minimumStock", "unit", "purchasePrice", "depreciationRate",
      "investorName", "supplier", "purchaseDate", "warrantyExpiry",
      "condition", "status", "assignedTo", "notes",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        item[field] = req.body[field];
      }
    }

    // Sync originalCost
    if (req.body.purchasePrice) {
      item.originalCost = Number(req.body.purchasePrice);
    }

    item.lastUpdatedBy = req.user?._id;
    await item.save();

    console.log(`✏️ Inventory updated: ${item.itemName} (${item.itemCode})`);
    return res.json({ success: true, data: item });
  } catch (error) {
    console.error("❌ Error updating item:", error);
    return res.status(500).json({ success: false, message: "Failed to update item", error: error.message });
  }
};

/**
 * DELETE /api/inventory/items/:id — Delete item permanently
 */
exports.deleteItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    // Clean up related records
    await Promise.all([
      InventoryTransaction.deleteMany({ item: req.params.id }),
      MaintenanceLog.deleteMany({ item: req.params.id }),
    ]);

    console.log(`🗑️ Inventory deleted: ${item.itemName} (${item.itemCode})`);
    return res.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting item:", error);
    return res.status(500).json({ success: false, message: "Failed to delete item", error: error.message });
  }
};

// ========================================
// STOCK TRANSACTIONS
// ========================================

/**
 * POST /api/inventory/items/:id/stock — Add/Issue/Return stock
 */
exports.stockTransaction = async (req, res) => {
  try {
    const { type, quantity, issuedTo, returnedFrom, reason, notes, unitCost } = req.body;

    if (!type || !quantity) {
      return res.status(400).json({ success: false, message: "type and quantity are required" });
    }

    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    const qty = Math.abs(Number(quantity));
    const previousQty = item.availableQuantity;
    let newAvailable = previousQty;
    let newTotal = item.totalQuantity;

    switch (type) {
      case "Purchase":
        newAvailable += qty;
        newTotal += qty;
        break;
      case "Issue":
        if (qty > previousQty) {
          return res.status(400).json({ success: false, message: `Cannot issue ${qty}. Only ${previousQty} available.` });
        }
        newAvailable -= qty;
        break;
      case "Return":
        newAvailable += qty;
        if (newAvailable > newTotal) newAvailable = newTotal;
        break;
      case "Disposal":
      case "Damage":
      case "Lost":
        if (qty > previousQty) {
          return res.status(400).json({ success: false, message: `Cannot dispose ${qty}. Only ${previousQty} available.` });
        }
        newAvailable -= qty;
        newTotal -= qty;
        break;
      case "Adjustment":
        newAvailable = qty;
        newTotal = qty;
        break;
      case "Transfer":
        if (qty > previousQty) {
          return res.status(400).json({ success: false, message: `Cannot transfer ${qty}. Only ${previousQty} available.` });
        }
        newAvailable -= qty;
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid transaction type" });
    }

    item.availableQuantity = newAvailable;
    item.totalQuantity = newTotal;

    // Auto-update status based on stock
    if (newAvailable === 0 && type === "Disposal") item.status = "Disposed";
    if (type === "Damage") item.condition = "Damaged";
    if (type === "Lost") item.status = "Lost";

    item.lastUpdatedBy = req.user?._id;
    await item.save();

    const transaction = await InventoryTransaction.create({
      item: item._id,
      type,
      quantity: qty,
      previousQuantity: previousQty,
      newQuantity: newAvailable,
      unitCost: unitCost ? Number(unitCost) : item.purchasePrice,
      totalCost: (unitCost ? Number(unitCost) : item.purchasePrice) * qty,
      issuedTo,
      returnedFrom,
      reason,
      notes,
      performedBy: req.user?._id,
    });

    console.log(`📊 Stock ${type}: ${item.itemName} — Qty ${previousQty} → ${newAvailable}`);
    return res.json({ success: true, data: { item, transaction } });
  } catch (error) {
    console.error("❌ Stock transaction error:", error);
    return res.status(500).json({ success: false, message: "Stock transaction failed", error: error.message });
  }
};

/**
 * GET /api/inventory/transactions — Get all transactions
 */
exports.getTransactions = async (req, res) => {
  try {
    const { type, itemId, limit: queryLimit } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (itemId) filter.item = itemId;

    const resultLimit = Math.min(Number(queryLimit) || 100, 500);
    const transactions = await InventoryTransaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(resultLimit)
      .populate("item", "itemName itemCode category")
      .populate("performedBy", "fullName username")
      .lean();

    return res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    console.error("❌ Error fetching transactions:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch transactions", error: error.message });
  }
};

// ========================================
// MAINTENANCE
// ========================================

/**
 * POST /api/inventory/items/:id/maintenance — Report maintenance
 */
exports.createMaintenance = async (req, res) => {
  try {
    const { issueDescription, priority, vendor, cost, notes } = req.body;

    if (!issueDescription) {
      return res.status(400).json({ success: false, message: "Issue description is required" });
    }

    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    const log = await MaintenanceLog.create({
      item: item._id,
      issueDescription,
      priority: priority || "Medium",
      vendor,
      cost: cost ? Number(cost) : 0,
      notes,
      reportedBy: req.user?._id,
    });

    // Optionally update item status
    if (item.status !== "Maintenance") {
      item.status = "Maintenance";
      item.lastUpdatedBy = req.user?._id;
      await item.save();
    }

    console.log(`🔧 Maintenance reported: ${item.itemName} — ${issueDescription}`);
    return res.status(201).json({ success: true, data: log });
  } catch (error) {
    console.error("❌ Error creating maintenance log:", error);
    return res.status(500).json({ success: false, message: "Failed to create maintenance log", error: error.message });
  }
};

/**
 * PUT /api/inventory/maintenance/:id — Update maintenance status
 */
exports.updateMaintenance = async (req, res) => {
  try {
    const { status, cost, notes, vendor } = req.body;
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: "Maintenance log not found" });

    if (status) log.status = status;
    if (cost !== undefined) log.cost = Number(cost);
    if (notes) log.notes = notes;
    if (vendor) log.vendor = vendor;
    if (status === "Completed") log.completedDate = new Date();

    await log.save();

    // If completed, restore item status to Active
    if (status === "Completed") {
      const item = await Inventory.findById(log.item);
      if (item && item.status === "Maintenance") {
        item.status = "Active";
        item.condition = "Good";
        item.lastUpdatedBy = req.user?._id;
        await item.save();
      }
    }

    console.log(`🔧 Maintenance updated: ${log._id} — ${status}`);
    return res.json({ success: true, data: log });
  } catch (error) {
    console.error("❌ Error updating maintenance:", error);
    return res.status(500).json({ success: false, message: "Failed to update maintenance", error: error.message });
  }
};

/**
 * GET /api/inventory/maintenance — Get all maintenance logs
 */
exports.getMaintenanceLogs = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const logs = await MaintenanceLog.find(filter)
      .sort({ createdAt: -1 })
      .populate("item", "itemName itemCode category location")
      .populate("reportedBy", "fullName username")
      .lean();

    return res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    console.error("❌ Error fetching maintenance logs:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch maintenance logs", error: error.message });
  }
};

// ========================================
// BACKWARD COMPATIBILITY — Legacy endpoint
// for Finance page asset registry
// ========================================

/**
 * GET /api/inventory (legacy) — Returns all items for Finance asset view
 */
exports.getLegacyAssets = async (req, res) => {
  try {
    const assets = await Inventory.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: assets });
  } catch (error) {
    console.error("❌ Error fetching inventory:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch inventory", error: error.message });
  }
};

/**
 * POST /api/inventory (legacy) — Create asset from Finance page
 */
exports.createLegacyAsset = async (req, res) => {
  try {
    const { itemName, investorName, purchaseDate, originalCost, depreciationRate } = req.body;

    if (!itemName || !purchaseDate || !originalCost) {
      return res.status(400).json({ success: false, message: "itemName, purchaseDate, and originalCost are required" });
    }

    const asset = await Inventory.create({
      itemName,
      category: "Other",
      investorName: investorName || "Academy",
      purchaseDate,
      purchasePrice: Number(originalCost),
      originalCost: Number(originalCost),
      depreciationRate: depreciationRate != null ? Number(depreciationRate) : 10,
      addedBy: req.user?._id,
    });

    console.log(`📦 Asset created (legacy): ${asset.itemName} — PKR ${asset.originalCost}`);
    return res.status(201).json({ success: true, data: asset });
  } catch (error) {
    console.error("❌ Error creating asset:", error);
    return res.status(500).json({ success: false, message: "Failed to create asset", error: error.message });
  }
};

/**
 * DELETE /api/inventory/:id (legacy) — Delete from Finance page
 */
exports.deleteLegacyAsset = async (req, res) => {
  try {
    const asset = await Inventory.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    await Promise.all([
      InventoryTransaction.deleteMany({ item: req.params.id }),
      MaintenanceLog.deleteMany({ item: req.params.id }),
    ]);

    console.log(`🗑️ Asset deleted: ${asset.itemName}`);
    return res.json({ success: true, message: "Asset deleted" });
  } catch (error) {
    console.error("❌ Error deleting asset:", error);
    return res.status(500).json({ success: false, message: "Failed to delete asset", error: error.message });
  }
};
