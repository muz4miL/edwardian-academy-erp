const mongoose = require('mongoose');
require('dotenv').config();

const checkDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;
        const collection = db.collection('students');

        // Count documents
        const count = await collection.countDocuments();
        console.log(`📊 Total Students in Database: ${count}\n`);

        // Show all students
        if (count > 0) {
            const students = await collection.find({}).toArray();
            console.log('📋 Existing Students:');
            students.forEach((student, index) => {
                console.log(`\n${index + 1}. ${student.studentName || student.name || 'Unknown'}`);
                console.log(`   ID: ${student.studentId || 'N/A'}`);
                console.log(`   Father: ${student.fatherName || 'N/A'}`);
                console.log(`   Class: ${student.class || 'N/A'}`);
                console.log(`   Fee Status: ${student.feeStatus || 'N/A'}`);
            });
        } else {
            console.log('📭 Database is empty - Ready for first admission!');
        }

        // Check indexes
        const indexes = await collection.indexes();
        console.log('\n📌 Current Indexes:');
        indexes.forEach(index => {
            console.log(`   - ${index.name}${index.unique ? ' (UNIQUE)' : ''}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkDatabase();
