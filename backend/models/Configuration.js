const mongoose = require("mongoose");

const configurationSchema = new mongoose.Schema(
  {
    // Card 4: Academy Identity
    academyName: { type: String, default: "Edwardian Academy" },
    academyLogo: { type: String, default: "" },
    academyAddress: { type: String, default: "Peshawar, Pakistan" },
    academyPhone: { type: String, default: "" },

    // Card 1: Global Staff Split (Revenue IN) - for non-owner teachers
    salaryConfig: {
      teacherShare: { type: Number, default: 70, min: 0, max: 100 },
      academyShare: { type: Number, default: 30, min: 0, max: 100 },
    },

    // Card 2: Partner Revenue Rule (The 100% Rule)
    partner100Rule: {
      type: Boolean,
      default: true,
      description:
        "If ON, partners (Waqar, Zahid, Saud) receive 100% for their own subjects",
    },

    // Card 3: Dynamic Expense Split (Money OUT) - must total 100%
    expenseSplit: {
      waqar: { type: Number, default: 40, min: 0, max: 100 },
      zahid: { type: Number, default: 30, min: 0, max: 100 },
      saud: { type: Number, default: 30, min: 0, max: 100 },
    },

    // ========================================
    // WAQAR'S PROTOCOL: Dual-Pool Revenue Splits
    // ========================================

    // Protocol A: Tuition/Regular Pool Split (50/30/20)
    // Applies to: 9th, 10th, 11th, 12th Grade regular tuition
    tuitionPoolSplit: {
      waqar: { type: Number, default: 50, min: 0, max: 100 },
      zahid: { type: Number, default: 30, min: 0, max: 100 },
      saud: { type: Number, default: 20, min: 0, max: 100 },
    },

    // Protocol B: ETEA/MDCAT Pool Split (40/30/30)
    // Applies to: ETEA, MDCAT, ECAT preparation classes
    eteaPoolSplit: {
      waqar: { type: Number, default: 40, min: 0, max: 100 },
      zahid: { type: Number, default: 30, min: 0, max: 100 },
      saud: { type: Number, default: 30, min: 0, max: 100 },
    },

    // Legacy: Keep for backwards compatibility (defaults to tuition split)
    poolDistribution: {
      waqar: { type: Number, default: 50, min: 0, max: 100 },
      zahid: { type: Number, default: 30, min: 0, max: 100 },
      saud: { type: Number, default: 20, min: 0, max: 100 },
    },

    // Card 7: ETEA/MDCAT Per-Student Commission
    // Universal commission rate for ALL teachers in ETEA/MDCAT (regardless of subject)
    // Partners get 100% (Commission + Tuition), Staff get Commission only (Pending)
    eteaConfig: {
      perStudentCommission: { type: Number, default: 3000, min: 0 }, // Universal rate for all ETEA teachers
      // English teacher exception: Fixed salary per session (not per-student)
      englishFixedSalary: { type: Number, default: 80000, min: 0 },
    },

    // Partner User IDs for pool distribution (robust lookup)
    partnerIds: {
      waqar: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      zahid: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      saud: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    // Card 5: Master Subject Pricing - Global base fees synced across all modules
    defaultSubjectFees: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        fee: {
          type: Number,
          default: 0,
          min: [0, "Subject fee cannot be negative"],
        },
      },
    ],
  },
  { timestamps: true },
);

// Pre-save validation: expenseSplit must total 100%
configurationSchema.pre("save", function (next) {
  const total =
    this.expenseSplit.waqar + this.expenseSplit.zahid + this.expenseSplit.saud;
  if (total !== 100) {
    return next(new Error(`Expense split must total 100%, got ${total}%`));
  }

  // Tuition Pool distribution must total 100%
  if (this.tuitionPoolSplit) {
    const tuitionTotal =
      this.tuitionPoolSplit.waqar +
      this.tuitionPoolSplit.zahid +
      this.tuitionPoolSplit.saud;
    if (tuitionTotal !== 100) {
      return next(
        new Error(`Tuition pool split must total 100%, got ${tuitionTotal}%`),
      );
    }
  }

  // ETEA Pool distribution must total 100%
  if (this.eteaPoolSplit) {
    const eteaTotal =
      this.eteaPoolSplit.waqar +
      this.eteaPoolSplit.zahid +
      this.eteaPoolSplit.saud;
    if (eteaTotal !== 100) {
      return next(
        new Error(`ETEA pool split must total 100%, got ${eteaTotal}%`),
      );
    }
  }

  // Legacy pool distribution (for backwards compatibility)
  if (this.poolDistribution) {
    const poolTotal =
      this.poolDistribution.waqar +
      this.poolDistribution.zahid +
      this.poolDistribution.saud;
    if (poolTotal !== 100) {
      return next(
        new Error(`Pool distribution must total 100%, got ${poolTotal}%`),
      );
    }
  }

  const salaryTotal =
    this.salaryConfig.teacherShare + this.salaryConfig.academyShare;
  if (salaryTotal !== 100) {
    return next(new Error(`Salary split must total 100%, got ${salaryTotal}%`));
  }

  // Initialize default subject fees if new document and empty
  if (
    this.isNew &&
    (!this.defaultSubjectFees || this.defaultSubjectFees.length === 0)
  ) {
    this.defaultSubjectFees = [
      { name: "Biology", fee: 3000 },
      { name: "Physics", fee: 3000 },
      { name: "Chemistry", fee: 2500 },
      { name: "Mathematics", fee: 2500 },
      { name: "English", fee: 2000 },
    ];
    console.log(
      "✅ Initialized configuration with Peshawar standard subject rates",
    );
  }

  next();
});

module.exports = mongoose.model("Configuration", configurationSchema);
