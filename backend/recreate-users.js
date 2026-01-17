const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const recreateUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Delete all existing users
        await User.deleteMany({});
        console.log('🗑️  Deleted all existing users\n');

        // Core users data
        const usersData = [
            {
                userId: 'OWNER-001',
                username: 'waqar',
                password: 'admin123',
                fullName: 'Sir Waqar Baig',
                role: 'OWNER',
                phone: '0300-1234567',
                email: 'waqar@edwardianacademy.com',
                walletBalance: 0,
                floatingCash: 0,
                pendingDebt: 0,
                isActive: true,
                canBeDeleted: false,
            },
            {
                userId: 'PARTNER-001',
                username: 'zahid',
                password: 'admin123',
                fullName: 'Dr. Zahid',
                role: 'PARTNER',
                phone: '0300-2345678',
                email: 'zahid@edwardianacademy.com',
                walletBalance: 0,
                floatingCash: 0,
                pendingDebt: 0,
                isActive: true,
                canBeDeleted: false,
            },
            {
                userId: 'PARTNER-002',
                username: 'saud',
                password: 'admin123',
                fullName: 'Sir Shah Saud',
                role: 'PARTNER',
                phone: '0300-3456789',
                email: 'saud@edwardianacademy.com',
                walletBalance: 0,
                floatingCash: 0,
                pendingDebt: 0,
                isActive: true,
                canBeDeleted: false,
            },
        ];

        // Create users one by one (triggers pre-save hook)
        console.log('👥 Creating users with hashed passwords...\n');
        for (const userData of usersData) {
            const user = await User.create(userData);
            console.log(`   ✅ Created: ${user.fullName} (${user.username})`);
        }

        console.log('\n🎉 All users created successfully with hashed passwords!');

        // Verify
        console.log('\n🔍 Verifying passwords...\n');
        for (const userData of usersData) {
            const user = await User.findOne({ username: userData.username }).select('+password');
            const isMatch = await user.comparePassword('admin123');
            console.log(`   ${isMatch ? '✅' : '❌'} ${user.fullName}: Password ${isMatch ? 'works!' : 'FAILED!'}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

recreateUsers();
