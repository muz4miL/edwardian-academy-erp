const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");
const DailyRevenue = require("../models/DailyRevenue");
const Configuration = require("../models/Configuration");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected for Finance Seed"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

const TODAY = new Date();
const YESTERDAY = new Date(TODAY);
YESTERDAY.setDate(YESTERDAY.getDate() - 1);
const TWO_DAYS_AGO = new Date(TODAY);
TWO_DAYS_AGO.setDate(TWO_DAYS_AGO.getDate() - 2);

async function seedFinanceTest() {
  try {
    // ── 1. Find existing Owner & Partners ──────────────────────────
    const owner = await User.findOne({ role: "OWNER" });
    const partners = await User.find({ role: "PARTNER" });

    if (!owner) {
      console.error("❌ No OWNER user found. Run seed.js first.");
      process.exit(1);
    }
    if (partners.length === 0) {
      console.error("❌ No PARTNER users found. Run seed.js first.");
      process.exit(1);
    }

    const allStakeholders = [owner, ...partners];
    console.log(`\n👥 Found ${allStakeholders.length} stakeholders:`);
    allStakeholders.forEach((u) =>
      console.log(`   ${u.role.padEnd(7)} - ${u.fullName} (${u.userId})`),
    );

    // ── 2. Check if test revenue already exists ────────────────────
    const existing = await DailyRevenue.countDocuments({
      studentName: { $regex: /^SEED-/ },
    });
    if (existing > 0) {
      console.log(
        `\n⚠️  Found ${existing} existing seed DailyRevenue entries. Skipping creation.`,
      );
      console.log("   Delete them manually or run cleanup if you want to re-seed.");
    } else {
      // ── 3. Create DailyRevenue entries ─────────────────────────
      const entries = [];

      for (const user of allStakeholders) {
        // 3a. Three TUITION_SHARE entries
        // Scenario: Student Ali paid PKR 15000, split among 3 stakeholders = 5000 each
        const tuitionStudents = [
          { name: "SEED-Ali Khan", class: "10th-A", fee: 15000, date: TODAY },
          { name: "SEED-Sara Ahmed", class: "9th-B", fee: 12000, date: YESTERDAY },
          { name: "SEED-Usman Raza", class: "11th-A", fee: 18000, date: TWO_DAYS_AGO },
        ];

        for (const s of tuitionStudents) {
          entries.push({
            partner: user._id,
            date: s.date,
            amount: Math.round(s.fee / allStakeholders.length),
            source: "TUITION",
            revenueType: "TUITION_SHARE",
            status: "UNCOLLECTED",
            className: s.class,
            studentName: s.name,
            splitDetails: {
              totalFee: s.fee,
              splitCount: allStakeholders.length,
              perPersonShare: Math.round(s.fee / allStakeholders.length),
              description: `${s.fee} PKR tuition split ${allStakeholders.length} ways`,
            },
          });
        }

        // 3b. Two ACADEMY_SHARE entries
        // Scenario: Teacher gets 70%, academy gets 30% of 20000 = 6000
        // That 6000 is split among stakeholders by percentage (40/30/30)
        const academyStudents = [
          { name: "SEED-Bilal Shah", class: "MDCAT-Batch1", totalFee: 20000, date: TODAY },
          { name: "SEED-Hina Malik", class: "ETEA-Batch2", totalFee: 15000, date: YESTERDAY },
        ];

        const academyPcts = { OWNER: 40, PARTNER: 30 };
        const pct = academyPcts[user.role] || 30;

        for (const s of academyStudents) {
          const academyPool = Math.round(s.totalFee * 0.3);
          const share = Math.round((academyPool * pct) / 100);

          entries.push({
            partner: user._id,
            date: s.date,
            amount: share,
            source: "TUITION",
            revenueType: "ACADEMY_SHARE",
            status: "UNCOLLECTED",
            className: s.class,
            studentName: s.name,
            splitDetails: {
              totalFee: s.totalFee,
              splitCount: allStakeholders.length,
              perPersonShare: share,
              description: `Academy 30% of ${s.totalFee} → ${pct}% share`,
            },
          });
        }

        // 3c. One WITHDRAWAL_ADJUSTMENT entry (negative / refund)
        entries.push({
          partner: user._id,
          date: TODAY,
          amount: -2000,
          source: "TUITION",
          revenueType: "WITHDRAWAL_ADJUSTMENT",
          status: "UNCOLLECTED",
          className: "10th-A",
          studentName: "SEED-Ali Khan",
          splitDetails: {
            totalFee: 6000,
            splitCount: allStakeholders.length,
            perPersonShare: -2000,
            description: "Refund adjustment: Ali Khan withdrew from 10th-A",
          },
        });
      }

      const created = await DailyRevenue.insertMany(entries);
      console.log(`\n✅ Created ${created.length} DailyRevenue entries`);
    }

    // ── 4. Update wallet floating balances ───────────────────────
    for (const user of allStakeholders) {
      const agg = await DailyRevenue.aggregate([
        { $match: { partner: user._id, status: "UNCOLLECTED" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const floating = agg.length > 0 ? agg[0].total : 0;

      await User.findByIdAndUpdate(user._id, {
        "walletBalance.floating": floating,
      });
      console.log(
        `💰 ${user.fullName.padEnd(20)} walletBalance.floating = ${floating}`,
      );
    }

    // ── 5. Upsert Configuration.academyShareSplit ────────────────
    let config = await Configuration.findOne();
    if (!config) {
      config = new Configuration();
      console.log("\n📝 Creating new Configuration document");
    }

    // Only update academyShareSplit if empty or missing
    if (!config.academyShareSplit || config.academyShareSplit.length === 0) {
      config.academyShareSplit = allStakeholders.map((u) => ({
        userId: u._id,
        fullName: u.fullName,
        role: u.role,
        percentage: u.role === "OWNER" ? 40 : 30,
      }));
      console.log("📊 Set academyShareSplit: OWNER 40%, each PARTNER 30%");
    } else {
      console.log("📊 academyShareSplit already configured, skipping.");
    }

    // Also populate partnerIds if empty
    if (!config.partnerIds || !config.partnerIds.waqar) {
      const waqar = allStakeholders.find((u) => u.username === "waqar");
      const zahid = allStakeholders.find((u) => u.username === "zahid");
      const saud = allStakeholders.find((u) => u.username === "saud");
      if (waqar) config.partnerIds.waqar = waqar._id;
      if (zahid) config.partnerIds.zahid = zahid._id;
      if (saud) config.partnerIds.saud = saud._id;
      console.log("🔗 Set partnerIds for waqar/zahid/saud");
    }

    await config.save();
    console.log("✅ Configuration saved");

    // ── 6. Summary ────────────────────────────────────────────────
    const totalEntries = await DailyRevenue.countDocuments({
      studentName: { $regex: /^SEED-/ },
    });
    const uncollected = await DailyRevenue.countDocuments({
      studentName: { $regex: /^SEED-/ },
      status: "UNCOLLECTED",
    });
    console.log("\n════════════════════════════════════════");
    console.log("  FINANCE SEED SUMMARY");
    console.log("════════════════════════════════════════");
    console.log(`  Total seed DailyRevenue entries: ${totalEntries}`);
    console.log(`  Uncollected entries:             ${uncollected}`);
    console.log(`  Stakeholders updated:            ${allStakeholders.length}`);
    console.log("════════════════════════════════════════\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Finance seed failed:", err);
    process.exit(1);
  }
}

seedFinanceTest();
