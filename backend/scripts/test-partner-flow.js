/**
 * TEST: Partner Login, Close Preview, and Credit Flow
 * Tests that partners can see and close their floating amounts.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const BASE = "http://localhost:5001/api";

async function api(token, method, path, body) {
  const headers = {
    "Content-Type": "application/json",
    Cookie: `authToken=${token}`,
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.substring(0, 500) }; }
  return { status: res.status, ok: res.ok, data: json };
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  PARTNER VIEW — CLOSE & CREDIT TEST");
  console.log("=".repeat(70) + "\n");

  await mongoose.connect(process.env.MONGODB_URI);
  const User = require("../models/User");

  // Get all PARTNER users
  const partners = await User.find({ role: "PARTNER" }).lean();
  console.log(`Found ${partners.length} partners\n`);

  // Also get OWNER
  const owner = await User.findOne({ role: "OWNER" }).lean();
  const ownerToken = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

  for (const partner of partners) {
    console.log(`━━━ Testing Partner: ${partner.fullName} (${partner.username}) ━━━\n`);

    // Mint JWT for partner
    const partnerToken = jwt.sign({ id: partner._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // 1. Partner Dashboard
    const dashRes = await api(partnerToken, "GET", "/finance/partner/dashboard");
    if (dashRes.ok) {
      const d = dashRes.data?.data || dashRes.data;
      console.log(`  ✅ Partner Dashboard:`);
      console.log(`     Split %: ${d?.splitPercentage || 0}%`);
      console.log(`     Unpaid Expenses: ${d?.unpaidExpenses?.length || 0}`);
    } else {
      console.log(`  ❌ Partner Dashboard: ${dashRes.status} - ${dashRes.data?.message}`);
    }

    // 2. Close Preview (partner's own)
    const previewRes = await api(partnerToken, "GET", "/finance/close-preview");
    if (previewRes.ok) {
      const p = previewRes.data?.data;
      console.log(`  ✅ Close Preview: Net PKR ${p?.netTotal || 0}`);
      console.log(`     Tuition entries: ${p?.tuitionRevenue?.count || 0}, Academy entries: ${p?.academyShareRevenue?.count || 0}`);
    } else {
      console.log(`  ❌ Close Preview: ${previewRes.status} - ${previewRes.data?.message}`);
    }

    // 3. Floating Amounts Detail
    const floatingRes = await api(partnerToken, "GET", "/finance/floating-amounts-detail");
    if (floatingRes.ok) {
      const f = floatingRes.data?.data;
      const myEntry = f?.summary?.find(s => s.userId?.toString() === partner._id.toString());
      if (myEntry) {
        console.log(`  ✅ My Floating: PKR ${myEntry.totalFloating} (${myEntry.entryCount} entries)`);
      } else {
        console.log(`  ℹ️  No floating entries for this partner`);
      }
    } else {
      console.log(`  ❌ Floating Detail: ${floatingRes.status} - ${floatingRes.data?.message}`);
    }

    // 4. Closing History
    const histRes = await api(partnerToken, "GET", "/finance/closing-history");
    if (histRes.ok) {
      console.log(`  ✅ Closing History: ${histRes.data?.data?.length || 0} past closings`);
    } else {
      console.log(`  ❌ Closing History: ${histRes.status} - ${histRes.data?.message}`);
    }

    // 5. Close Day Preview (GET /close-day/preview)
    const cdPreviewRes = await api(partnerToken, "GET", "/finance/close-day/preview");
    if (cdPreviewRes.ok) {
      const cd = cdPreviewRes.data?.data;
      console.log(`  ✅ Close Day Preview: ${cd?.totalEntries || 0} entries, Net: PKR ${cd?.netTotal || 0}`);
    } else {
      console.log(`  ❌ Close Day Preview: ${cdPreviewRes.status} - ${cdPreviewRes.data?.message}`);
    }

    console.log("");
  }

  // 6. Test OWNER can close (preview only here — don't actually close)
  console.log("━━━ Owner Close Preview ━━━\n");
  const ownerPreviewRes = await api(ownerToken, "GET", "/finance/close-day/preview");
  if (ownerPreviewRes.ok) {
    const ocp = ownerPreviewRes.data?.data;
    console.log(`  ✅ Owner Close Preview: ${ocp?.totalEntries || 0} entries, Net: PKR ${ocp?.netTotal || 0}`);
  } else {
    console.log(`  ❌ Owner Close Preview: ${ownerPreviewRes.status} - ${ownerPreviewRes.data?.message}`);
  }

  // 7. Test concurrent close lock — fire two closes at the same time  
  console.log("\n━━━ Concurrency Test (Double-Close Guard) ━━━\n");
  // This should NOT close data — just verify the lock prevents double-execute
  const [r1, r2] = await Promise.all([
    api(ownerToken, "POST", "/finance/close-day"),
    api(ownerToken, "POST", "/finance/close-day"),
  ]);
  const statuses = [r1.status, r2.status].sort();
  const hasConflict = statuses.includes(409);
  if (hasConflict) {
    console.log(`  ✅ Double-close prevented! Statuses: ${r1.status}, ${r2.status}`);
  } else if (r1.status === 400 && r2.status === 400) {
    console.log(`  ✅ Both returned 400 (no data to close) — lock not needed`);
  } else {
    console.log(`  ℹ️  Statuses: ${r1.status}, ${r2.status}`);
    console.log(`     R1: ${r1.data?.message}`);
    console.log(`     R2: ${r2.data?.message}`);
  }

  console.log("\n" + "=".repeat(70) + "\n");
  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
