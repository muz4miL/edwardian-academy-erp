const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected Successfully!');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

// Main simulation function
const simulateTransactions = async () => {
    try {
        console.log('\n🤖 Starting Transaction Simulation...\n');

        // 1. Find Dr. Zahid
        console.log('🔍 Looking for user: zahid...');
        const zahid = await User.findOne({ username: 'zahid' });

        if (!zahid) {
            console.error('❌ User "zahid" not found! Please create this user first.');
            process.exit(1);
        }

        console.log(`✅ Found user: ${zahid.fullName} (${zahid.username})`);
        console.log(`   Role: ${zahid.role}`);
        console.log(`   ID: ${zahid._id}\n`);

        // 2. Create 5 FLOATING transactions
        console.log('💰 Creating 5 FLOATING tuition transactions...\n');

        const transactions = [];
        const mockStudents = [
            'Ali Ahmed',
            'Sara Khan',
            'Hassan Malik',
            'Fatima Noor',
            'Usman Tariq'
        ];

        for (let i = 0; i < 5; i++) {
            const transaction = await Transaction.create({
                type: 'INCOME',
                category: 'Tuition',
                amount: 5000,
                description: `Tuition Fee - Mock Student: ${mockStudents[i]}`,
                collectedBy: zahid._id,
                status: 'FLOATING',
                date: new Date(),
            });

            transactions.push(transaction);
            console.log(`   ✓ Transaction ${i + 1}: PKR 5,000 - ${mockStudents[i]}`);
        }

        // 3. Calculate totals
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        console.log(`\n✅ Created ${transactions.length} transactions`);
        console.log(`💵 Total FLOATING cash: PKR ${totalAmount.toLocaleString()}\n`);

        // 4. Update Zahid's wallet floating cash
        console.log('💼 Updating wallet balance...');

        // Update the floating cash in the nested walletBalance object
        if (zahid.walletBalance && typeof zahid.walletBalance === 'object') {
            zahid.walletBalance.floating = (zahid.walletBalance.floating || 0) + totalAmount;
            await zahid.save();
            console.log(`✅ Wallet updated: Floating PKR ${zahid.walletBalance.floating.toLocaleString()}\n`);
        } else {
            // Initialize with proper structure if needed
            zahid.walletBalance = { floating: totalAmount, verified: 0 };
            await zahid.save();
            console.log(`✅ Wallet initialized: Floating PKR ${totalAmount.toLocaleString()}\n`);
        }

        // 5. Summary
        console.log('📊 SIMULATION SUMMARY:');
        console.log('══════════════════════════════════════');
        console.log(`User: ${zahid.fullName}`);
        console.log(`Username: ${zahid.username}`);
        console.log(`Transactions Created: ${transactions.length}`);
        console.log(`Total FLOATING Amount: PKR ${totalAmount.toLocaleString()}`);
        console.log(`Status: FLOATING (ready for closing)`);
        console.log('══════════════════════════════════════\n');

        console.log('✅ SIMULATION COMPLETE!');
        console.log('\nℹ️  Next Steps:');
        console.log('   1. Login as "zahid" in the frontend');
        console.log('   2. Check Dashboard - should show PKR 25K in Floating Cash');
        console.log('   3. Click "End of Day Closing" button');
        console.log('   4. Confirm the dialog');
        console.log('   5. Watch the floating cash reset to PKR 0\n');

    } catch (error) {
        console.error('\n❌ Error during simulation:', error.message);
        console.error(error);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
        process.exit(0);
    }
};

// Run the script
const main = async () => {
    await connectDB();
    await simulateTransactions();
};

main();
