require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/edwardianAcademyDB";
mongoose.connect(MONGO_URI);

const DailyRevenue = require('./models/DailyRevenue');
const FeeRecord = require('./models/FeeRecord');
const AcademySettlement = require('./models/AcademySettlement');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

async function checkCurrentState() {
  try {
    const revenues = await DailyRevenue.find({}).populate('partner', 'fullName role');
    const fees = await FeeRecord.find({});
    const settlements = await AcademySettlement.find({}).populate('partnerId', 'fullName role');
    const transactions = await Transaction.find({});
    const owner = await User.findOne({ role: 'OWNER' });
    
    console.log('\n=== OWNER WALLET ===');
    console.log('Name:', owner?.fullName);
    console.log('Floating:', owner?.walletBalance?.floating || 0);
    console.log('Verified:', owner?.walletBalance?.verified || 0);
    
    console.log('\n=== DAILY REVENUE ENTRIES ===');
    const ownerRevenues = revenues.filter(r => r.partner?.role === 'OWNER');
    const partnerRevenues = revenues.filter(r => r.partner?.role === 'PARTNER');
    
    console.log('\nOwner Revenues:');
    ownerRevenues.forEach(r => {
      console.log(`  - ${r.revenueType}: PKR ${r.amount} | Status: ${r.status} | Deferred: ${r.isDeferred || false}`);
      console.log(`    ${r.description}`);
    });
    
    console.log('\nPartner Revenues:');
    partnerRevenues.forEach(r => {
      console.log(`  - ${r.partner?.fullName}: ${r.revenueType}: PKR ${r.amount} | Status: ${r.status} | Deferred: ${r.isDeferred || false}`);
    });
    
    console.log('\n=== FEE RECORDS ===');
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    console.log(`Total Collected: PKR ${totalFees}`);
    fees.forEach(f => console.log(`  - Student: ${f.student} | Amount: PKR ${f.amount}`));
    
    console.log('\n=== ACADEMY SETTLEMENTS ===');
    settlements.forEach(s => {
      console.log(`  - ${s.partnerName} (${s.percentage}%): PKR ${s.amount} | Status: ${s.status}`);
    });
    
    console.log('\n=== TRANSACTIONS ===');
    const floatingTrans = transactions.filter(t => t.status === 'FLOATING');
    const deferredTrans = transactions.filter(t => t.status === 'DEFERRED');
    console.log(`Floating: ${floatingTrans.length} | Deferred: ${deferredTrans.length}`);
    
    console.log('\n=== CALCULATION ANALYSIS ===');
    const ownerUncollected = ownerRevenues.filter(r => r.status === 'UNCOLLECTED');
    const ownerTotal = ownerUncollected.reduce((sum, r) => sum + r.amount, 0);
    console.log(`Owner Closeable Amount: PKR ${ownerTotal}`);
    console.log('Breakdown:');
    ownerUncollected.forEach(r => {
      console.log(`  - ${r.revenueType}: PKR ${r.amount} (${r.description})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkCurrentState();
