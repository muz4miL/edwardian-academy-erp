const mongoose = require("mongoose");

const configurationSchema = new mongoose.Schema(
  {
    academyName: { type: String, default: "Edwardian Academy" },
    expenseSplit: {
      waqar: { type: Number, default: 40 },
      zahid: { type: Number, default: 30 },
      saud: { type: Number, default: 30 },
    },
    salaryConfig: {
      teacherShare: { type: Number, default: 70 },
      academyShare: { type: Number, default: 30 },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Configuration", configurationSchema);
