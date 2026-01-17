const mongoose = require('mongoose');
require('dotenv').config();

const dropStudentIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('students');

        // Get all indexes
        const indexes = await collection.indexes();
        console.log('\n📋 Current Indexes:', indexes);

        // Drop all indexes except _id
        for (const index of indexes) {
            if (index.name !== '_id_') {
                console.log(`🗑️  Dropping index: ${index.name}`);
                await collection.dropIndex(index.name);
            }
        }

        console.log('\n✅ All ghost indexes dropped successfully!');
        console.log('📌 Only _id index remains\n');

        // Show remaining indexes
        const remainingIndexes = await collection.indexes();
        console.log('📋 Remaining Indexes:', remainingIndexes);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

dropStudentIndexes();
