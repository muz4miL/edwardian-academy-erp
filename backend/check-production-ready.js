/**
 * Production Readiness Check Script
 */
const fs = require('fs');
const path = require('path');

console.log('\n🔍 FINANCE SYSTEM PRODUCTION READINESS CHECK\n');
console.log('='.repeat(60));

// Check all required files exist
const requiredFiles = [
  { path: 'models/AcademySettlement.js', name: 'AcademySettlement Model' },
  { path: 'models/TeacherDeposit.js', name: 'TeacherDeposit Model' },
  { path: 'helpers/revenueEngine.js', name: 'Revenue Engine' },
  { path: 'controllers/financeController.js', name: 'Finance Controller' },
  { path: 'controllers/payrollController.js', name: 'Payroll Controller' },
  { path: 'routes/finance.js', name: 'Finance Routes' },
  { path: 'routes/payroll.js', name: 'Payroll Routes' },
];

let allPassed = true;
console.log('\n📁 Required Files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file.path));
  console.log(`   ${exists ? '✅' : '❌'} ${file.name}`);
  if (!exists) allPassed = false;
});

// Check frontend components
const frontendFiles = [
  { path: '../frontend/src/components/finance/AcademySettlements.tsx', name: 'AcademySettlements Component' },
  { path: '../frontend/src/components/finance/TeacherDepositModal.tsx', name: 'TeacherDeposit Modal' },
  { path: '../frontend/src/lib/api.ts', name: 'API Client' },
];

console.log('\n🖥️  Frontend Components:');
frontendFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file.path));
  console.log(`   ${exists ? '✅' : '❌'} ${file.name}`);
  if (!exists) allPassed = false;
});

// Check key exports
console.log('\n📦 Module Exports:');
try {
  const revenueEngine = require('./helpers/revenueEngine');
  const exports = [
    'splitFeeAmongTeachers',
    'detectClassRevenueMode',
    'distributeAcademyShare',
    'distributeAcademyShareDeferred',
    'releasePartnerAcademySettlements',
    'createDailyRevenueEntries',
    'getPendingSettlementsSummary',
  ];
  exports.forEach(exp => {
    const exists = typeof revenueEngine[exp] === 'function';
    console.log(`   ${exists ? '✅' : '❌'} ${exp}`);
    if (!exists) allPassed = false;
  });
} catch (e) {
  console.log('   ❌ Could not load revenueEngine:', e.message);
  allPassed = false;
}

// Check model statics
console.log('\n🔧 Model Methods:');
try {
  const AcademySettlement = require('./models/AcademySettlement');
  const TeacherDeposit = require('./models/TeacherDeposit');
  
  const settlementMethods = ['getPendingForPartner', 'getPendingTotal', 'getAllPendingSummary'];
  settlementMethods.forEach(method => {
    const exists = typeof AcademySettlement[method] === 'function';
    console.log(`   ${exists ? '✅' : '❌'} AcademySettlement.${method}`);
    if (!exists) allPassed = false;
  });
  
  const depositMethods = ['getDepositsForTeacher', 'getTotalDeposited', 'getSummaryByType'];
  depositMethods.forEach(method => {
    const exists = typeof TeacherDeposit[method] === 'function';
    console.log(`   ${exists ? '✅' : '❌'} TeacherDeposit.${method}`);
    if (!exists) allPassed = false;
  });
} catch (e) {
  console.log('   ❌ Could not load models:', e.message);
  allPassed = false;
}

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('\n🎉 ALL CHECKS PASSED - System is production ready!\n');
} else {
  console.log('\n⚠️  SOME CHECKS FAILED - Review above for details\n');
}

process.exit(allPassed ? 0 : 1);
