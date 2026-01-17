const mongoose = require('mongoose');
require('dotenv').config();

const checkFieldStructure = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;
        const collection = db.collection('students');

        const students = await collection.find({}).limit(2).toArray();

        console.log('🔍 Checking Field Structure:\n');

        students.forEach((student, index) => {
            console.log(`Student ${index + 1}:`);
            console.log(`  - Has 'name' field: ${student.name ? '✅ YES' : '❌ NO'}`);
            console.log(`  - Has 'studentName' field: ${student.studentName ? '✅ YES' : '❌ NO'}`);
            console.log(`  - Has 'phone' field: ${student.phone ? '✅ YES' : '❌ NO'}`);
            console.log(`  - Has 'parentCell' field: ${student.parentCell ? '✅ YES' : '❌ NO'}`);
            console.log('');
        });

        console.log('💡 Recommendation:');
        if (students.some(s => s.name && !s.studentName)) {
            console.log('⚠️  Old field structure detected!');
            console.log('   Run: node scripts/migrateFields.js to update to new schema\n');
        } else {
            console.log('✅ Field structure is aligned with new schema!\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkFieldStructure();
