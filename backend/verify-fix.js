require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const FeeRecord = require('./models/FeeRecord');
  const AcademySettlement = require('./models/AcademySettlement');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Test FIX: using createdAt (correct)
  const result = await FeeRecord.aggregate([
    { $match: { status: 'PAID', createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);
  console.log('\n=== MONTHLY REVENUE FIX VERIFICATION ===');
  console.log('Using createdAt (FIXED):', JSON.stringify(result));
  console.log('Monthly Income:', result[0]?.total || 0);

  // Test OLD BUG: using collectedAt (broken - field doesn't exist)
  const resultOld = await FeeRecord.aggregate([
    { $match: { status: 'PAID', collectedAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);
  console.log('Using collectedAt (OLD BUG):', JSON.stringify(resultOld));
  console.log('Old value:', resultOld[0]?.total || 0, '(should be 0 - field does not exist!)');

  // Test Academy Settlements
  console.log('\n=== ACADEMY SETTLEMENTS VERIFICATION ===');
  const pending = await AcademySettlement.find({ status: 'PENDING' }).lean();
  console.log('Pending settlements:');
  pending.forEach(p => console.log(`  - ${p.partnerName} (${p.partnerRole}): PKR ${p.amount}`));

  const released = await AcademySettlement.find({ status: 'RELEASED' }).lean();
  console.log('Released settlements:');
  released.forEach(r => console.log(`  - ${r.partnerName} (${r.partnerRole}): PKR ${r.amount}`));

  console.log('\n=== SUMMARY ===');
  console.log('Monthly Revenue:', result[0]?.total || 0, result[0]?.total === 55000 ? '✅ CORRECT' : '❌ UNEXPECTED');
  console.log('Pending partner settlements:', pending.filter(p => p.partnerRole === 'PARTNER').length);
  console.log('Owner auto-released:', released.filter(r => r.partnerRole === 'OWNER').length, '(filtered from UI)');

  process.exit(0);
}).catch(err => {
  console.error('DB Error:', err.message);
  process.exit(1);
});
