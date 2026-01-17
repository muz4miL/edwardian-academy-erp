// Script to remove the problematic teacherId index from the teachers collection
const mongoose = require('mongoose');
require('dotenv').config();

async function fixTeacherIndex() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get the teachers collection
        const db = mongoose.connection.db;
        const collection = db.collection('teachers');

        // List all indexes
        console.log('\n📋 Current indexes:');
        const indexes = await collection.indexes();
        console.log(JSON.stringify(indexes, null, 2));

        // Drop the problematic teacherId index
        console.log('\n🗑️  Dropping teacherId_1 index...');
        try {
            await collection.dropIndex('teacherId_1');
            console.log('✅ Successfully dropped teacherId_1 index');
        } catch (error) {
            if (error.code === 27) {
                console.log('ℹ️  Index teacherId_1 does not exist (already removed)');
            } else {
                throw error;
            }
        }

        // Drop the problematic email index
        console.log('\n🗑️  Dropping email_1 index...');
        try {
            await collection.dropIndex('email_1');
            console.log('✅ Successfully dropped email_1 index');
        } catch (error) {
            if (error.code === 27) {
                console.log('ℹ️  Index email_1 does not exist (already removed)');
            } else {
                throw error;
            }
        }

        // List indexes after cleanup
        console.log('\n📋 Indexes after cleanup:');
        const indexesAfter = await collection.indexes();
        console.log(JSON.stringify(indexesAfter, null, 2));

        console.log('\n✅ Database cleanup complete!');
        console.log('You can now create teachers without the duplicate key error.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

fixTeacherIndex();
