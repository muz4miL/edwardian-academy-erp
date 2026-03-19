# Production-Ready Financial Architecture - Testing Guide

This document provides comprehensive test scenarios to verify the unified financial architecture implementation.

## Prerequisites

Before testing:
1. ✅ Run ghost purge script: `node backend/scripts/purge-ghost-partners.js`
2. ✅ Run migration script: `node backend/scripts/migrate-transaction-splitdetails.js`
3. ✅ Backup database
4. ✅ Test in staging environment first

---

## Test 1: Ghost Purge - No More Double Entries ✅

**Objective**: Verify that deleted partners instantly vanish from Configuration page

### Steps:
1. Navigate to Teachers tab
2. Find a teacher with role: `PARTNER` and status: `Active`
3. Note their name (e.g., "Dr. Zahid Khan")
4. Navigate to Configuration page
5. Verify partner appears in "System Partners & Owner" section
6. Verify partner appears in "Expense Split" with some percentage
7. Verify partner appears in "Academy Revenue Share Split" with some percentage
8. Go back to Teachers tab
9. **Delete the partner teacher**
10. Navigate back to Configuration page (refresh)

### Expected Results:
- ✅ Partner **instantly vanishes** from Configuration page
- ✅ No ghost entry visible
- ✅ Expense splits auto-redistribute among remaining partners
- ✅ Academy revenue splits auto-redistribute among remaining partners
- ✅ Totals remain at 100%
- ✅ If only ONE OWNER remains, they get 100% automatically
- ✅ Console logs show: `🧹 Purging stale entry: [Partner Name]`

### Verification Queries:
```javascript
// In browser console or MongoDB:
// Check Configuration document
db.configurations.findOne({}, { expenseShares: 1, academyShareSplit: 1 })

// Should NOT contain deleted partner's userId
```

---

## Test 2: Dynamic Addition - Real-Time Sync ✅

**Objective**: Verify partners added to Teachers collection appear in Configuration

### Steps:
1. Navigate to Teachers tab
2. **Create new teacher** with:
   - Name: "Test Partner"
   - Role: `PARTNER`
   - Status: `Active`
   - Subject: Any
3. Navigate to Configuration page (refresh)
4. Check "System Partners & Owner" section
5. **Set their share** in Expense Split to 10%
6. **Set their share** in Academy Revenue to 10%
7. Adjust other partners to maintain 100% total
8. Click "Save Configuration"
9. Refresh page
10. Go back to Teachers tab
11. **Delete "Test Partner"**
12. Navigate to Configuration page (refresh)

### Expected Results:
- ✅ New partner appears immediately in Configuration after refresh
- ✅ Shows with 0% default share initially
- ✅ Can modify their percentage
- ✅ Save button activates on ANY change
- ✅ After deletion, partner vanishes immediately
- ✅ Owner returns to previous percentage (auto-redistributed)

---

## Test 3: 100% Teaching Income - Owner/Partner Direct Flow ✅

**Objective**: Verify Owner/Partner teachers receive 100% of fee revenue to their wallet

### Setup:
- Ensure Owner has a Teacher profile with subject (e.g., "Chemistry")
- Create a class where Owner teaches Chemistry
- Have academyShareSplit configured (e.g., Owner 50%, Partner1 30%, Partner2 20%)

### Steps:
1. Navigate to Students tab
2. **Admit new student** to the class taught by Owner
3. Set total fee: 10,000 PKR
4. Note the student's name
5. Go to student detail page
6. Click "Collect Fee"
7. Enter amount: 10,000 PKR
8. Enter month: "March 2026"
9. Submit payment
10. Navigate to Owner Dashboard
11. Check "Floating Cash" amount
12. Check "Tuition Revenue" breakdown
13. Open browser console
14. Check logs for transaction creation

### Expected Results:
- ✅ Owner receives **10,000 PKR in Floating Cash** (100%)
- ✅ "Tuition Revenue" shows 10,000 PKR
- ✅ Academy Pool = **0 PKR** for this transaction
- ✅ Transaction has `status: "FLOATING"`
- ✅ Transaction has `category: "Tuition"`
- ✅ proofMetadata shows:
  ```json
  {
    "revenueMode": "TUITION",
    "teacherDeductions": 0,
    "netPoolBeforeSplit": 10000,
    "calculationProof": "PKR 10000 (total fee) × 50% (OWNER share) = PKR 5000"
  }
  ```
- ✅ Console logs: `💰 TUITION MODE: Owner/Partner class detected`

---

## Test 4: Academy Pool Split - Regular Teacher ✅

**Objective**: Verify academy pool splits correctly among Owner/Partners

### Setup:
- Regular teacher (NOT Owner/Partner) with 70/30 percentage split
- Teacher teaches Biology in a class
- academyShareSplit: Owner 50%, Partner1 30%, Partner2 20%

### Steps:
1. Navigate to Students tab
2. **Admit new student** to the class
3. Set total fee: 10,000 PKR
4. Go to student detail page
5. Click "Collect Fee"
6. Enter amount: 10,000 PKR
7. Submit payment
8. Navigate to Teacher Payroll Report
9. Find the regular teacher
10. Verify their earnings
11. Navigate to Owner Dashboard
12. Check "Floating Cash"
13. Navigate to Partner Dashboard
14. Check their "Floating Cash"

### Expected Results:
- ✅ Regular teacher gets **7,000 PKR** (70% of 10,000)
- ✅ Academy Pool = **3,000 PKR** (30% of 10,000)
- ✅ Owner gets **1,500 PKR** floating (50% of 3,000)
- ✅ Partner 1 gets **900 PKR** floating (30% of 3,000)
- ✅ Partner 2 gets **600 PKR** floating (20% of 3,000)
- ✅ Sum: 7,000 + 1,500 + 900 + 600 = **10,000 PKR** (perfect accounting)
- ✅ proofMetadata shows:
  ```json
  {
    "teacherDeductions": 7000,
    "netPoolBeforeSplit": 3000,
    "stakeholderPercentage": "50% of Academy Pool",
    "calculationProof": "PKR 10000 (Biology) - PKR 7000 (teacher cuts) = PKR 3000 (pool) × 50% = PKR 1500"
  }
  ```

---

## Test 5: Mixed Compensation Waterfall ✅

**Objective**: Verify complex scenario with multiple teacher types in same class

### Setup:
- Class with 3 subjects: Chemistry, Biology, Physics
- Chemistry: Taught by Owner (100% teaching income)
- Biology: Taught by Partner (100% teaching income)
- Physics: Taught by Regular Teacher with 70/30 split

### Steps:
1. Create class with above configuration
2. Admit student with total fee: 15,000 PKR (5,000 per subject)
3. Collect full fee: 15,000 PKR
4. Check all dashboards and payroll reports

### Expected Results:
- ✅ Owner gets **5,000 PKR** (100% of Chemistry) - FLOATING
- ✅ Partner gets **5,000 PKR** (100% of Biology) - FLOATING
- ✅ Regular teacher gets **3,500 PKR** (70% of Physics) - FLOATING
- ✅ Academy Pool = **1,500 PKR** (30% of Physics only)
- ✅ Pool splits among stakeholders per configuration:
  - If Owner 50%: gets **750 PKR** additional
  - If Partner 30%: gets **450 PKR** additional
  - Remaining stakeholders: **300 PKR**
- ✅ Total Owner earnings: 5,000 + 750 = **5,750 PKR**
- ✅ Total Partner earnings: 5,000 + 450 = **5,450 PKR**
- ✅ Sum verification: 5,750 + 5,450 + 3,500 + 300 = **15,000 PKR** ✅

---

## Test 6: Student Withdrawal - Cascade Cleanup ✅

**Objective**: Verify student deletion triggers proper financial reversal

### Steps:
1. Admit new test student
2. Collect fees (e.g., 8,000 PKR)
3. Verify revenue appears in dashboards
4. Note "Floating Cash" amounts for all stakeholders
5. Navigate to student detail page
6. Click "Delete Student" or "Withdraw"
7. Confirm deletion
8. Refresh all dashboards
9. Check Teacher Payroll Report
10. Check DailyRevenue collection in database

### Expected Results:
- ✅ Student marked as `status: "Withdrawn"`
- ✅ All pending FeeRecords marked as `REFUNDED`
- ✅ REFUND transactions created for paid fees
- ✅ DailyRevenue entries for this student marked as `CANCELLED`
- ✅ Negative adjustment entries created to reverse uncollected floating cash
- ✅ Dashboard "Floating Cash" immediately decreases by refunded amount
- ✅ Student no longer appears in:
  - Total expected revenue calculations
  - Active student count
  - Floating cash projections
- ✅ Console logs show:
  ```
  🗑️ Deleting student: [Name]
  ✅ Marked 2 pending fee records as REFUNDED
  ✅ Created 1 REFUND transactions (total: 8000 PKR)
  ✅ Created 3 reversal entries in DailyRevenue
  ✅ Marked student as Withdrawn
  ```

### Database Verification:
```javascript
// Check student status
db.students.findOne({ _id: studentId }, { status: 1, withdrawnAt: 1 })
// Should show: { status: "Withdrawn", withdrawnAt: ISODate(...) }

// Check DailyRevenue entries
db.dailyrevenues.find({ studentRef: studentId })
// Should show CANCELLED status and WITHDRAWAL_ADJUSTMENT entries
```

---

## Test 7: Percentage Teacher Payroll Report ✅

**Objective**: Verify Teacher Payroll Report shows accurate earnings for percentage teachers

### Steps:
1. Ensure regular teacher has percentage compensation (e.g., 70/30)
2. Collect fees for multiple students in their class
3. Navigate to Reports → Teacher Payroll
4. Select the teacher
5. Select date range (current month)
6. View report

### Expected Results:
- ✅ Report shows **NOT 0 PKR**
- ✅ Shows exact breakdown:
  - Student Name | Class | Subject | Fee Amount | Teacher Share
- ✅ "Total Owed" matches sum of teacher shares from transactions
- ✅ Includes all students' payments
- ✅ Matches transactions in database:
  ```javascript
  db.transactions.find({
    type: "INCOME",
    category: "Tuition",
    "splitDetails.teacherId": teacherId,
    status: { $in: ["FLOATING", "VERIFIED"] }
  })
  ```
- ✅ Console shows: `✅ Found X transactions for teacher [Name]`

---

## Edge Cases to Test 🧪

### Edge Case 1: Single OWNER Scenario
- Delete all partners, leaving only ONE OWNER
- Configuration should auto-assign 100% to OWNER
- All academy pool goes to OWNER

### Edge Case 2: Zero Academy Pool
- Owner teaches all subjects in a class
- Academy pool should be 0 PKR
- No stakeholder distributions created

### Edge Case 3: Invalid Split Totals
- Try to save Configuration with splits totaling 95%
- Frontend should show error: "Must total 100%"
- Save button should be disabled
- Backend should reject with 400 error

### Edge Case 4: Partner Without Teacher
- Manually create User with role PARTNER but no teacherId
- Configuration page should NOT show them (ghost filter)
- Run purge script → User should be deleted

### Edge Case 5: Inactive Teacher
- Set teacher status to "Inactive"
- Configuration page should NOT show them
- Existing splits should be purged automatically

---

## Automated Test Checklist ✅

For CI/CD pipeline:

```javascript
// Test 1: Ghost Purge
- [ ] Create orphaned PARTNER User
- [ ] Verify Configuration excludes them
- [ ] Run purge script
- [ ] Verify User deleted

// Test 2: Active-Only Filtering
- [ ] Create Teacher with status "Inactive"
- [ ] Create linked User with role PARTNER
- [ ] Verify Configuration excludes them
- [ ] Set Teacher to "Active"
- [ ] Verify Configuration includes them

// Test 3: Cascade Deletion
- [ ] Delete Teacher with linked PARTNER User
- [ ] Verify PARTNER User deleted
- [ ] Verify Configuration splits cleaned
- [ ] Verify totals redistribute to 100%

// Test 4: Student Cascade
- [ ] Delete student with paid fees
- [ ] Verify FeeRecords marked REFUNDED
- [ ] Verify REFUND transactions created
- [ ] Verify DailyRevenue reversed

// Test 5: Split Validation
- [ ] POST /api/config with splits totaling 95%
- [ ] Verify 400 error returned
- [ ] Verify splits unchanged in database
```

---

## Performance Benchmarks 🚀

Expected performance metrics:

| Operation | Target Time | Acceptable Limit |
|-----------|-------------|------------------|
| Ghost Purge Script | < 5 seconds | < 30 seconds |
| Migration Script | < 10 seconds | < 1 minute |
| /partners endpoint | < 200ms | < 500ms |
| collectFee function | < 1 second | < 3 seconds |
| Configuration save | < 500ms | < 2 seconds |
| Student deletion cascade | < 2 seconds | < 5 seconds |

---

## Troubleshooting Common Issues 🔧

### Issue: Floating Cash Not Updating
**Possible Causes**:
- Transaction not created with status "FLOATING"
- DailyRevenue entry not created
- userId mismatch between Transaction and DailyRevenue

**Solution**:
```javascript
// Check transactions
db.transactions.find({
  collectedBy: userId,
  status: "FLOATING",
  date: { $gte: new Date("2026-03-01") }
}).pretty()

// Check DailyRevenue
db.dailyrevenues.find({
  partner: userId,
  status: "UNCOLLECTED"
}).pretty()
```

### Issue: Teacher Payroll Shows 0 PKR
**Possible Causes**:
- Missing splitDetails.teacherId in transactions
- Teacher ID mismatch
- Wrong date range selected

**Solution**:
1. Run migration script: `node backend/scripts/migrate-transaction-splitdetails.js`
2. Verify transactions have teacherId:
```javascript
db.transactions.find({
  type: "INCOME",
  "splitDetails.teacherId": { $exists: false }
})
```

### Issue: Configuration Splits Don't Total 100%
**Possible Causes**:
- Manual database modification
- Race condition during partner deletion
- Rounding errors

**Solution**:
1. Navigate to Configuration page
2. Manually adjust percentages to total 100%
3. Click Save
4. OR run ghost purge script for auto-redistribution

---

## Success Criteria ✅

All tests pass if:
- ✅ No ghost entries visible in Configuration
- ✅ All splits total exactly 100%
- ✅ Every PKR is accounted for (sum check)
- ✅ Teacher Payroll Reports show actual earnings
- ✅ Student deletion doesn't leave orphaned revenue
- ✅ FLOATING transactions have complete proofMetadata
- ✅ Dashboard numbers update in real-time
- ✅ No console errors during operations

---

**Testing Completed By**: _______________
**Date**: _______________
**Environment**: [ ] Staging [ ] Production
**Status**: [ ] All Pass [ ] Issues Found

**Notes**:
_______________________________
_______________________________
