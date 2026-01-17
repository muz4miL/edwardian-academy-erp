const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const DailyClosing = require('../models/DailyClosing');
const User = require('../models/User');

// @desc    Close Day - Lock floating cash into verified balance
// @route   POST /api/finance/close-day
// @access  Protected (Partners Only)
exports.closeDay = async (req, res) => {
    try {
        const userId = req.user._id;
        const { notes } = req.body;

        // 1. Find all FLOATING transactions for this user
        const floatingTransactions = await Transaction.find({
            collectedBy: userId,
            status: 'FLOATING',
            type: 'INCOME', // Only close income, not expenses
        });

        // 2. THE ZERO CHECK: No cash to close
        if (floatingTransactions.length === 0) {
            return res.status(400).json({
                success: false,
                message: '❌ No floating cash to close. Collect some payments first!',
            });
        }

        // 3. Calculate totals and breakdown
        let totalAmount = 0;
        const breakdown = {
            chemistry: 0,
            tuition: 0,
            pool: 0,
        };

        floatingTransactions.forEach((transaction) => {
            totalAmount += transaction.amount;

            // Add to category breakdown
            if (transaction.category === 'Chemistry') {
                breakdown.chemistry += transaction.amount;
            } else if (transaction.category === 'Tuition') {
                breakdown.tuition += transaction.amount;
            } else if (transaction.category === 'Pool') {
                breakdown.pool += transaction.amount;
            }
        });

        // 4. THE TRANSACTION: Update all to VERIFIED and create closing record
        const closingDate = new Date();

        // Create the Daily Closing document
        const dailyClosing = await DailyClosing.create({
            partnerId: userId,
            date: closingDate,
            totalAmount,
            breakdown,
            status: 'VERIFIED',
            notes: notes || `Daily closing for ${closingDate.toDateString()}`,
        });

        // Update all floating transactions to VERIFIED and link to closing
        const transactionIds = floatingTransactions.map((t) => t._id);
        await Transaction.updateMany(
            { _id: { $in: transactionIds } },
            {
                $set: {
                    status: 'VERIFIED',
                    closingId: dailyClosing._id,
                },
            }
        );

        // 5. Update User's Wallet Balance
        const user = await User.findById(userId);
        if (user && user.walletBalance !== undefined) {
            // Move floating to confirmed balance
            user.walletBalance += totalAmount;
            await user.save();
        }

        // 6. SUCCESS RESPONSE
        return res.status(200).json({
            success: true,
            message: `✅ Successfully closed PKR ${totalAmount.toLocaleString()} for ${closingDate.toDateString()}`,
            data: {
                closingId: dailyClosing._id,
                date: closingDate,
                totalAmount,
                breakdown,
                transactionsClosed: floatingTransactions.length,
            },
        });
    } catch (error) {
        console.error('❌ Error in closeDay:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while closing day',
            error: error.message,
        });
    }
};

// @desc    Get Dashboard Stats (For Owner/Partner widgets)
// @route   GET /api/finance/dashboard-stats
// @access  Protected
exports.getDashboardStats = async (req, res) => {
    try {
        // Convert user ID to ObjectId
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const userRole = req.user.role;

        console.log('📊 Fetching dashboard stats for:', {
            userId: userId.toString(),
            role: userRole,
        });

        // === DEEP DEBUGGING LOGS ===
        console.log('--- 🔍 DATABASE DIAGNOSTICS ---');
        const totalDocs = await Transaction.countDocuments();
        console.log(`1. 📚 Total Transactions in DB: ${totalDocs}`);

        console.log(`2. 👤 Target User ID: ${userId.toString()}`);

        const sampleTx = await Transaction.findOne({ collectedBy: userId });
        console.log(`3. 📄 Sample Transaction for User: ${sampleTx ? 'FOUND' : 'NOT FOUND'}`);
        if (sampleTx) {
            console.log('   -> Sample ID:', sampleTx._id);
            console.log('   -> CollectedBy:', sampleTx.collectedBy);
            console.log('   -> Status:', sampleTx.status);
            console.log('   -> Date:', sampleTx.date);
        } else {
            // If not found by object ID, try checking if it's stored as a string
            const stringMatch = await Transaction.findOne({ collectedBy: userId.toString() });
            console.log(`   -> Check for String ID match: ${stringMatch ? 'FOUND' : 'NOT FOUND'}`);
        }

        const floatingCount = await Transaction.countDocuments({
            collectedBy: userId,
            status: 'FLOATING'
        });
        console.log(`4. 🔎 Matching FLOATING Docs (Status only): ${floatingCount}`);

        const matchCount = await Transaction.countDocuments({
            collectedBy: userId,
            status: 'FLOATING',
            type: 'INCOME'
        });
        console.log(`5. 🔎 Matching FLOATING INCOMES (Full Query): ${matchCount}`);
        console.log('-----------------------------------');
        // ============================

        // Calculate different stats based on role
        const stats = {};

        if (userRole === 'OWNER' || userRole === 'PARTNER') {
            // 1. Chemistry Revenue (for current user if partner, or total if owner)
            const chemistryFilter =
                userRole === 'PARTNER'
                    ? { collectedBy: userId, category: 'Chemistry', status: 'VERIFIED', type: 'INCOME' }
                    : { category: 'Chemistry', status: 'VERIFIED', type: 'INCOME' };

            const chemistryResult = await Transaction.aggregate([
                { $match: chemistryFilter },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]);

            stats.chemistryRevenue = chemistryResult.length > 0 ? chemistryResult[0].total : 0;

            // 2. Floating Cash (Unverified for this user)
            const floatingResult = await Transaction.aggregate([
                {
                    $match: {
                        collectedBy: userId,
                        status: 'FLOATING',
                        type: 'INCOME',
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]);

            stats.floatingCash = floatingResult.length > 0 ? floatingResult[0].total : 0;

            // 3. Tuition Revenue (for partners)
            if (userRole === 'PARTNER') {
                const tuitionResult = await Transaction.aggregate([
                    {
                        $match: {
                            collectedBy: userId,
                            category: 'Tuition',
                            status: 'VERIFIED',
                            type: 'INCOME',
                        },
                    },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]);

                stats.tuitionRevenue = tuitionResult.length > 0 ? tuitionResult[0].total : 0;

                // Expense Debt (what partner owes to owner)
                const totalExpenses = await Transaction.aggregate([
                    {
                        $match: {
                            type: 'EXPENSE',
                            status: 'VERIFIED',
                        },
                    },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]);

                const totalExpenseAmount = totalExpenses.length > 0 ? totalExpenses[0].total : 0;
                // Each partner owes 30% of total expenses
                stats.expenseDebt = totalExpenseAmount * 0.30;
            }

            // 4. Owner-specific stats
            if (userRole === 'OWNER') {
                // Pending Reimbursements (Partner Debt)
                const totalExpenses = await Transaction.aggregate([
                    {
                        $match: {
                            type: 'EXPENSE',
                            status: 'VERIFIED',
                        },
                    },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]);

                const totalExpenseAmount = totalExpenses.length > 0 ? totalExpenses[0].total : 0;
                // Partners owe 60% of expenses (30% each)
                stats.pendingReimbursements = totalExpenseAmount * 0.6;

                // Academy Pool (30% shared revenue)
                const poolResult = await Transaction.aggregate([
                    { $match: { category: 'Pool', status: 'VERIFIED', type: 'INCOME' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]);

                stats.poolRevenue = poolResult.length > 0 ? poolResult[0].total : 0;
            }
        }

        console.log('✅ Dashboard stats calculated:', stats);

        return res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('❌ Error in getDashboardStats:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching dashboard stats',
            error: error.message,
        });
    }
};

// @desc    Record a new transaction (Income or Expense)
// @route   POST /api/finance/record-transaction
// @access  Protected
exports.recordTransaction = async (req, res) => {
    try {
        const { type, category, amount, description, studentId } = req.body;
        const userId = req.user._id;

        // Validation
        if (!type || !category || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Type, category, and amount are required',
            });
        }

        // Create transaction
        const transaction = await Transaction.create({
            type,
            category,
            amount,
            description,
            collectedBy: userId,
            studentId,
            status: 'FLOATING', // Always starts as floating
            date: new Date(),
        });

        return res.status(201).json({
            success: true,
            message: `✅ ${type} of PKR ${amount.toLocaleString()} recorded successfully`,
            data: transaction.getSummary(),
        });
    } catch (error) {
        console.error('❌ Error in recordTransaction:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while recording transaction',
            error: error.message,
        });
    }
};
