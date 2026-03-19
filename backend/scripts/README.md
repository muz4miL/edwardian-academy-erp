# Production-Ready Financial Architecture - Maintenance Scripts

This directory contains critical maintenance and migration scripts for the Edwardian Academy ERP financial system.

## Scripts Overview

### 1. Ghost Partner Purge (`purge-ghost-partners.js`)

**Purpose**: One-time cleanup script to remove orphaned User records that don't have corresponding active Teacher records.

**What it does**:
- Scans all Users with role `OWNER` or `PARTNER`
- Validates each against the Teachers collection
- Checks if Teacher exists and has `status: 'Active'`
- Deletes Users without valid Teacher records
- Purges deleted User IDs from Configuration splits (expenseShares, academyShareSplit)
- Auto-redistributes percentages if totals ≠ 100%

**When to run**:
- After database migrations
- When you notice ghost entries in Configuration page
- Before production deployment

**Usage**:
```bash
cd backend
node scripts/purge-ghost-partners.js
```

**Safety**: This script is destructive. It will DELETE User records. Review the console output carefully before confirming.

---

### 2. Transaction SplitDetails Migration (`migrate-transaction-splitdetails.js`)

**Purpose**: Adds missing `splitDetails.teacherId` to existing Transaction records for accurate Teacher Payroll Reports.

**What it does**:
- Finds INCOME transactions missing `splitDetails.teacherId`
- Attempts to resolve teacherId from:
  1. Transaction description (e.g., "Biology teacher share: Student Name")
  2. Existing `splitDetails.teacherName` field
  3. Related FeeRecord teachers array
  4. Subject matching with Teachers collection
- Updates transactions with resolved teacherId
- Skips Academy Share transactions (they go to Owner/Partner, not regular teachers)

**When to run**:
- After major financial system updates
- When Teacher Payroll Reports show 0 PKR for percentage teachers
- Before running financial audits

**Usage**:
```bash
cd backend
node scripts/migrate-transaction-splitdetails.js
```

**Safety**: This script only adds missing data, does not delete anything. Safe to run multiple times (idempotent).

---

## Configuration Requirements

Both scripts require:
- `.env` file with `MONGO_URI` configured
- Database connection access
- Node.js installed with all dependencies

## Validation Checklist

After running these scripts, verify:

### After Ghost Purge:
- [ ] Configuration page only shows active teachers
- [ ] Expense shares total 100%
- [ ] Academy revenue shares total 100%
- [ ] No ghost entries visible
- [ ] Single OWNER gets 100% if alone

### After Transaction Migration:
- [ ] Teacher Payroll Reports show actual earnings (not 0 PKR)
- [ ] Percentage teachers have transaction records
- [ ] Reports include student-wise breakdown
- [ ] Academy Share transactions excluded (expected)

## Troubleshooting

### Ghost Purge Issues

**Problem**: "MONGO_URI not found"
**Solution**: Ensure `.env` file exists in project root with valid MongoDB connection string

**Problem**: Script deletes OWNER
**Solution**: OWNERs without teacherId are kept (Super Admin). OWNERs WITH teacherId require active Teacher record.

**Problem**: Configuration totals don't equal 100%
**Solution**: Script auto-redistributes equally. Manual adjustment may be needed in Configuration page.

### Transaction Migration Issues

**Problem**: "Could not resolve teacherId"
**Solution**: Some transactions may not have enough data to resolve. Check:
- Transaction description format
- splitDetails.teacherName spelling matches Teacher.name
- Related FeeRecord exists

**Problem**: Academy Share transactions show as "failed to resolve"
**Solution**: This is expected! Academy Share goes to Owner/Partners, not regular teachers.

## Related Files

- `/backend/routes/config.js` - Partners endpoint (queries Teachers collection)
- `/backend/controllers/teacherController.js` - Cascade deletion logic
- `/backend/controllers/studentController.js` - collectFee with FLOATING transactions
- `/backend/helpers/revenueEngine.js` - Revenue calculation logic
- `/frontend/src/pages/Configuration.tsx` - Dynamic partner sync UI

## Architecture Notes

### Unified Stakeholder Model
- Teachers collection = SINGLE SOURCE OF TRUTH
- Partners MUST have valid teacherId
- OWNERs CAN exist without teacherId (Super Admin)
- Configuration page filters by `status: 'Active'`

### Financial Flow
1. Student pays fee → `collectFee` function
2. Auto-detect TUITION vs ACADEMY mode
3. Create FLOATING transactions for stakeholders
4. Include comprehensive `proofMetadata` for audit trail
5. Owner/Partner close from dashboard → VERIFIED

### Data Integrity Rules
- All splits MUST total 100% (frontend + backend validation)
- Every transaction MUST have `splitDetails.teacherId` (for payroll)
- Student deletion MUST cascade (REFUND transactions + reverse DailyRevenue)
- Teacher deletion MUST purge from Configuration splits

## Testing Scenarios

See `test-scenarios.md` for comprehensive testing guide covering:
- Test 1: Ghost Purge
- Test 2: Dynamic Partner Addition/Deletion
- Test 3: 100% Teaching Income (Owner/Partner)
- Test 4: Academy Pool Split (Regular Teacher)
- Test 5: Mixed Compensation
- Test 6: Student Withdrawal Cascade
- Test 7: Percentage Teacher Payroll Report

## Support

For issues or questions:
1. Check console logs during script execution
2. Review MongoDB audit logs
3. Test on staging environment first
4. Contact system administrator

---

**Last Updated**: 2026-03-18
**Version**: 1.0.0
**Status**: Production-Ready ✅
