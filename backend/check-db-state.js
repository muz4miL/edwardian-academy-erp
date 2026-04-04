/**
 * Database State Check Script
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function checkData() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const User = require('./models/User');
  const Teacher = require('./models/Teacher');
  const Student = require('./models/Student');
  const Class = require('./models/Class');
  const FeeRecord = require('./models/FeeRecord');
  const AcademySettlement = require('./models/AcademySettlement');
  const TeacherDeposit = require('./models/TeacherDeposit');
  const Configuration = require('./models/Configuration');
  
  console.log('\n📊 CURRENT DATABASE STATE\n');
  console.log('='.repeat(50));
  
  // Users
  const users = await User.find({}).select('fullName role username walletBalance').lean();
  console.log('\n👥 Users:');
  users.forEach(u => {
    console.log(`   - ${u.fullName} (${u.role}) [username: ${u.username}]`);
    if (u.walletBalance) {
      console.log(`     Wallet: floating=${u.walletBalance.floating || 0}, verified=${u.walletBalance.verified || 0}`);
    }
  });
  
  // Teachers
  const teachers = await Teacher.find({status: 'active'}).select('name compensation balance').lean();
  console.log(`\n👨‍🏫 Teachers (${teachers.length} active):`);
  teachers.slice(0, 5).forEach(t => {
    const bal = t.balance || {};
    console.log(`   - ${t.name} [${t.compensation?.type || 'percentage'}]`);
    console.log(`     Balance: floating=${bal.floating || 0}, verified=${bal.verified || 0}`);
  });
  if (teachers.length > 5) console.log(`   ... and ${teachers.length - 5} more`);
  
  // Students
  const studentCount = await Student.countDocuments({status: 'active'});
  const students = await Student.find({status: 'active'}).limit(5).select('studentName class totalFee').lean();
  console.log(`\n📚 Active Students: ${studentCount}`);
  students.forEach(s => {
    console.log(`   - ${s.studentName} (${s.class}) Fee: PKR ${s.totalFee || 0}`);
  });
  
  // Classes
  const classes = await Class.find({}).select('classTitle subjectTeachers').lean();
  console.log(`\n🏫 Classes: ${classes.length}`);
  classes.slice(0, 3).forEach(c => {
    console.log(`   - ${c.classTitle} (${c.subjectTeachers?.length || 0} subjects)`);
  });
  
  // Fee Records
  const feeCount = await FeeRecord.countDocuments({});
  const recentFees = await FeeRecord.find({}).sort({createdAt: -1}).limit(3).lean();
  console.log(`\n💰 Fee Records: ${feeCount}`);
  recentFees.forEach(f => {
    console.log(`   - ${f.studentName}: PKR ${f.amount} (${f.month}) [${f.status}]`);
  });
  
  // Pending Settlements
  const pendingSettlements = await AcademySettlement.find({status: 'PENDING'}).lean();
  console.log(`\n📋 Pending Academy Settlements: ${pendingSettlements.length}`);
  if (pendingSettlements.length > 0) {
    const total = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);
    console.log(`   Total pending: PKR ${total}`);
  }
  
  // Deposits
  const deposits = await TeacherDeposit.countDocuments({});
  console.log(`\n💳 Teacher Deposits: ${deposits}`);
  
  // Config
  const config = await Configuration.findOne().lean();
  console.log('\n⚙️ Configuration:');
  console.log(`   - Teacher Share: ${config?.salaryConfig?.teacherShare || 70}%`);
  console.log(`   - Academy Share: ${config?.salaryConfig?.academyShare || 30}%`);
  console.log(`   - Tuition Split: Waqar=${config?.tuitionPoolSplit?.waqar}%, Zahid=${config?.tuitionPoolSplit?.zahid}%, Saud=${config?.tuitionPoolSplit?.saud}%`);
  
  console.log('\n' + '='.repeat(50));
  console.log('\n🔐 LOGIN CREDENTIALS FOR TESTING:');
  console.log('   Owner: Check database for username (role=OWNER)');
  console.log('   Partner: Check database for username (role=PARTNER)');
  console.log('\n   Frontend: http://localhost:8080');
  console.log('   Backend API: http://localhost:5001');
  console.log('='.repeat(50));
  
  await mongoose.connection.close();
}

checkData().catch(console.error);
