require("dotenv").config();
const mongoose = require("mongoose");

const FeeRecord = require("../models/FeeRecord");

const toSafeInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
};

async function migrateExistingData({ dryRun = true } = {}) {
  const cursor = FeeRecord.find({
    status: "PAID",
    $or: [
      { subjectBreakdown: { $exists: false } },
      { subjectBreakdown: { $size: 0 } },
      { distributionCompleted: { $ne: true } },
    ],
  }).cursor();

  let scanned = 0;
  let migrated = 0;

  for await (const fee of cursor) {
    scanned += 1;

    const amount = toSafeInt(fee.amount);
    const teacherShare = toSafeInt(fee.splitBreakdown?.teacherShare);
    const academyShare = toSafeInt(fee.splitBreakdown?.academyShare);
    const ownerPartnerShare = toSafeInt(fee.splitBreakdown?.ownerPartnerShare);

    const recoveredOwnerShare = Math.max(
      0,
      amount - teacherShare - academyShare - ownerPartnerShare,
    );

    const totalOwnerShare = ownerPartnerShare + recoveredOwnerShare;

    const defaultSubject = fee.subject || "General";

    const subjectBreakdown = [
      {
        subject: defaultSubject,
        subjectPrice: amount,
        teacherShare: Math.max(0, teacherShare - totalOwnerShare),
        academyShare,
        ownerPartnerShare: totalOwnerShare,
        compensationType: totalOwnerShare > 0 ? "owner-partner" : "percentage",
        distributionEntries: [],
        distributed: true,
      },
    ];

    if (!dryRun) {
      fee.subjectBreakdown = subjectBreakdown;
      fee.distributionCompleted = true;
      fee.distributionCompletedAt = fee.distributionCompletedAt || new Date();
      await fee.save();
    }

    migrated += 1;
  }

  return { dryRun, scanned, migrated };
}

async function run() {
  const dryRun = process.argv.includes("--commit") ? false : true;

  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("Missing MONGODB_URI/MONGO_URI in environment");
    }
    await mongoose.connect(mongoUri);
    console.log("Starting migration from session-based to subject-based pricing...");
    const result = await migrateExistingData({ dryRun });
    console.log(JSON.stringify(result, null, 2));
    console.log(dryRun ? "Dry run complete. Use --commit to apply changes." : "Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
