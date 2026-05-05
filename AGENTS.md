# Edwardian Academy ERP — Agent Context & Runbook

> **READ THIS FIRST** if you are an agent working on this project. This file contains critical context, architecture details, recent fixes, and deployment instructions to avoid breaking the production system.

---

## 1. Project Overview

**Edwardian Academy ERP** is a full-stack school management system with:
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Deployment:** VPS (Hostinger) with PM2 + Nginx
- **Domains:**
  - Frontend: `https://erp.edwardiansacademy.com`
  - API: `https://api.edwardiansacademy.com`
  - Public site: `https://edwardiansacademy.com`

---

## 2. Repository Structure

```
edwardian-academy-erp/
├── backend/                    # Node.js API
│   ├── controllers/            # Business logic
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # Express routes
│   ├── middleware/             # Auth, validation
│   ├── scripts/                # DB seeds, migrations
│   ├── server.js               # Entry point (port 5000)
│   └── .env                    # Production env (NOT in git)
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── pages/              # Page components
│   │   ├── components/         # Reusable UI
│   │   ├── lib/api.ts          # API client functions
│   │   ├── config/api.ts       # API URL config (runtime detection)
│   │   └── utils/apiConfig.ts  # Alternative API config utility
│   ├── dist/                   # Production build output
│   └── .env                    # Production build env
├── AGENTS.md                   # This file
└── package.json
```

---

## 3. Critical Production Info

### VPS Access
```bash
ssh root@187.127.108.180
```

### File Locations on VPS
| Component | Path |
|-----------|------|
| Full repo | `/var/www/edwardian-academy-erp` |
| Backend | `/var/www/edwardian-academy-erp/backend` |
| Frontend source | `/var/www/edwardian-academy-erp/frontend` |
| Deployed frontend | `/var/www/edwardian-frontend` |
| PM2 logs | `/root/.pm2/logs/` |

### PM2 Process
```bash
pm2 list                 # Check status
pm2 logs edwardian-api   # View logs
pm2 restart edwardian-api # Restart backend
```

### Nginx Config
Frontend is served from `/var/www/edwardian-frontend` via nginx.
API is proxied to `localhost:5000`.

---

## 4. Deployment Workflow

### Backend Changes
```bash
# SSH into VPS
ssh root@187.127.108.180

# Navigate to backend
cd /var/www/edwardian-academy-erp/backend

# Make changes, then restart
pm2 restart edwardian-api
```

### Frontend Changes
```bash
# SSH into VPS
ssh root@187.127.108.180

# Navigate to frontend
cd /var/www/edwardian-academy-erp/frontend

# IMPORTANT: Set production env before building
echo 'VITE_API_BASE_URL=https://api.edwardiansacademy.com' > .env

# Build
npm run build

# Deploy to web root
rm -rf /var/www/edwardian-frontend/*
cp -r dist/* /var/www/edwardian-frontend/
```

### Git Workflow
- Local repo has latest commits pushed to GitHub
- VPS repo is at `/var/www/edwardian-academy-erp` on `main` branch
- If VPS gets messed up with uncommitted changes:
  ```bash
  cd /var/www/edwardian-academy-erp
  git stash && git stash drop  # Discard local changes
  git fetch origin && git reset --hard origin/main  # Reset to clean state
  ```

---

## 5. CRITICAL FIXES APPLIED (Do NOT Revert)

### Fix 1: User Creation 500 Error (Duplicate userId)
**File:** `backend/controllers/userController.js`
**Problem:** `User.countDocuments()` generated duplicate IDs when users were deleted.
**Solution:** Find highest existing userId and increment:
```javascript
const allUsers = await User.find({ userId: /^USR-/ }).select("userId").lean();
let maxNum = 0;
for (const u of allUsers) {
  const match = u.userId.match(/USR-(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > maxNum) maxNum = num;
  }
}
const userId = `USR-${String(maxNum + 1).padStart(3, "0")}`;
```

### Fix 2: Academy Summary Expense Data
**Files:**
- `backend/controllers/reportController.js` — Added `Expense` import and expense aggregation
- `backend/routes/expenses.js` — Added `/monthly` endpoint BEFORE `/:id`
- `frontend/src/lib/api.ts` — Added params support to `getAcademySummary`
- `frontend/src/pages/Reports.tsx` — Added expense cards, monthly table, category breakdown

**What was added:**
- `totalExpenses` and `netIncome` in response
- `monthlyBreakdown` array (12 months: income, expenses, net)
- `expenseByCategory` array (category + amount)
- Year/Month filters in frontend
- Total Expenses and Net Income cards
- Monthly Income vs Expenses table
- Expense Breakdown by Category table

### Fix 3: Route Ordering in expenses.js
**CRITICAL:** The `/monthly` route MUST come BEFORE `/:id` in `backend/routes/expenses.js`.
If `/:id` is first, Express treats "monthly" as an ID parameter.

---

## 6. API Configuration (CRITICAL)

### Frontend API URL Detection
The app uses **runtime detection** (NOT build-time) for the API URL:

**Primary config:** `frontend/src/config/api.ts`
- Auto-detects production by checking `window.location.hostname`
- If hostname contains `edwardiansacademy.com` → uses `https://api.edwardiansacademy.com`
- Falls back to `VITE_API_BASE_URL` env var
- Falls back to `http://localhost:5001`

**Legacy config:** `frontend/src/lib/api.ts`
- Also has `getApiBaseUrl()` but only checks Codespaces + env var
- `frontend/src/utils/apiConfig.ts` is the centralized utility

**IMPORTANT:** When building on VPS, create `frontend/.env`:
```
VITE_API_BASE_URL=https://api.edwardiansacademy.com
```

---

## 7. Database Models

Key models in `backend/models/`:
- `User.js` — Staff/Owner/Partner accounts (has `userId`, `permissions`)
- `Student.js` — Student records with fee status
- `Teacher.js` — Teacher profiles with compensation settings
- `Class.js` — Class/tuition schedules
- `FeeRecord.js` — Fee payment transactions
- `Expense.js` — Academy expenses with partner splits
- `Transaction.js` — Financial transactions
- `Session.js` — Academic sessions/years
- `Notification.js` — In-app notifications

---

## 8. Key Controllers & Routes

| Feature | Controller | Route File |
|---------|-----------|------------|
| Authentication | `authController.js` | `auth.js` |
| Students | `studentController.js` | `students.js` |
| Teachers | `teacherController.js` | `teachers.js` |
| Classes | `classController.js` | `classes.js` |
| Finance | `financeController.js` | `finance.js` |
| Reports | `reportController.js` | `reports.js` |
| Users/Staff | `userController.js` | `users.js` |
| Expenses | — | `expenses.js` |
| Timetable | `timetableController.js` | `timetable.js` |

### Auth Middleware
- `protect` — Requires valid session/cookie
- `authorize(...roles)` — Restricts by role (OWNER, PARTNER, TEACHER, STAFF)

---

## 9. Common Pitfalls & Warnings

### ⚠️ DO NOT:
1. **Do NOT use `countDocuments()` for ID generation** — causes duplicates on deletion
2. **Do NOT place `/:id` before specific routes** like `/monthly` — Express routing order matters
3. **Do NOT forget to set `frontend/.env` before building** — otherwise API calls go to localhost
4. **Do NOT run `git reset --hard` without checking** — the previous agent destroyed work this way
5. **Do NOT modify `Reports.tsx` without reading the full file first** — it's 2800+ lines with multiple sub-components

### ⚠️ BE CAREFUL WITH:
- `Reports.tsx` — Contains `ClassReport`, `TeacherReport`, `AcademySummary`, `FinancialOverview`, `SingleSubjectEnrollments`, `SubjectTeacherFilter`. Make targeted edits only.
- `reportController.js` — Already has `getAcademySummaryReport` and `getFinancialOverview`. Don't duplicate.
- Frontend builds — Always check for `export default` at the end of pages.

---

## 10. Recent Architecture Decisions

### User ID Format
- Format: `USR-001`, `USR-002`, etc.
- Generation: Find max existing + 1 (NOT count + 1)
- Regex pattern: `/USR-(\d+)/`

### Expense Split System
- Expenses can be split among partners (waqar/zahid/saud or dynamic)
- Stored in `Expense.shares` array
- Unpaid shares tracked in `User.expenseDebt`

### Finance Flow
1. Student pays fee → `FeeRecord` created
2. Teacher share calculated → `Transaction` created for teacher payout
3. Academy pool = Collected - Teacher payouts
4. Expenses deducted from academy pool
5. Daily closing summarizes everything

---

## 11. Environment Variables

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/edwardian-erp
JWT_SECRET=...
NODE_ENV=production
FRONTEND_URL=https://erp.edwardiansacademy.com
```

### Frontend `.env`
```env
VITE_API_BASE_URL=https://api.edwardiansacademy.com
```

---

## 12. Testing Checklist After Changes

Before telling the user "everything is done", verify:
- [ ] Dashboard loads without errors (check console)
- [ ] Students page loads
- [ ] Finance page loads
- [ ] Reports → Class Report works
- [ ] Reports → Teacher Report works
- [ ] Reports → Academy Summary loads (no 500 errors)
- [ ] User creation works (test creating a new staff member)
- [ ] PM2 status shows `online` with low restart count (`↺` should not increase)

---

## 13. Emergency Rollback

If everything breaks:
```bash
ssh root@187.127.108.180
cd /var/www/edwardian-academy-erp
git stash && git stash drop  # Remove uncommitted changes
git fetch origin && git reset --hard origin/main  # Reset to last known good commit
# Rebuild frontend and restart backend as per Section 4
```

**Last known good commit:** `1bdfb5a` (chore: remove tracked env files) or `fdae714` (feat: finalize deployment)

---

## 14. Contact / Ownership

- **Owner:** Waqar Baig
- **Role:** OWNER (full permissions)
- **System Admin:** Genius Admin

---

*Last updated: May 4, 2026*
*Previous agent nearly destroyed the system by making uncommitted changes directly on the VPS, breaking the frontend build, and leaving the backend unstable. ALWAYS commit changes, rebuild carefully, and verify before declaring success.*
