require('dotenv').config();
const mongoose = require('mongoose');

async function fixFeeStatus() {
    try {
        console.log('🔧 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected!');

        const db = mongoose.connection.db;
        const studentsCollection = db.collection('students');

        // Find all students with totalFee = 0 but feeStatus is not 'pending'
        const studentsToFix = await studentsCollection.find({
            totalFee: 0,
            feeStatus: { $ne: 'pending' }
        }).toArray();

        console.log(`\n📊 Found ${studentsToFix.length} students with incorrect fee status`);

        if (studentsToFix.length > 0) {
            console.log('\n🔄 Fixing fee status for Quick Add students...');

            const result = await studentsCollection.updateMany(
                { totalFee: 0 },
                { $set: { feeStatus: 'pending' } }
            );

            console.log(`✅ Updated ${result.modifiedCount} student(s)`);
            console.log('\n📋 Students fixed:');
            studentsToFix.forEach((student, index) => {
                console.log(`   ${index + 1}. ${student.studentId} - ${student.studentName} (was: ${student.feeStatus} → now: pending)`);
            });
        } else {
            console.log('✅ No students need fixing. All fee statuses are correct!');
        }

        console.log('\n✨ Fee status fix complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixFeeStatus();
