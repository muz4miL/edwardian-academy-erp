const mongoose = require('mongoose');

async function resetTest() {
    await mongoose.connect('mongodb://127.0.0.1:27017/edwardianAcademyDB');
    
    const Student = require('./models/Student');
    const AcademySettlement = require('./models/AcademySettlement');
    const DailyRevenue = require('./models/DailyRevenue');
    const User = require('./models/User');
    const Teacher = require('./models/Teacher');
    
    // Reset student fee status
    await Student.updateMany(
        { studentName: { $in: ['Test Student A', 'Test Student B', 'Test Student C'] }},
        { feeStatus: 'pending', paidAmount: 0, feeHistory: [] }
    );
    
    // Clear settlements and revenue
    await AcademySettlement.deleteMany({});
    await DailyRevenue.deleteMany({});
    
    // Reset user wallets
    await User.updateMany({}, { 'walletBalance.floating': 0, 'walletBalance.verified': 0 });
    
    // Reset teacher balances
    await Teacher.updateMany({}, { 'balance.floating': 0, 'balance.verified': 0 });
    
    console.log('✅ Test data reset - ready for fresh fee collection');
    
    process.exit(0);
}
resetTest().catch(e => { console.error(e); process.exit(1); });
