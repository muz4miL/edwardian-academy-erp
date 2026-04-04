const mongoose = require('mongoose');

async function createProperTestData() {
    await mongoose.connect('mongodb://127.0.0.1:27017/edwardianAcademyDB');
    
    const Student = require('./models/Student');
    const User = require('./models/User');
    const Class = require('./models/Class');
    const AcademySettlement = require('./models/AcademySettlement');
    const DailyRevenue = require('./models/DailyRevenue');
    
    // Get existing users
    const owner = await User.findOne({ role: 'OWNER' });
    const partners = await User.find({ role: 'PARTNER' });
    const teachers = await User.find({ role: 'TEACHER' });
    
    console.log('Owner:', owner?.fullName, owner?._id);
    console.log('Partners:', partners.map(p => p.fullName + ' (' + p._id + ')'));
    console.log('Teachers:', teachers.slice(0,3).map(t => t.fullName + ' (' + t._id + ')'));
    
    // Delete old test students
    await Student.deleteMany({ studentName: { $in: ['Ahmed Khan', 'Fatima Ali', 'Hamza Malik', 'Test Student A', 'Test Student B', 'Test Student C'] }});
    
    // Clear old settlements and revenue for clean test
    await AcademySettlement.deleteMany({});
    await DailyRevenue.deleteMany({});
    
    // Use an existing class or find one
    let testClass = await Class.findOne({});
    console.log('Using class:', testClass?.name || 'FSc Pre-Medical');
    
    // Create new test students with PROPER subject structure including PARTNER as teacher
    const partner1 = partners[0]; // Shah Saud
    const teacher1 = teachers.length > 0 ? teachers[0] : null;
    const className = testClass?.name || 'FSc Pre-Medical';
    
    // Student A: Has PARTNER as teacher (to test deferred settlements)
    const studentA = await Student.create({
        studentId: 'TEST-A-001',
        studentName: 'Test Student A',
        fatherName: 'Father A',
        parentName: 'Parent A',
        parentCell: '03001234567',
        group: 'Morning',
        class: className,
        subjects: [
            {
                name: 'Physics',
                fee: 4000,
                discount: 0,
                discountEnabled: false,
                teacherId: partner1?._id,
                teacherName: partner1?.fullName || 'Shah Saud'
            },
            {
                name: 'Chemistry',
                fee: 4000,
                discount: 0,
                discountEnabled: false,
                teacherId: owner?._id,
                teacherName: owner?.fullName || 'Academy Owner'
            }
        ],
        totalFee: 8000,
        admissionDate: new Date(),
        feeStatus: 'pending'
    });
    
    // Student B: Has PARTNER with discount (to test discount flow)
    const studentB = await Student.create({
        studentId: 'TEST-B-001',
        studentName: 'Test Student B',
        fatherName: 'Father B',
        parentName: 'Parent B',
        parentCell: '03002345678',
        group: 'Evening',
        class: className,
        subjects: [
            {
                name: 'Physics',
                fee: 5000,
                discount: 500,
                discountEnabled: true,
                discountReason: 'Sibling discount',
                teacherId: partner1?._id,
                teacherName: partner1?.fullName || 'Shah Saud'
            },
            {
                name: 'Mathematics',
                fee: 5000,
                discount: 0,
                discountEnabled: false,
                teacherId: teacher1?._id || owner?._id,
                teacherName: teacher1?.fullName || owner?.fullName
            }
        ],
        totalFee: 9500, // 10000 - 500 discount
        admissionDate: new Date(),
        feeStatus: 'pending'
    });
    
    // Student C: Regular teacher only (no partner, no deferred settlement)
    const studentC = await Student.create({
        studentId: 'TEST-C-001',
        studentName: 'Test Student C',
        fatherName: 'Father C',
        parentName: 'Parent C',
        parentCell: '03003456789',
        group: 'Morning',
        class: className,
        subjects: [
            {
                name: 'English',
                fee: 3000,
                discount: 0,
                discountEnabled: false,
                teacherId: teacher1?._id || owner?._id,
                teacherName: teacher1?.fullName || owner?.fullName
            }
        ],
        totalFee: 3000,
        admissionDate: new Date(),
        feeStatus: 'pending'
    });
    
    console.log('\n=== CREATED TEST STUDENTS ===');
    console.log('Student A:', studentA.studentName, '- Fee:', studentA.totalFee, '- Has PARTNER teacher (Shah Saud)');
    console.log('Student B:', studentB.studentName, '- Fee:', studentB.totalFee, '- Has PARTNER teacher with discount');
    console.log('Student C:', studentC.studentName, '- Fee:', studentC.totalFee, '- Regular teacher only');
    
    console.log('\n✅ Test data created successfully!');
    process.exit(0);
}

createProperTestData().catch(e => { console.error(e); process.exit(1); });
