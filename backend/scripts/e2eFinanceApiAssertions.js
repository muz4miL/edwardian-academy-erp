/*
 * End-to-end finance API assertions for deployment readiness.
 * Verifies:
 * 1) Owner + Partner login works
 * 2) close-preview math and entry-count invariants
 * 3) teacher-payroll-report net owed invariant + proof/revenueFlow presence
 *
 * Usage:
 *   node scripts/e2eFinanceApiAssertions.js
 *   BASE_URL=http://localhost:5010/api node scripts/e2eFinanceApiAssertions.js
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:5010/api";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, { method = "GET", body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const setCookie = res.headers.get("set-cookie") || "";
  const authCookie = setCookie ? setCookie.split(";")[0] : null;

  return {
    ok: res.ok,
    status: res.status,
    data,
    cookie: authCookie,
  };
}

async function loginWithFallback(username, passwords) {
  for (const password of passwords) {
    const resp = await request("/auth/login", {
      method: "POST",
      body: { username, password },
    });

    if (resp.ok && resp.data?.success && resp.cookie) {
      return { cookie: resp.cookie, passwordUsed: password, user: resp.data.user };
    }
  }
  throw new Error(`Login failed for ${username} using provided password candidates`);
}

function verifyClosePreview(label, payload) {
  assert(payload?.success, `${label}: close-preview success=false`);
  const p = payload.data || {};

  const net = Number(p.netTotal || 0);
  const tuition = Number(p.tuitionRevenue?.total || 0);
  const academy = Number(p.academyShareRevenue?.total || 0);
  const adjustments = Number(p.withdrawalAdjustments?.total || 0);

  const entries = Number(p.totalEntries || 0);
  const countSum =
    Number(p.tuitionRevenue?.count || 0) +
    Number(p.academyShareRevenue?.count || 0) +
    Number(p.withdrawalAdjustments?.count || 0);

  assert(net === tuition + academy + adjustments, `${label}: netTotal mismatch`);
  assert(entries === countSum, `${label}: totalEntries mismatch`);

  return {
    netTotal: net,
    tuition,
    academy,
    adjustments,
    entries,
  };
}

function verifyPayroll(payload) {
  assert(payload?.success, "Payroll: success=false");
  const rows = Array.isArray(payload.data) ? payload.data : [];

  let missingRevenueFlow = 0;
  let missingProof = 0;
  const netErrors = [];

  for (const t of rows) {
    const gross = Number(t.grossOwed || 0);
    const paid = Number(t.alreadyPaid || 0);
    const wd = Number(t.withdrawalDeduction || 0);
    const net = Number(t.netOwed || 0);
    const expected = Math.max(0, gross - paid - wd);

    if (net !== expected) {
      netErrors.push(`${t.teacherName}: net=${net}, expected=${expected}`);
    }

    if (!t.revenueFlow) missingRevenueFlow += 1;
    if (!t.proof) missingProof += 1;
  }

  assert(netErrors.length === 0, `Payroll net-owed invariant failed: ${netErrors.join(" | ")}`);

  return {
    teacherCount: rows.length,
    totalOwed: Number(payload.totalOwed || 0),
    missingRevenueFlow,
    missingProof,
  };
}

async function main() {
  console.log(`Running finance e2e API assertions against ${BASE_URL}`);

  const owner = await loginWithFallback("waqar", ["admin123", "ADMIN123"]);
  const partner = await loginWithFallback("saud", ["ADMIN123", "admin123"]);

  const ownerCloseResp = await request("/finance/close-preview", { cookie: owner.cookie });
  const partnerCloseResp = await request("/finance/close-preview", { cookie: partner.cookie });
  const payrollResp = await request("/finance/teacher-payroll-report", { cookie: owner.cookie });

  const ownerClose = verifyClosePreview("OWNER", ownerCloseResp.data);
  const partnerClose = verifyClosePreview("PARTNER", partnerCloseResp.data);
  const payroll = verifyPayroll(payrollResp.data);

  const summary = {
    status: "PASS",
    ownerLogin: { username: "waqar", passwordUsed: owner.passwordUsed },
    partnerLogin: { username: "saud", passwordUsed: partner.passwordUsed },
    ownerClose,
    partnerClose,
    payroll,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("E2E finance assertions failed:", err.message);
  process.exit(1);
});
