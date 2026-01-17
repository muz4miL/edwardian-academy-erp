const mongoose = require('mongoose');
require('dotenv').config();

const migrateFields = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;
        const collection = db.collection('students');

        const students = await collection.find({}).toArray();
        console.log(`📊 Found ${students.length} students to migrate\n`);

        let migratedCount = 0;

        for (const student of students) {
            const updates = {};
            const unsets = {};

            // Migrate name -> studentName
            if (student.name && !student.studentName) {
                updates.studentName = student.name;
                unsets.name = 1;
                console.log(`✏️  Migrating: ${student.name}`);
            }

            // Migrate phone -> parentCell
            if (student.phone && !student.parentCell) {
                updates.parentCell = student.phone;
                unsets.phone = 1;
            }

            // Apply updates if any
            if (Object.keys(updates).length > 0 || Object.keys(unsets).length > 0) {
                const update = {};
                if (Object.keys(updates).length > 0) {
                    update.$set = updates;
                }
                if (Object.keys(unsets).length > 0) {
                    update.$unset = unsets;
                }

                await collection.updateOne(
                    { _id: student._id },
                    update
                );

                migratedCount++;
                console.log(`   ✅ Migrated: name → studentName, phone → parentCell`);
            }
        }

        console.log(`\n✅ Migration Complete!`);
        console.log(`   ${migratedCount} students migrated`);
        console.log(`   ${students.length - migratedCount} students already up-to-date\n`);

        // Verify migration
        console.log('🔍 Verifying migration...');
        const updatedStudents = await collection.find({}).limit(2).toArray();
        updatedStudents.forEach((student, index) => {
            console.log(`\nStudent ${index + 1}:`);
            console.log(`  studentName: ${student.studentName || 'MISSING'}`);
            console.log(`  parentCell: ${student.parentCell || 'MISSING'}`);
            console.log(`  name (old): ${student.name || 'REMOVED ✅'}`);
            console.log(`  phone (old): ${student.phone || 'REMOVED ✅'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

migrateFields();
