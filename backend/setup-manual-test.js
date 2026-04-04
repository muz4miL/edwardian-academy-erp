/**
 * Manual Testing Setup Script
 * Creates comprehensive test data for finance system manual testing
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupTestData() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const User = require('./models/User');
  const Teacher = require('./models/Teacher');
  const Student = require('./models/Student');
  const Class = require('./models/Class');
  const Configuration = require('./models/Configuration');
  
  console.log('\n🔧 SETTING UP MANUAL TEST DATA\n');
  console.log('='.repeat(50));
  
  // Get existing data
  const owner = await User.findOne({role: 'OWNER'});
  const partner = await User.findOne({role: 'PARTNER'});
  const config = await Configuration.findOne();
  
  if (!owner) {
    console.log('❌ No owner found - please run the seed script first');
    await mongoose.connection.close();
    return;
  }
  
  console.log(`\n✅ Found Owner: ${owner.fullName}`);
  console.log(`✅ Found Partner: ${partner?.fullName || 'None'}`);
  
  // Get a class with subjects
  const testClass = await Class.findOne({subjectTeachers: {$exists: true, $ne: []}});
  if (!testClass) {
    console.log('❌ No class with subjects found');
    await mongoose.connection.close();
    return;
  }
  console.log(`✅ Using Class: ${testClass.classTitle}`);
  
  // Get teachers
  const regularTeacher = await Teacher.findOne({
    status: 'active',
    name: {$nin: ['Waqar', 'Shah saud']}
  });
  
  // Create test students
  const testStudents = [
    {
      studentName: 'Ahmed Khan',
      fatherName: 'Muhammad Khan',
      phone: '0300-1234567',
      parentCell: '0300-9876543',
      group: 'Group A',
      class: testClass.classTitle,
      classId: testClass._id,
      status: 'active',
      admissionDate: new Date(),
      subjects: testClass.subjectTeachers.map(st => ({
        name: st.subject,
        fee: 3000,
        discount: 0,
        discountEnabled: false,
        teacherId: st.teacherId,
      })),
      totalFee: testClass.subjectTeachers.length * 3000,
    },
    {
      studentName: 'Fatima Ali',
      fatherName: 'Ali Ahmed',
      phone: '0301-1234567',
      parentCell: '0301-9876543',
      group: 'Group B',
      class: testClass.classTitle,
      classId: testClass._id,
      status: 'active',
      admissionDate: new Date(),
      subjects: testClass.subjectTeachers.map(st => ({
        name: st.subject,
        fee: 3000,
        discount: 500, // With discount
        discountEnabled: true,
        discountReason: 'Sibling discount',
        teacherId: st.teacherId,
      })),
      totalFee: (testClass.subjectTeachers.length * 3000) - (testClass.subjectTeachers.length * 500),
    },
    {
      studentName: 'Hamza Malik',
      fatherName: 'Malik Tariq',
      phone: '0302-1234567',
      parentCell: '0302-9876543',
      group: 'Group A',
      class: testClass.classTitle,
      classId: testClass._id,
      status: 'active',
      admissionDate: new Date(),
      subjects: testClass.subjectTeachers.map(st => ({
        name: st.subject,
        fee: 3500, // Higher fee
        discount: 0,
        discountEnabled: false,
        teacherId: st.teacherId,
      })),
      totalFee: testClass.subjectTeachers.length * 3500,
    },
  ];
  
  console.log('\n📚 Creating test students...');
  
  for (const studentData of testStudents) {
    // Check if student exists
    const existing = await Student.findOne({studentName: studentData.studentName});
    if (existing) {
      console.log(`   ⏭️ ${studentData.studentName} already exists`);
      continue;
    }
    
    try {
      const student = await Student.create(studentData);
      console.log(`   ✅ Created: ${student.studentName} (ID: ${student.studentId})`);
      console.log(`      Class: ${student.class}, Fee: PKR ${student.totalFee}`);
    } catch (err) {
      console.log(`   ❌ Error creating ${studentData.studentName}: ${err.message}`);
    }
  }
  
  // Summary
  const studentCount = await Student.countDocuments({status: 'active'});
  console.log(`\n📊 Total active students: ${studentCount}`);
  
  console.log('\n' + '='.repeat(50));
  console.log('\n🎯 MANUAL TEST SCENARIOS:');
  console.log('\n1️⃣  FEE COLLECTION TEST:');
  console.log('   - Go to Finance → Students/Fee');
  console.log('   - Find Ahmed Khan, Fatima Ali, or Hamza Malik');
  console.log('   - Collect fee and verify:');
  console.log('     • Teacher balance updates (70% share)');
  console.log('     • Academy share calculated (30%)');
  console.log('     • Partner settlements created (PENDING)');
  
  console.log('\n2️⃣  PER-SUBJECT DISCOUNT TEST:');
  console.log('   - Go to Admissions');
  console.log('   - Select a class and subjects');
  console.log('   - Toggle discount for individual subjects');
  console.log('   - Verify fee recalculation');
  
  console.log('\n3️⃣  TEACHER DEPOSIT TEST:');
  console.log('   - Go to Finance → Teacher Payroll');
  console.log('   - Click "Deposit" button next to any teacher');
  console.log('   - Add ADVANCE payment of PKR 5000');
  console.log('   - Verify teacher balance increases');
  
  console.log('\n4️⃣  ACADEMY SETTLEMENT TEST:');
  console.log('   - Collect fees first (creates pending settlements)');
  console.log('   - Go to Owner Dashboard');
  console.log('   - Find Academy Settlements section');
  console.log('   - Release partner settlements');
  console.log('   - Verify partner wallet updates');
  
  console.log('\n5️⃣  OWNER DASHBOARD TEST:');
  console.log('   - Login as Owner (username: owner)');
  console.log('   - Check dashboard breakdown shows:');
  console.log('     • Own earnings (tuition + academy share)');
  console.log('     • Teacher payables');
  console.log('     • Partner pending settlements');
  console.log('     • Today\'s collections');
  
  console.log('\n' + '='.repeat(50));
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log('   Owner:   username=owner, password=owner123');
  console.log('   Partner: username=shah_saud or mohammad_zahid');
  console.log('\n   Frontend: http://localhost:8080');
  console.log('='.repeat(50) + '\n');
  
  await mongoose.connection.close();
}

setupTestData().catch(console.error);
