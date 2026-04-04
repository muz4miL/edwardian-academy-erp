require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/edwardianAcademyDB";

async function addTestStudent() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB\n");

    const Class = require('./models/Class');
    const User = require('./models/User');
    
    // Find the class
    const classDoc = await Class.findOne({ classTitle: "1st Year Tuition" });
    if (!classDoc) {
      console.error("Class '1st Year Tuition' not found!");
      process.exit(1);
    }
    
    console.log(`Found class: ${classDoc.classTitle}`);
    console.log(`Subjects: ${classDoc.subjects.map(s => s.subjectName).join(', ')}\n`);
    
    // Get admin token (you need to be logged in or use credentials)
    const owner = await User.findOne({ role: 'OWNER' });
    console.log(`Owner: ${owner.fullName}\n`);
    
    // Prepare student data
    const studentData = {
      studentName: "Usman Gul",
      fatherName: "Father Name",
      cnic: "1234567890123",
      dateOfBirth: "2005-01-01",
      contactNumber: "+923001234567",
      class: classDoc._id.toString(),
      feeStatus: "PAID",
      admissionDate: new Date().toISOString(),
      subjects: classDoc.subjects.map(s => ({
        subjectName: s.subjectName,
        subjectId: s._id.toString(),
        teacher: s.teacher.toString(),
        teacherName: s.teacherName,
        tuitionFee: s.tuitionFee,
        discount: 0,
        discountType: "NONE"
      })),
      calculatedFee: classDoc.subjects.reduce((sum, s) => sum + s.tuitionFee, 0),
      depositedAmount: classDoc.subjects.reduce((sum, s) => sum + s.tuitionFee, 0)
    };
    
    console.log(`=== ADDING STUDENT ===`);
    console.log(`Name: ${studentData.studentName}`);
    console.log(`Class: ${classDoc.classTitle}`);
    console.log(`Total Fee: PKR ${studentData.calculatedFee}`);
    console.log(`Subjects:`);
    studentData.subjects.forEach(s => {
      console.log(`  - ${s.subjectName}: PKR ${s.tuitionFee} (${s.teacherName})`);
    });
    
    // Make API call to add student
    try {
      const response = await axios.post('http://localhost:5000/students', studentData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`\n✅ Student added successfully!`);
      console.log(`Student ID: ${response.data._id}`);
      
      // Now check the results
      setTimeout(async () => {
        const DailyRevenue = require('./models/DailyRevenue');
        const AcademySettlement = require('./models/AcademySettlement');
        const ownerRevenues = await DailyRevenue.find({ partner: owner._id, status: 'UNCOLLECTED' });
        const settlements = await AcademySettlement.find({});
        const updatedOwner = await User.findById(owner._id);
        
        console.log(`\n=== VERIFICATION ===`);
        console.log(`Owner Wallet: PKR ${updatedOwner.walletBalance?.floating || 0}`);
        console.log(`\nOwner Closeable Amount:`);
        const total = ownerRevenues.reduce((sum, r) => sum + r.amount, 0);
        console.log(`TOTAL: PKR ${total}`);
        console.log(`Breakdown:`);
        ownerRevenues.forEach(r => {
          console.log(`  - ${r.revenueType}: PKR ${r.amount} (${r.description})`);
        });
        
        console.log(`\n=== SETTLEMENTS CREATED ===`);
        settlements.forEach(s => {
          console.log(`  - ${s.partnerName} (${s.percentage}%): PKR ${s.amount} | Status: ${s.status}`);
        });
        
        mongoose.disconnect();
      }, 2000);
      
    } catch (error) {
      if (error.response) {
        console.error(`\n❌ API Error: ${error.response.status}`);
        console.error(error.response.data);
      } else {
        console.error(`\n❌ Error:`, error.message);
      }
      mongoose.disconnect();
    }
    
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

addTestStudent();
