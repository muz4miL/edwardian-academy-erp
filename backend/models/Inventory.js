const mongoose = require("mongoose");

// ========================================
// INVENTORY ITEM — Full Asset & Stock Tracking
// ========================================
const inventorySchema = new mongoose.Schema(
  {
    // ── Basic Info ──
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    itemCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Furniture",
        "Electronics",
        "Stationery",
        "Lab Equipment",
        "Sports Equipment",
        "Cleaning Supplies",
        "Books & Materials",
        "IT Equipment",
        "Kitchen & Cafeteria",
        "Safety & Security",
        "Electrical",
        "Plumbing",
        "Uniform & Clothing",
        "Office Supplies",
        "Other",
      ],
      default: "Other",
    },
    image: {
      type: String, // URL or base64
    },

    // ── Location ──
    location: {
      building: { type: String, trim: true, default: "Main Building" },
      floor: { type: String, trim: true },
      room: { type: String, trim: true },
    },

    // ── Quantity Tracking ──
    totalQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    availableQuantity: {
      type: Number,
      min: 0,
      default: 1,
    },
    minimumStock: {
      type: Number,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      default: "piece",
      enum: ["piece", "box", "pack", "set", "kg", "liter", "meter", "roll", "ream", "dozen", "pair"],
    },

    // ── Financial ──
    purchasePrice: {
      type: Number,
      required: [true, "Purchase price is required"],
      min: 0,
    },
    // Keep backward compatibility with existing field name
    originalCost: {
      type: Number,
      min: 0,
    },
    depreciationRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    investorName: {
      type: String,
      default: "Academy",
      trim: true,
    },

    // ── Supplier ──
    supplier: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      company: { type: String, trim: true },
    },

    // ── Dates & Warranty ──
    purchaseDate: {
      type: Date,
      required: [true, "Purchase date is required"],
    },
    warrantyExpiry: {
      type: Date,
    },

    // ── Condition & Status ──
    condition: {
      type: String,
      enum: ["New", "Good", "Fair", "Poor", "Damaged", "Disposed"],
      default: "New",
    },
    status: {
      type: String,
      enum: ["Active", "In Use", "Maintenance", "Damaged", "Disposed", "Lost"],
      default: "Active",
    },

    // ── Assignment ──
    assignedTo: {
      type: String, // Room, department, or person name
      trim: true,
    },

    // ── Notes ──
    notes: {
      type: String,
      trim: true,
    },

    // ── Audit ──
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Auto-sync originalCost from purchasePrice for backward compatibility
inventorySchema.pre("save", function () {
  if (this.purchasePrice && !this.originalCost) {
    this.originalCost = this.purchasePrice;
  }
  if (this.originalCost && !this.purchasePrice) {
    this.purchasePrice = this.originalCost;
  }
});

// Auto-generate item code if not provided
inventorySchema.pre("save", async function () {
  if (!this.itemCode) {
    const count = await this.constructor.countDocuments();
    const prefix = this.category ? this.category.substring(0, 3).toUpperCase() : "INV";
    this.itemCode = `${prefix}-${String(count + 1).padStart(4, "0")}`;
  }
});

// ========================================
// INVENTORY TRANSACTION — Stock Movement Log
// ========================================
const inventoryTransactionSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["Purchase", "Issue", "Return", "Disposal", "Adjustment", "Transfer", "Damage", "Lost"],
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousQuantity: {
      type: Number,
    },
    newQuantity: {
      type: Number,
    },
    unitCost: {
      type: Number,
      min: 0,
    },
    totalCost: {
      type: Number,
      min: 0,
    },
    issuedTo: {
      type: String, // Person or room
      trim: true,
    },
    returnedFrom: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// ========================================
// MAINTENANCE LOG — Repair & Service Tracking
// ========================================
const maintenanceLogSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    issueDescription: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Reported", "In Progress", "Completed", "Cancelled"],
      default: "Reported",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    cost: {
      type: Number,
      min: 0,
      default: 0,
    },
    vendor: {
      type: String,
      trim: true,
    },
    reportedDate: {
      type: Date,
      default: Date.now,
    },
    completedDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Inventory = mongoose.model("Inventory", inventorySchema);
const InventoryTransaction = mongoose.model("InventoryTransaction", inventoryTransactionSchema);
const MaintenanceLog = mongoose.model("MaintenanceLog", maintenanceLogSchema);

module.exports = { Inventory, InventoryTransaction, MaintenanceLog };
