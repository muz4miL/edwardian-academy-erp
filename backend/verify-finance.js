require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/edwardianAcademyDB";
mongoose.connect(MONGO_URI);

const DailyRevenue = require('./models/DailyRevenue');
const AcademySettlement = require('./models/AcademySettlement');
const Transaction = require('./models/Transaction');
const FeeRecord = require('./models/FeeRecord');
const User = require('./models/User');
const Student = require('./models/Student');

async function verifyFinanceData() {
  try {
    console.log('\n=== FINANCE VERIFICATION REPORT ===\n');
    
    // Get Owner
    const owner = await User.findOne({ role: 'OWNER' });
    if (!owner) {
      console.log('❌ No owner found!');
      process.exit(1);
    }
    
    // Get Students
    const students = await Student.countDocuments({});
    console.log(`📚 Students in database: ${students}\n`);
    
    // Get Fee Records
    const feeRecords = await FeeRecord.find({});
    const totalCollected = feeRecords.reduce((sum, f) => sum + f.amount, 0);
    console.log(`💰 TOTAL FEES COLLECTED: PKR ${totalCollected}`);
    console.log(`   ${feeRecords.length} fee records\n`);
    
    // Owner Daily Revenue (Closeable Amount)
    const ownerRevenues = await DailyRevenue.find({ 
      partner: owner._id, 
      status: 'UNCOLLECTED' 
    });
    const ownerCloseable = ownerRevenues.reduce((sum, r) => sum + r.amount, 0);
    
    console.log(`👤 OWNER: ${owner.fullName}`);
    console.log(`   Wallet Floating: PKR ${owner.walletBalance?.floating || 0}`);
    console.log(`   Closeable Amount: PKR ${ownerCloseable}`);
    
    if (ownerCloseable === 25000) {
      console.log(`   ✅ CORRECT! (Expected PKR 25,000)\n`);
    } else {
      console.log(`   ❌ WRONG! Expected PKR 25,000, got PKR ${ownerCloseable}\n`);
    }
    
    console.log(`   Breakdown:`);
    ownerRevenues.forEach(r => {
      console.log(`   - ${r.revenueType}: PKR ${r.amount}`);
      console.log(`     ${r.description}`);
    });
    
    // Partner Daily Revenue
    console.log(`\n👥 PARTNERS:`);
    const partners = await User.find({ role: 'PARTNER' });
    for (const partner of partners) {
      const partnerRevenues = await DailyRevenue.find({ 
        partner: partner._id, 
        status: 'UNCOLLECTED',
        isDeferred: { $ne: true }
      });
      const partnerCloseable = partnerRevenues.reduce((sum, r) => sum + r.amount, 0);
      console.log(`   ${partner.fullName}:`);
      console.log(`   - Wallet Floating: PKR ${partner.walletBalance?.floating || 0}`);
      console.log(`   - Closeable Amount: PKR ${partnerCloseable}`);
      if (partnerCloseable === 15000) {
        console.log(`   - ✅ CORRECT (Expected PKR 15,000)\n`);
      } else {
        console.log(`   - ⚠️  Expected PKR 15,000, got PKR ${partnerCloseable}\n`);
      }
    }
    
    // Academy Settlements
    const settlements = await AcademySettlement.find({}).populate('partnerId', 'fullName role');
    console.log(`📊 ACADEMY SETTLEMENTS:`);
    console.log(`   Total: ${settlements.length} settlements\n`);
    
    const ownerSettlements = settlements.filter(s => s.partnerRole === 'OWNER');
    const partnerSettlements = settlements.filter(s => s.partnerRole === 'PARTNER');
    
    if (ownerSettlements.length > 0) {
      console.log(`   Owner Settlements:`);
      ownerSettlements.forEach(s => {
        console.log(`   - ${s.partnerName} (${s.percentage}%): PKR ${s.amount} | Status: ${s.status}`);
      });
      console.log('');
    }
    
    if (partnerSettlements.length > 0) {
      console.log(`   Partner Settlements (Pending Release):`);
      partnerSettlements.forEach(s => {
        console.log(`   - ${s.partnerName} (${s.percentage}%): PKR ${s.amount} | Status: ${s.status}`);
      });
      console.log('');
    }
    
    const totalSettlementAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
    console.log(`   Total Settlement Amount: PKR ${totalSettlementAmount}`);
    if (totalSettlementAmount === 3000) {
      console.log(`   ✅ CORRECT (Expected PKR 3,000 academy pool)\n`);
    } else {
      console.log(`   ⚠️  Expected PKR 3,000, got PKR ${totalSettlementAmount}\n`);
    }
    
    // Transactions
    const transactions = await Transaction.find({});
    const floatingTrans = transactions.filter(t => t.status === 'FLOATING');
    const deferredTrans = transactions.filter(t => t.status === 'DEFERRED');
    
    console.log(`📝 TRANSACTIONS:`);
    console.log(`   Total: ${transactions.length}`);
    console.log(`   Floating: ${floatingTrans.length} | Deferred: ${deferredTrans.length}\n`);
    
    // Summary
    console.log(`=== SUMMARY ===`);
    console.log(`\n✅ Expected Results:`);
    console.log(`   - Monthly Revenue: PKR 55,000`);
    console.log(`   - Owner Closeable: PKR 25,000`);
    console.log(`     (PKR 15k Chemistry + PKR 10k Dr Ibrar full amount)`);
    console.log(`   - Partner Closeable: PKR 15,000 each (2 partners)`);
    console.log(`   - Academy Settlements: PKR 3,000 total`);
    console.log(`     (Owner 50% = PKR 1,500 auto-released)`);
    console.log(`     (Partners: PKR 900 + PKR 600 pending release)`);
    
    console.log(`\n📊 Actual Results:`);
    console.log(`   - Monthly Revenue: PKR ${totalCollected} ${totalCollected === 55000 ? '✅' : '❌'}`);
    console.log(`   - Owner Closeable: PKR ${ownerCloseable} ${ownerCloseable === 25000 ? '✅' : '❌'}`);
    console.log(`   - Academy Settlements: PKR ${totalSettlementAmount} ${totalSettlementAmount === 3000 ? '✅' : '❌'}`);
    
    const allCorrect = totalCollected === 55000 && ownerCloseable === 25000 && totalSettlementAmount === 3000;
    if (allCorrect) {
      console.log(`\n🎉 ALL CHECKS PASSED! Finance system working perfectly!`);
    } else {
      console.log(`\n⚠️  Some checks failed. Review the details above.`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

verifyFinanceData();
