const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const FinanceRecord = require('./models/FinanceRecord');

// Load environment variables
dotenv.config();

// ========================================
// CORE PARTNER ACCOUNTS (Protected)
// ========================================
const coreUsers = [
    {
        userId: 'OWNER-001',
        username: 'waqar',
        password: 'admin123', // Will be hashed by pre-save hook
        fullName: 'Sir Waqar Baig',
        role: 'OWNER',
        phone: '0300-1234567',
        email: 'waqar@edwardianacademy.com',
        walletBalance: 0,
        floatingCash: 0,
        pendingDebt: 0,
        isActive: true,
        canBeDeleted: false, // Cannot be deleted
    },
    {
        userId: 'PARTNER-001',
        username: 'zahid',
        password: 'admin123',
        fullName: 'Dr. Zahid',
        role: 'PARTNER',
        phone: '0300-2345678',
        email: 'zahid@edwardianacademy.com',
        walletBalance: 0,
        floatingCash: 0,
        pendingDebt: 0,
        isActive: true,
        canBeDeleted: false, // Cannot be deleted
    },
    {
        userId: 'PARTNER-002',
        username: 'saud',
        password: 'admin123',
        fullName: 'Sir Shah Saud',
        role: 'PARTNER',
        phone: '0300-3456789',
        email: 'saud@edwardianacademy.com',
        walletBalance: 0,
        floatingCash: 0,
        pendingDebt: 0,
        isActive: true,
        canBeDeleted: false, // Cannot be deleted
    },
];

// Sample data
const students = [
    {
        studentId: 'STU-001',
        name: 'Ahmed Ali',
        fatherName: 'Mohammad Ali',
        class: '11th',
        group: 'Pre-Medical',
        subjects: ['Biology', 'Chemistry', 'Physics'],
        phone: '0321-1234567',
        email: 'ahmed@example.com',
        status: 'active',
        feeStatus: 'paid',
        totalFee: 40000,
        paidAmount: 40000,
    },
    {
        studentId: 'STU-002',
        name: 'Sara Khan',
        fatherName: 'Imran Khan',
        class: '12th',
        group: 'Pre-Engineering',
        subjects: ['Math', 'Chemistry', 'Physics'],
        phone: '0333-2345678',
        email: 'sara@example.com',
        status: 'active',
        feeStatus: 'partial',
        totalFee: 40000,
        paidAmount: 25000,
    },
    {
        studentId: 'STU-003',
        name: 'Hassan Raza',
        fatherName: 'Raza Ahmed',
        class: 'MDCAT',
        group: 'Pre-Medical',
        subjects: ['Biology', 'Chemistry', 'Physics', 'English'],
        phone: '0345-3456789',
        email: 'hassan@example.com',
        status: 'active',
        feeStatus: 'pending',
        totalFee: 60000,
        paidAmount: 0,
    },
    {
        studentId: 'STU-004',
        name: 'Fatima Noor',
        fatherName: 'Noor Muhammad',
        class: '10th',
        group: 'Pre-Medical',
        subjects: ['Biology', 'Chemistry'],
        phone: '0312-4567890',
        email: 'fatima@example.com',
        status: 'active',
        feeStatus: 'paid',
        totalFee: 30000,
        paidAmount: 30000,
    },
    {
        studentId: 'STU-005',
        name: 'Usman Shah',
        fatherName: 'Shah Nawaz',
        class: '11th',
        group: 'Pre-Engineering',
        subjects: ['Math', 'Physics'],
        phone: '0300-5678901',
        email: 'usman@example.com',
        status: 'active',
        feeStatus: 'partial',
        totalFee: 35000,
        paidAmount: 20000,
    },
];

const teachers = [
    {
        teacherId: 'TCH-001',
        name: 'Dr. Muhammad Aslam',
        subject: 'Biology',
        phone: '0321-1111111',
        email: 'aslam@academy.com',
        studentCount: 45,
        monthlyEarnings: 126000,
        status: 'active',
    },
    {
        teacherId: 'TCH-002',
        name: 'Prof. Fatima Hassan',
        subject: 'Chemistry',
        phone: '0333-2222222',
        email: 'fatima.t@academy.com',
        studentCount: 68,
        monthlyEarnings: 156000,
        status: 'active',
    },
    {
        teacherId: 'TCH-003',
        name: 'Mr. Ahmed Khan',
        subject: 'Physics',
        phone: '0345-3333333',
        email: 'ahmed.t@academy.com',
        studentCount: 52,
        monthlyEarnings: 118000,
        status: 'active',
    },
    {
        teacherId: 'TCH-004',
        name: 'Mrs. Sara Malik',
        subject: 'Mathematics',
        phone: '0312-4444444',
        email: 'sara.t@academy.com',
        studentCount: 38,
        monthlyEarnings: 98000,
        status: 'active',
    },
    {
        teacherId: 'TCH-005',
        name: 'Mr. Usman Ali',
        subject: 'English',
        phone: '0300-5555555',
        email: 'usman.t@academy.com',
        studentCount: 72,
        monthlyEarnings: 84000,
        status: 'active',
    },
];

// Finance records will be created after students are inserted
const createFinanceRecords = (students) => {
    return students.map((student, index) => ({
        receiptId: `FEE-00${index + 1}`,
        studentId: student._id,
        studentName: student.name,
        studentClass: student.class,
        totalFee: student.totalFee,
        paidAmount: student.paidAmount,
        balance: student.totalFee - student.paidAmount,
        status: student.feeStatus,
        paymentMethod: 'cash',
        month: 'December',
        year: 2025,
    }));
};

// Connect to MongoDB and seed data
const seedDatabase = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected!');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Student.deleteMany({});
        await Teacher.deleteMany({});
        await FinanceRecord.deleteMany({});
        console.log('✅ Existing data cleared!');

        // Insert Core Users (Partners)
        console.log('👥 Creating Core Partner Accounts...');
        const insertedUsers = await User.insertMany(coreUsers);
        console.log(`✅ ${insertedUsers.length} core users created!`);
        console.log(`   - ${insertedUsers[0].fullName} (${insertedUsers[0].role})`);
        console.log(`   - ${insertedUsers[1].fullName} (${insertedUsers[1].role})`);
        console.log(`   - ${insertedUsers[2].fullName} (${insertedUsers[2].role})`);


        // Insert students
        console.log('📝 Inserting students...');
        const insertedStudents = await Student.insertMany(students);
        console.log(`✅ ${insertedStudents.length} students inserted!`);

        // Insert teachers
        console.log('👨‍🏫 Inserting teachers...');
        const insertedTeachers = await Teacher.insertMany(teachers);
        console.log(`✅ ${insertedTeachers.length} teachers inserted!`);

        // Insert finance records
        console.log('💰 Inserting finance records...');
        const financeRecords = createFinanceRecords(insertedStudents);
        const insertedRecords = await FinanceRecord.insertMany(financeRecords);
        console.log(`✅ ${insertedRecords.length} finance records inserted!`);

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n📊 Summary:');
        console.log(`   Users: ${insertedUsers.length}`);
        console.log(`   Students: ${insertedStudents.length}`);
        console.log(`   Teachers: ${insertedTeachers.length}`);
        console.log(`   Finance Records: ${insertedRecords.length}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

// Run the seeder
seedDatabase();
