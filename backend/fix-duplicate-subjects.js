const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Class = require('./models/Class');

dotenv.config();

async function fixDuplicateSubjects() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected!');

        // Find all classes
        const classes = await Class.find({});

        console.log(`\n📚 Found ${classes.length} classes\n`);

        for (const cls of classes) {
            console.log(`\n📖 Class: ${cls.className} - ${cls.section}`);
            console.log(`   Subjects BEFORE:`, cls.subjects);

            // Remove duplicates (case-insensitive), keeping the version with the highest fee
            const subjectMap = new Map();

            for (const subject of cls.subjects) {
                const subjectName = typeof subject === 'string'
                    ? subject
                    : subject.name;

                const normalizedName = subjectName.toLowerCase();
                const currentFee = typeof subject === 'object' ? (subject.fee || 0) : 0;

                if (subjectMap.has(normalizedName)) {
                    const existing = subjectMap.get(normalizedName);
                    const existingFee = typeof existing === 'object' ? (existing.fee || 0) : 0;

                    // Keep the one with higher fee
                    if (currentFee > existingFee) {
                        console.log(`   🔄 Replacing "${existing.name}" (${existingFee} PKR) with "${subjectName}" (${currentFee} PKR)`);
                        subjectMap.set(normalizedName, subject);
                    } else {
                        console.log(`   ❌ Skipping duplicate: "${subjectName}" (${currentFee} PKR)`);
                    }
                } else {
                    subjectMap.set(normalizedName, subject);
                }
            }

            const uniqueSubjects = Array.from(subjectMap.values());

            if (uniqueSubjects.length !== cls.subjects.length) {
                cls.subjects = uniqueSubjects;
                await cls.save();
                console.log(`   ✅ Updated subjects:`, cls.subjects);
            } else {
                console.log(`   ✓ No duplicates found`);
            }
        }

        console.log('\n🎉 Duplicate cleanup complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixDuplicateSubjects();
