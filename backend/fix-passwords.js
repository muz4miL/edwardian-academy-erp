const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const fixPasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all users
        const users = await User.find({});
        console.log(`\n📝 Fixing passwords for ${users.length} users...\n`);

        for (const user of users) {
            // Get the current password (plain text)
            const plainPassword = user.password;

            // If it looks like it's already hashed (starts with $2), skip it
            if (plainPassword.startsWith('$2')) {
                console.log(`   ⏭️  ${user.fullName}: Already hashed`);
                continue;
            }

            console.log(`   🔧 ${user.fullName}: Hashing password...`);

            // Trigger the pre-save hook by explicitly saving
            user.password = plainPassword; // Reset to trigger isModified
            await user.save(); // This will trigger the pre-save hook

            console.log(`   ✅ ${user.fullName}: Password hashed successfully`);
        }

        console.log('\n✅ All passwords fixed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

fixPasswords();
