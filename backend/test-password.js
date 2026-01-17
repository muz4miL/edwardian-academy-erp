const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const testLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find the user
        const user = await User.findOne({ username: 'waqar' }).select('+password');

        if (!user) {
            console.log('❌ User not found!');
            process.exit(1);
        }

        console.log(`\n👤 Testing login for: ${user.fullName}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Hashed password in DB: ${user.password.substring(0, 20)}...`);

        // Test the password
        const testPassword = 'admin123';
        console.log(`\n🔑 Testing password: "${testPassword}"`);

        const isMatch = await user.comparePassword(testPassword);

        if (isMatch) {
            console.log('✅ PASSWORD MATCH! Login should work.');
        } else {
            console.log('❌ PASSWORD DOES NOT MATCH!');
            console.log('   The password hash comparison failed.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

testLogin();
