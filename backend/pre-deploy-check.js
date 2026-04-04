/**
 * Final system verification before deployment
 * Tests: passwords, routes, monthly revenue, settlements
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');

const API = 'http://localhost:5001/api';

function api(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'localhost', port: 5001, path: `/api${path}`, headers: { 'Content-Type': 'application/json', ...(opts.cookie ? { Cookie: opts.cookie } : {}) }, ...opts };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }); } catch { resolve({ status: res.statusCode, data }); } });
    });
    req.on('error', reject);
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

async function loginAs(username, password) {
  const result = await api('/auth/login', { method: 'POST', body: { username, password } });
  const cookie = result.headers['set-cookie']?.[0]?.split(';')[0] || '';
  return { success: result.data?.success, user: result.data?.user, cookie, message: result.data?.message };
}

(async () => {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   EDWARDIAN ACADEMY ERP — PRE-DEPLOYMENT CHECKLIST  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./models/User');
  const Teacher = require('./models/Teacher');
  const FeeRecord = require('./models/FeeRecord');
  const AcademySettlement = require('./models/AcademySettlement');

  let passed = 0, failed = 0;
  
  const pass = (msg) => { console.log(`  ✅ ${msg}`); passed++; };
  const fail = (msg) => { console.log(`  ❌ FAIL: ${msg}`); failed++; };

  // ─── 1. Password Sync ───────────────────────────────────────────
  console.log('── 1. PASSWORD SYNC CHECK ───────────────────────────────');
  const users = await User.find({ role: { $in: ['OWNER', 'PARTNER'] } }).select('+password');
  for (const u of users) {
    if (!u.teacherId) continue;
    const teacher = await Teacher.findById(u.teacherId).select('plainPassword').lean();
    if (!teacher?.plainPassword) continue;
    const matches = await bcrypt.compare(teacher.plainPassword, u.password);
    if (matches) {
      pass(`${u.fullName} (${u.role}) — password synced ✓`);
    } else {
      fail(`${u.fullName} (${u.role}) — password MISMATCH! Fix needed`);
    }
  }

  // ─── 2. Login Tests ─────────────────────────────────────────────
  console.log('\n── 2. LOGIN TESTS ───────────────────────────────────────');
  
  const ownerLogin = await loginAs('owner', 'Owner@2024');
  if (ownerLogin.success) pass(`Owner login: ${ownerLogin.user?.fullName} ✓`);
  else fail(`Owner login failed: ${ownerLogin.message}`);

  const partner1Login = await loginAs('shah_saud', 'Srm9nNjQ');
  if (partner1Login.success) pass(`Partner "Shah saud" login ✓`);
  else fail(`Partner "Shah saud" login failed: ${partner1Login.message}`);

  const partner2Login = await loginAs('mohammad_zahid', 'MruTXpYF');
  if (partner2Login.success) pass(`Partner "Mohammad Zahid" login ✓`);
  else fail(`Partner "Mohammad Zahid" login failed: ${partner2Login.message}`);

  // ─── 3. Monthly Revenue Fix ─────────────────────────────────────
  console.log('\n── 3. MONTHLY REVENUE (createdAt fix) ───────────────────');
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const result = await FeeRecord.aggregate([
    { $match: { status: 'PAID', createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const monthlyRevenue = result[0]?.total || 0;
  if (monthlyRevenue > 0) pass(`Monthly revenue: PKR ${monthlyRevenue.toLocaleString()} (non-zero) ✓`);
  else fail(`Monthly revenue is 0 — check FeeRecord data`);

  // ─── 4. Dashboard Stats API ─────────────────────────────────────
  console.log('\n── 4. DASHBOARD STATS API ───────────────────────────────');
  if (ownerLogin.cookie) {
    const stats = await api('/finance/dashboard-stats', { method: 'GET', cookie: ownerLogin.cookie });
    if (stats.data?.success) {
      const d = stats.data.data;
      pass(`Dashboard stats responds ✓`);
      if (d.monthlyFeesCollected > 0) pass(`monthlyFeesCollected: PKR ${d.monthlyFeesCollected.toLocaleString()} ✓`);
      else fail(`monthlyFeesCollected is 0 — createdAt fix may not have worked`);
    } else fail(`Dashboard stats API failed: ${JSON.stringify(stats.data).slice(0,100)}`);
  }

  // ─── 5. Partner/settlements Route ───────────────────────────────
  console.log('\n── 5. PARTNER/SETTLEMENTS ROUTE ─────────────────────────');
  if (partner2Login.cookie) {
    const pSettlements = await api('/finance/partner/settlements', { method: 'GET', cookie: partner2Login.cookie });
    if (pSettlements.status === 200 && pSettlements.data?.success) {
      pass(`/finance/partner/settlements route exists ✓`);
      pass(`Returns ${pSettlements.data.data?.length || 0} settlement records ✓`);
    } else fail(`/finance/partner/settlements returned ${pSettlements.status}: ${JSON.stringify(pSettlements.data).slice(0,100)}`);
  }

  // ─── 6. Academy Settlements Summary (Owner-only) ────────────────
  console.log('\n── 6. ACADEMY SETTLEMENTS (OWNER VIEW) ──────────────────');
  if (ownerLogin.cookie) {
    const sum = await api('/finance/academy-settlements/summary', { method: 'GET', cookie: ownerLogin.cookie });
    if (sum.data?.success) {
      const partners = sum.data.data?.partners || [];
      const ownerInList = partners.find(p => p.partnerRole === 'OWNER');
      if (!ownerInList) pass(`Owner excluded from settlements UI (correct) ✓`);
      else fail(`Owner still appears in settlements list — should be filtered by frontend`);
      const partnerOnly = partners.filter(p => p.partnerRole !== 'OWNER');
      pass(`${partnerOnly.length} partner(s) with pending settlements: ${partnerOnly.map(p => p.partnerName).join(', ')} ✓`);
    } else fail(`Academy settlements summary failed`);
  }

  // ─── 7. Partner Dashboard Route ─────────────────────────────────
  console.log('\n── 7. PARTNER DASHBOARD API ─────────────────────────────');
  if (partner2Login.cookie) {
    const pdash = await api('/finance/partner/dashboard', { method: 'GET', cookie: partner2Login.cookie });
    if (pdash.status === 200 && pdash.data?.success) pass(`Partner dashboard API responds ✓`);
    else fail(`Partner dashboard API failed: ${pdash.status}`);
    
    const ppayout = await api('/finance/partner/payout-summary', { method: 'GET', cookie: partner2Login.cookie });
    if (ppayout.status === 200 && ppayout.data?.success) pass(`Partner payout-summary API responds ✓`);
    else fail(`Partner payout-summary failed: ${ppayout.status}`);
    
    const pclose = await api('/finance/close-preview', { method: 'GET', cookie: partner2Login.cookie });
    if (pclose.status === 200 && pclose.data?.success) pass(`Close-preview API accessible by partner ✓`);
    else fail(`Close-preview failed for partner: ${pclose.status}`);
  }

  // ─── Summary ────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed${' '.repeat(36 - String(passed).length - String(failed).length)}║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  
  if (failed === 0) {
    console.log('\n🎉 ALL CHECKS PASSED — SYSTEM READY FOR DEPLOYMENT!\n');
  } else {
    console.log(`\n⚠️  ${failed} check(s) need attention before deployment.\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
})().catch(err => { console.error('Script error:', err.message); process.exit(1); });
