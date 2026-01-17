const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const users = await User.find({});
        console.log(`\n📊 Found ${users.length} users in database:\n`);

        if (users.length === 0) {
            console.log('❌ NO USERS FOUND! Need to seed the database.');
        } else {
            users.forEach(user => {
                console.log(`   - ${user.fullName} (${user.role})`);
                console.log(`     Username: ${user.username}`);
                console.log(`     User ID: ${user.userId}`);
                console.log(`     Active: ${user.isActive}`);
                console.log('');
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkUsers();
