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

  const salaryTotal =
    this.salaryConfig.teacherShare + this.salaryConfig.academyShare;
  if (salaryTotal !== 100) {
    return next(new Error(`Salary split must total 100%, got ${salaryTotal}%`));
  }

  // Initialize default subject fees if new document and empty
  if (this.isNew && (!this.defaultSubjectFees || this.defaultSubjectFees.length === 0)) {
    this.defaultSubjectFees = [
      { name: 'Biology', fee: 3000 },
      { name: 'Physics', fee: 3000 },
      { name: 'Chemistry', fee: 2500 },
      { name: 'Mathematics', fee: 2500 },
      { name: 'English', fee: 2000 },
    ];
    console.log('✅ Initialized configuration with Peshawar standard subject rates');
  }

  next();
});

module.exports = mongoose.model("Configuration", configurationSchema);
