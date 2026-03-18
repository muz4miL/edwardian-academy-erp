/**
 * Test script to simulate enrollment and verify revenue distribution
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function testEnrollment() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Class = require('../models/Class');
  const Teacher = require('../models/Teacher');
  const User = require('../models/User');
  const Student = require('../models/Student');
  const FeeRecord = require('../models/FeeRecord');
  const Transaction = require('../models/Transaction');
  const DailyRevenue = require('../models/DailyRevenue');
  const {
    detectClassRevenueMode,
    calculateTuitionSplit,
    createDailyRevenueEntries
  } = require('../helpers/revenueEngine');

  console.log('=== SIMULATING ENROLLMENT ===\n');

  // 1. Get Tuition class
  const classDoc = await Class.findOne({ classTitle: 'Tuition' }).lean();
  console.log('1. Class:', classDoc?.classTitle);
  console.log('   subjectTeachers:', classDoc?.subjectTeachers?.length);

  // 2. Detect revenue mode
  const modeResult = await detectClassRevenueMode(classDoc);
  console.log('\n2. Mode:', modeResult.mode);
  console.log('   ownerPartnerTeachers:', modeResult.ownerPartnerTeachers?.length);
  modeResult.ownerPartnerTeachers.forEach(t =>
    console.log('   -', t.teacherName, t.role, 'userId:', t.userId)
  );

  // 3. Simulate enrollment
  const initialPayment = 15000;
  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  // Create test student with all required fields
  const student = await Student.create({
    studentName: 'Test Student',
    fatherName: 'Test Father',
    class: 'Tuition',
    group: 'Pre-Medical',
    parentCell: '03001234567',
    totalFee: 15000,
    paidAmount: 0,
    feeStatus: 'pending'
  });
  console.log('\n3. Student created:', student.studentName, student._id);

  // 4. Calculate splits for TUITION mode
  if (modeResult.mode === 'TUITION' && modeResult.ownerPartnerTeachers.length > 0) {
    const splits = calculateTuitionSplit(initialPayment, modeResult.ownerPartnerTeachers);
    console.log('\n4. Splits calculated:', splits.length);

    const dailyRevenueEntries = [];
    const creditTransactions = [];

    for (const split of splits) {
      console.log('   -', split.teacherName, split.role, ':', split.amount);

      // Update teacher balance
      if (split.teacherId) {
        const teacher = await Teacher.findById(split.teacherId);
        if (teacher) {
          if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
          teacher.balance.floating = (teacher.balance.floating || 0) + split.amount;
          await teacher.save();
          console.log('     -> Teacher balance updated:', teacher.balance.floating);
        }
      }

      // Update user wallet
      if (split.userId) {
        const user = await User.findById(split.userId);
        if (user) {
          if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
          user.walletBalance.floating = (user.walletBalance.floating || 0) + split.amount;
          await user.save();
          console.log('     -> User wallet updated:', user.walletBalance.floating);
        }
      }

      // Prepare DailyRevenue entry
      dailyRevenueEntries.push({
        userId: split.userId,
        amount: split.amount,
        revenueType: 'TUITION_SHARE',
        classRef: classDoc?._id,
        className: classDoc?.classTitle,
        studentRef: student._id,
        studentName: student.studentName,
        splitDetails: {
          description: 'Test enrollment: ' + split.teacherName
        }
      });

      // Prepare transaction
      creditTransactions.push({
        type: 'INCOME',
        category: 'Tuition',
        stream: split.role === 'OWNER' ? 'OWNER_CHEMISTRY' : 'PARTNER_BIO',
        amount: split.amount,
        description: 'Test enrollment fee: ' + split.teacherName,
        status: 'FLOATING',
        date: new Date()
      });
    }

    // 5. Create FeeRecord
    const feeRecord = await FeeRecord.create({
      student: student._id,
      studentName: student.studentName,
      class: classDoc?._id,
      className: classDoc?.classTitle,
      amount: initialPayment,
      month
    });
    console.log('\n5. FeeRecord created:', feeRecord._id);

    // 6. Update student paidAmount
    student.paidAmount = initialPayment;
    student.feeStatus = 'paid';
    await student.save();
    console.log('6. Student paidAmount updated:', student.paidAmount);

    // 7. Save transactions
    if (creditTransactions.length > 0) {
      await Transaction.insertMany(creditTransactions);
      console.log('7. Transactions created:', creditTransactions.length);
    }

    // 8. Create DailyRevenue entries
    console.log('\n8. Creating DailyRevenue entries:', dailyRevenueEntries.length);
    dailyRevenueEntries.forEach(e => console.log('   -', e.userId, e.amount, e.revenueType));

    if (dailyRevenueEntries.length > 0) {
      for (const entry of dailyRevenueEntries) {
        entry.feeRecordRef = feeRecord._id;
      }
      const createdEntries = await createDailyRevenueEntries(dailyRevenueEntries);
      console.log('   Created:', createdEntries.length, 'entries');
    }
  }

  // 9. Verify final state
  console.log('\n=== FINAL STATE ===');

  const teachers = await Teacher.find({}).select('name balance').lean();
  console.log('\nTeachers:');
  teachers.forEach(t => console.log(' ', t.name, JSON.stringify(t.balance)));

  const users = await User.find({}).select('fullName role walletBalance').lean();
  console.log('\nUsers (Owner/Partner):');
  users.filter(u => ['OWNER','PARTNER'].includes(u.role))
    .forEach(u => console.log(' ', u.fullName, u.role, JSON.stringify(u.walletBalance)));

  const dr = await DailyRevenue.find({}).lean();
  console.log('\nDailyRevenue:', dr.length, 'entries');
  dr.forEach(d => console.log(' ', d.partner, d.amount, d.revenueType, d.status));

  const txns = await Transaction.find({}).lean();
  console.log('\nTransactions:', txns.length);

  process.exit(0);
}

testEnrollment().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
