const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Class = require('./models/Class');

dotenv.config();

async function updateClassSubjects() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected!');

        // Find the "9th Grade - Medical" class
        const cls = await Class.findOne({ className: '9th Grade', section: 'Medical' });

        if (!cls) {
            console.log('❌ Class not found!');
            process.exit(1);
        }

        console.log('\n📖 Found Class:', cls.className, '-', cls.section);
        console.log('   Current subjects:', cls.subjects);

        // Update subjects with proper capitalization and fees
        cls.subjects = [
            { name: 'Biology', fee: 3000 },
            { name: 'Chemistry', fee: 3000 },
            { name: 'Physics', fee: 3000 }
        ];

        await cls.save();

        console.log('   ✅ Updated subjects:', cls.subjects);
        console.log('\n🎉 Class subjects updated successfully!');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateClassSubjects();
