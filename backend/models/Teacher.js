const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema(
  {
    // Personal Information
    name: {
      type: String,
      required: [true, "Teacher name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, "Subject specialization is required"],
      enum: ["biology", "chemistry", "physics", "math", "english"],
    },
    joiningDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    // Teacher Balance (Earnings Wallet)
    balance: {
      floating: { type: Number, default: 0 }, // Unverified earnings (pending day close)
      verified: { type: Number, default: 0 }, // Verified earnings (available for payout)
    },

    // Compensation Package (Triple-Mode Support)
    compensation: {
      // Compensation Type: 'percentage', 'fixed', or 'hybrid'
      type: {
        type: String,
        enum: ["percentage", "fixed", "hybrid"],
        required: true,
        default: "percentage",
      },

      // For Percentage Mode (70/30 Split)
      teacherShare: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
      academyShare: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      // For Fixed Salary Mode
      fixedSalary: {
        type: Number,
        min: 0,
        default: null,
      },

      // For Hybrid Mode (Base + Profit Share)
      baseSalary: {
        type: Number,
        min: 0,
        default: null,
      },
      profitShare: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// Virtual field to get compensation summary
TeacherSchema.virtual("compensationSummary").get(function () {
  const {
    type,
    teacherShare,
    academyShare,
    fixedSalary,
    baseSalary,
    profitShare,
  } = this.compensation;

  if (type === "percentage") {
    return `${teacherShare}% / ${academyShare}% Split`;
  } else if (type === "fixed") {
    return `PKR ${fixedSalary.toLocaleString()} /month`;
  } else if (type === "hybrid") {
    return `PKR ${baseSalary.toLocaleString()} + ${profitShare}% Bonus`;
  }
  return "Not Set";
});

// Pre-save validation to ensure correct fields are populated based on compensation type
TeacherSchema.pre("save", async function () {
  console.log("🔍 PRE-SAVE HOOK - Before processing:", {
    type: this.compensation.type,
    teacherShare: this.compensation.teacherShare,
    academyShare: this.compensation.academyShare,
    fixedSalary: this.compensation.fixedSalary,
    baseSalary: this.compensation.baseSalary,
    profitShare: this.compensation.profitShare,
  });

  // Convert empty strings to null for all compensation fields
  const convertToNull = (value) => {
    if (value === "" || value === undefined) return null;
    return value;
  };

  this.compensation.teacherShare = convertToNull(
    this.compensation.teacherShare,
  );
  this.compensation.academyShare = convertToNull(
    this.compensation.academyShare,
  );
  this.compensation.fixedSalary = convertToNull(this.compensation.fixedSalary);
  this.compensation.baseSalary = convertToNull(this.compensation.baseSalary);
  this.compensation.profitShare = convertToNull(this.compensation.profitShare);

  const {
    type,
    teacherShare,
    academyShare,
    fixedSalary,
    baseSalary,
    profitShare,
  } = this.compensation;

  if (type === "percentage") {
    // Validate percentage fields are present and are numbers
    if (
      teacherShare === null ||
      teacherShare === undefined ||
      isNaN(teacherShare)
    ) {
      throw new Error("Teacher share is required for percentage compensation");
    }
    if (
      academyShare === null ||
      academyShare === undefined ||
      isNaN(academyShare)
    ) {
      throw new Error("Academy share is required for percentage compensation");
    }
    if (teacherShare + academyShare !== 100) {
      throw new Error("Teacher and Academy shares must sum to 100%");
    }
    // Clear other fields
    this.compensation.fixedSalary = null;
    this.compensation.baseSalary = null;
    this.compensation.profitShare = null;
  } else if (type === "fixed") {
    // Validate fixed salary is present and is a number
    if (
      fixedSalary === null ||
      fixedSalary === undefined ||
      isNaN(fixedSalary)
    ) {
      throw new Error("Fixed salary is required for fixed compensation");
    }
    if (fixedSalary < 0) {
      throw new Error("Fixed salary must be a positive number");
    }
    // Clear other fields
    this.compensation.teacherShare = null;
    this.compensation.academyShare = null;
    this.compensation.baseSalary = null;
    this.compensation.profitShare = null;
  } else if (type === "hybrid") {
    // Validate hybrid fields are present and are numbers
    if (baseSalary === null || baseSalary === undefined || isNaN(baseSalary)) {
      throw new Error("Base salary is required for hybrid compensation");
    }
    if (
      profitShare === null ||
      profitShare === undefined ||
      isNaN(profitShare)
    ) {
      throw new Error("Profit share is required for hybrid compensation");
    }
    // Clear other fields
    this.compensation.teacherShare = null;
    this.compensation.academyShare = null;
    this.compensation.fixedSalary = null;
  }

  console.log("✅ PRE-SAVE HOOK - After processing:", {
    type: this.compensation.type,
    teacherShare: this.compensation.teacherShare,
    academyShare: this.compensation.academyShare,
    fixedSalary: this.compensation.fixedSalary,
    baseSalary: this.compensation.baseSalary,
    profitShare: this.compensation.profitShare,
  });
});

module.exports = mongoose.model("Teacher", TeacherSchema);
