const express = require('express');
const router = express.Router();
const FinanceRecord = require('../models/FinanceRecord');

// @route   GET /api/finance
// @desc    Get all finance records
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { status, month, year } = req.query;

        let query = {};

        if (status) {
            query.status = status;
        }

        if (month) {
            query.month = month;
        }

        if (year) {
            query.year = parseInt(year);
        }

        const records = await FinanceRecord.find(query)
            .populate('studentId', 'name class')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: records.length,
            data: records,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching finance records',
            error: error.message,
        });
    }
});

// @route   GET /api/finance/:id
// @desc    Get single finance record by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const record = await FinanceRecord.findById(req.params.id)
            .populate('studentId', 'name class');

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Finance record not found',
            });
        }

        res.json({
            success: true,
            data: record,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching finance record',
            error: error.message,
        });
    }
});

// @route   POST /api/finance
// @desc    Create a new finance record
// @access  Public
router.post('/', async (req, res) => {
    try {
        const newRecord = new FinanceRecord(req.body);
        const savedRecord = await newRecord.save();

        res.status(201).json({
            success: true,
            message: 'Finance record created successfully',
            data: savedRecord,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error creating finance record',
            error: error.message,
        });
    }
});

// @route   PUT /api/finance/:id
// @desc    Update a finance record
// @access  Public
router.put('/:id', async (req, res) => {
    try {
        const updatedRecord = await FinanceRecord.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedRecord) {
            return res.status(404).json({
                success: false,
                message: 'Finance record not found',
            });
        }

        res.json({
            success: true,
            message: 'Finance record updated successfully',
            data: updatedRecord,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating finance record',
            error: error.message,
        });
    }
});

// @route   DELETE /api/finance/:id
// @desc    Delete a finance record
// @access  Public
router.delete('/:id', async (req, res) => {
    try {
        const deletedRecord = await FinanceRecord.findByIdAndDelete(req.params.id);

        if (!deletedRecord) {
            return res.status(404).json({
                success: false,
                message: 'Finance record not found',
            });
        }

        res.json({
            success: true,
            message: 'Finance record deleted successfully',
            data: deletedRecord,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting finance record',
            error: error.message,
        });
    }
});

// @route   GET /api/finance/stats/overview
// @desc    Get real-time finance statistics from Student and Teacher data
// @access  Public
router.get('/stats/overview', async (req, res) => {
    try {
        const Student = require('../models/Student');
        const Teacher = require('../models/Teacher');
        const Class = require('../models/Class');

        // TASK 1: Real-Time Metrics from Student Data

        // Total Income: Sum of all paidAmount
        const incomeResult = await Student.aggregate([
            { $group: { _id: null, totalIncome: { $sum: '$paidAmount' } } }
        ]);
        const totalIncome = incomeResult[0]?.totalIncome || 0;

        // Total Expected: Sum of all totalFee
        const expectedResult = await Student.aggregate([
            { $group: { _id: null, totalExpected: { $sum: '$totalFee' } } }
        ]);
        const totalExpected = expectedResult[0]?.totalExpected || 0;

        // Total Pending: Expected - Collected
        const totalPending = totalExpected - totalIncome;

        // Count students with pending fees
        const pendingStudentsCount = await Student.countDocuments({
            feeStatus: { $in: ['pending', 'partial'] }
        });

        // TASK 2: Teacher Compensation Calculations

        // Get all active teachers with their assigned classes
        const teachers = await Teacher.find({ status: 'active' });

        let totalTeacherLiabilities = 0;
        const teacherPayroll = [];

        for (const teacher of teachers) {
            // Find classes taught by this teacher
            const teacherClasses = await Class.find({
                subjects: {
                    $elemMatch: { name: { $regex: new RegExp(`^${teacher.subject}$`, 'i') } }
                }
            });

            // Calculate total collected from this teacher's classes
            let teacherRevenue = 0;
            for (const cls of teacherClasses) {
                const classRevenue = await Student.aggregate([
                    { $match: { classRef: cls._id } },
                    { $group: { _id: null, collected: { $sum: '$paidAmount' } } }
                ]);
                teacherRevenue += classRevenue[0]?.collected || 0;
            }

            // Calculate teacher's earned amount based on compensation model
            let earnedAmount = 0;
            const compensationType = teacher.compensation?.type || 'percentage';

            if (compensationType === 'percentage') {
                const teacherShare = teacher.compensation?.teacherShare || 70;
                earnedAmount = teacherRevenue * (teacherShare / 100);
            } else if (compensationType === 'fixed') {
                earnedAmount = teacher.compensation?.fixedSalary || 0;
            } else if (compensationType === 'hybrid') {
                const baseSalary = teacher.compensation?.baseSalary || 0;
                const profitShare = teacher.compensation?.profitShare || 0;
                earnedAmount = baseSalary + (teacherRevenue * (profitShare / 100));
            }

            // Check if teacher already paid for current month
            const TeacherPayment = require('../models/TeacherPayment');
            const now = new Date();
            const currentMonth = now.toLocaleString('en-US', { month: 'long' });
            const currentYear = now.getFullYear();

            const alreadyPaid = await TeacherPayment.findOne({
                teacherId: teacher._id,
                month: currentMonth,
                year: currentYear,
                status: 'paid'
            });

            // Subtract already paid amount from earned amount
            if (alreadyPaid) {
                earnedAmount = Math.max(0, earnedAmount - alreadyPaid.amountPaid);
            }

            totalTeacherLiabilities += earnedAmount;

            teacherPayroll.push({
                teacherId: teacher._id,
                name: teacher.name,
                subject: teacher.subject,
                compensationType,
                revenue: teacherRevenue,
                earnedAmount: Math.round(earnedAmount),
                classesCount: teacherClasses.length
            });
        }

        // TASK 2 & 3: Net Balance Calculation with Real Expenses
        const Expense = require('../models/Expense');
        const TeacherPayment = require('../models/TeacherPayment');

        // Get total expenses
        const expensesResult = await Expense.aggregate([
            { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
        ]);
        const totalExpenses = expensesResult[0]?.totalExpenses || 0;

        // Get total teacher payouts (money already paid out)
        const now = new Date();
        const currentMonth = now.toLocaleString('en-US', { month: 'long' });
        const currentYear = now.getFullYear();

        const teacherPayoutsResult = await TeacherPayment.aggregate([
            {
                $match: {
                    status: 'paid',
                    month: currentMonth,
                    year: currentYear
                }
            },
            { $group: { _id: null, totalPaid: { $sum: '$amountPaid' } } }
        ]);
        const totalTeacherPayouts = teacherPayoutsResult[0]?.totalPaid || 0;

        // Net Profit Formula: Income - (Teacher Pending Liabilities + Already Paid Payouts + Expenses)
        const netProfit = totalIncome - totalTeacherLiabilities - totalTeacherPayouts - totalExpenses;

        // Academy's share (what's left after all costs)
        const academyShare = netProfit;

        res.json({
            success: true,
            data: {
                // Income Metrics
                totalIncome,
                totalExpected,
                totalPending,
                pendingStudentsCount,

                // Teacher Metrics
                totalTeacherLiabilities,      // What we OWE (pending)
                totalTeacherPayouts,          // What we've PAID (current month)
                teacherPayroll,
                teacherCount: teachers.length,

                // Academy Metrics
                academyShare,
                totalExpenses,
                netProfit,

                // Percentages for UI
                collectionRate: totalExpected > 0 ? Math.round((totalIncome / totalExpected) * 100) : 0,
            },
        });
    } catch (error) {
        console.error('Finance stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching finance statistics',
            error: error.message,
        });
    }
});

module.exports = router;
