const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb://127.0.0.1:27017/edwardianAcademyDB');
    
    const Student = require('./models/Student');
    const User = require('./models/User');
    
    console.log('\n=== STUDENT SUBJECTS ===');
    const students = await Student.find({ studentName: { $in: ['Ahmed Khan', 'Fatima Ali', 'Hamza Malik'] }});
    for (const s of students) {
        console.log('\n' + s.studentName + ':');
        console.log('Total Fee:', s.totalFee);
        console.log('Fee Status:', s.feeStatus);
        console.log('Subjects:', s.subjects?.length || 0);
        if (s.subjects) {
            for (const sub of s.subjects) {
                const teacher = await User.findById(sub.teacher);
                console.log('  - Subject:', sub.subject);
                console.log('    Teacher:', teacher?.fullName, '(' + teacher?.role + ')');
                console.log('    Fee:', sub.fee);
            }
        }
    }
    
    process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
