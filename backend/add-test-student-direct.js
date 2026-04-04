require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/edwardianAcademyDB";

async function addTestStudent() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB\n");

    const Student = require('./models/Student');
    const Class = require('./models/Class');
    const User = require('./models/User');
    const Teacher = require('./models/Teacher');
    const { processRevenueDistribution } = require('./controllers/studentController');
    
    // Find the class
    const classDoc = await Class.findOne({ classTitle: "1st Year Tuition" });
    if (!classDoc) {
      console.error("Class '1st Year Tuition' not found!");
      process.exit(1);
    }
    
    console.log(`Found class: ${classDoc.classTitle}`);
    console.log(`Subjects:`);
    classDoc.subjects.forEach(s => {
      console.log(`  - ${s.subjectName}: PKR ${s.tuitionFee} (${s.teacherName})`);
    });
    
    const totalFee = classDoc.subjects.reduce((sum, s) => sum + s.tuitionFee, 0);
    console.log(`\nTotal Fee: PKR ${totalFee}\n`);
    
    // Create student
    const studentData = {
      studentName: "Usman Gul",
      fatherName: "Father Name",
      cnic: "1234567890123",
      dateOfBirth: new Date("2005-01-01"),
      contactNumber: "+923001234567",
      class: classDoc._id,
      feeStatus: "PAID",
      admissionDate: new Date(),
      subjects: classDoc.subjects.map(s => ({
        subjectName: s.subjectName,
        subjectId: s._id,
        teacher: s.teacher,
        teacherName: s.teacherName,
        tuitionFee: s.tuitionFee,
        discount: 0,
        discountType: "NONE"
      })),
      calculatedFee: totalFee,
      depositedAmount: totalFee
    };
    
    const student = await Student.create(studentData);
    console.log(`✅ Student created: ${student.studentName} (ID: ${student._id})\n`);
    
    // Process revenue distribution
    console.log(`Processing revenue distribution...\n`);
    const owner = await User.findOne({ role: 'OWNER' });
    
    // Mock request object
    const mockReq = {
      user: { _id: owner._id },
      body: studentData
    };
    
    // Call the revenue distribution function directly
    // We need to extract and call it properly
    // For now, let's just manually trigger it by updating the student
    student.feeStatus = "PAID";
    await student.save();
    
    // Wait a bit and check results
    setTimeout(async () => {
      const DailyRevenue = require('./models/DailyRevenue');
      const AcademySettlement = require('./models/AcademySettlement');
      const Transaction = require('./models/Transaction');
      const FeeRecord = require('./models/FeeRecord');
      
      const ownerRevenues = await DailyRevenue.find({ partner: owner._id, status: 'UNCOLLECTED' });
      const settlements = await AcademySettlement.find({}).populate('partnerId', 'fullName');
      const transactions = await Transaction.find({});
      const feeRecords = await FeeRecord.find({});
      const updatedOwner = await User.findById(owner._id);
      
      console.log(`=== VERIFICATION ===\n`);
      console.log(`Owner Wallet Floating: PKR ${updatedOwner.walletBalance?.floating || 0}`);
      
      console.log(`\n=== OWNER CLOSEABLE AMOUNT ===`);
      const total = ownerRevenues.reduce((sum, r) => sum + r.amount, 0);
      console.log(`TOTAL: PKR ${total}`);
      if (total === 25000) {
        console.log(`✅ CORRECT! Should be PKR 25,000`);
      } else {
        console.log(`❌ WRONG! Should be PKR 25,000, not PKR ${total}`);
      }
      console.log(`\nBreakdown:`);
      ownerRevenues.forEach(r => {
        console.log(`  - ${r.revenueType}: PKR ${r.amount}`);
        console.log(`    ${r.description}`);
      });
      
      console.log(`\n=== SETTLEMENTS CREATED ===`);
      settlements.forEach(s => {
        console.log(`  - ${s.partnerName} (${s.percentage}%): PKR ${s.amount} | Status: ${s.status}`);
      });
      
      console.log(`\n=== TRANSACTIONS ===`);
      console.log(`Total: ${transactions.length}`);
      const floating = transactions.filter(t => t.status === 'FLOATING');
      const deferred = transactions.filter(t => t.status === 'DEFERRED');
      console.log(`Floating: ${floating.length} | Deferred: ${deferred.length}`);
      
      console.log(`\n=== FEE RECORDS ===`);
      const totalFeesCollected = feeRecords.reduce((sum, f) => sum + f.amount, 0);
      console.log(`Total Collected: PKR ${totalFeesCollected}`);
      if (totalFeesCollected === 55000) {
        console.log(`✅ CORRECT! Monthly revenue should show PKR 55,000`);
      } else {
        console.log(`⚠️  Expected PKR 55,000, got PKR ${totalFeesCollected}`);
      }
      
      mongoose.disconnect();
    }, 3000);
    
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

addTestStudent();
