require("dotenv").config();
const mongoose = require("mongoose");

const FeeRecord = require("../models/FeeRecord");
const DailyRevenue = require("../models/DailyRevenue");

const toSafeInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
};

async function validateAllDistributions() {
  const paidFees = await FeeRecord.find({ status: "PAID" }).lean();

  let feeTotal = 0;
  let distributedTotal = 0;
  let discrepancies = 0;
  const errors = [];

  for (const fee of paidFees) {
    const feeAmount = toSafeInt(fee.amount);
    feeTotal += feeAmount;

    const breakdownTotal = (fee.subjectBreakdown || []).reduce(
      (sum, item) => sum + toSafeInt(item.subjectPrice),
      0,
    );

    const fallbackDistributed =
      toSafeInt(fee.splitBreakdown?.teacherShare) +
      toSafeInt(fee.splitBreakdown?.academyShare) +
      toSafeInt(fee.splitBreakdown?.ownerPartnerShare);

    const computedDistributed = breakdownTotal > 0 ? breakdownTotal : fallbackDistributed;
    distributedTotal += computedDistributed;

    if (feeAmount !== computedDistributed) {
      discrepancies += 1;
      errors.push({
        feeRecordId: String(fee._id),
        receiptNumber: fee.receiptNumber || null,
        feeAmount,
        distributedAmount: computedDistributed,
        delta: feeAmount - computedDistributed,
      });
    }
  }

  const dailyRevenueAgg = await DailyRevenue.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const dailyRevenueTotal = toSafeInt(dailyRevenueAgg[0]?.total || 0);

  return {
    success: discrepancies === 0,
    summary: {
      paidFeeRecords: paidFees.length,
      discrepancies,
      totalFeesCollected: feeTotal,
      totalDistributedFromFeeRecords: distributedTotal,
      totalDailyRevenue: dailyRevenueTotal,
      totalDiscrepancy: feeTotal - distributedTotal,
    },
    errors,
  };
}

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("Missing MONGODB_URI/MONGO_URI in environment");
    }
    await mongoose.connect(mongoUri);
    const result = await validateAllDistributions();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("Validation failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
