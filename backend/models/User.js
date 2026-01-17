const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// All possible permission values for sidebar tabs
const PERMISSION_VALUES = [
  "dashboard",
  "admissions",
  "students",
  "teachers",
  "finance",
  "classes",
  "timetable",
  "sessions",
  "configuration",
  "users", // User Management - OWNER only in practice
  "website", // Website CMS - OWNER only
  "payroll", // Payroll Management - OWNER only
];

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["OWNER", "PARTNER", "STAFF"],
      required: true,
    },
    // RBAC: Permissions array controls which sidebar tabs the user can see
    permissions: {
      type: [String],
      enum: PERMISSION_VALUES,
      default: ["dashboard"], // Everyone gets dashboard by default
    },
    // Financial Fields (Updated for Smart Wallet)
    walletBalance: {
      floating: { type: Number, default: 0 }, // Cash currently in pocket
      verified: { type: Number, default: 0 }, // Cash verified/banked
    },
    // Partner Debt Tracking - Amount owed TO the owner (Sir Waqar)
    // Used when owner pays expenses out-of-pocket and partners owe their share
    debtToOwner: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Deprecated fields kept for safety, but we rely on walletBalance now
    pendingDebt: {
      type: Number,
      default: 0,
      min: 0,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    canBeDeleted: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// ========================================
// PRE-SAVE HOOK: Hash Password
// ========================================
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ========================================
// INSTANCE METHOD: Compare Password
// ========================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ========================================
// INSTANCE METHOD: Get Public Profile
// ========================================
userSchema.methods.getPublicProfile = function () {
  const walletBalance =
    this.walletBalance && typeof this.walletBalance === "object"
      ? {
          floating:
            typeof this.walletBalance.floating === "number"
              ? this.walletBalance.floating
              : 0,
          verified:
            typeof this.walletBalance.verified === "number"
              ? this.walletBalance.verified
              : 0,
        }
      : { floating: 0, verified: 0 };

  // OWNER gets all permissions automatically
  let permissions = this.permissions || ["dashboard"];
  if (this.role === "OWNER") {
    permissions = [
      "dashboard",
      "admissions",
      "students",
      "teachers",
      "finance",
      "classes",
      "timetable",
      "sessions",
      "configuration",
      "users",
    ];
  }

  return {
    userId: this.userId,
    username: this.username,
    fullName: this.fullName,
    role: this.role,
    permissions,
    walletBalance,
    // Backward-compatible field for older frontend code
    floatingCash: walletBalance.floating,
    pendingDebt: this.pendingDebt,
    phone: this.phone,
    email: this.email,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
  };
};

module.exports = mongoose.model("User", userSchema);
