const express = require('express');
const router = express.Router();
const {
    getTeachers,
    getTeacherById,
    createTeacher,
    updateTeacher,
    deleteTeacher,
} = require('../controllers/teacherController');
const TeacherPayment = require('../models/TeacherPayment');

// @route   GET /api/teachers
// @desc    Get all teachers
router.get('/', getTeachers);

// @route   GET /api/teachers/:id
// @desc    Get single teacher
router.get('/:id', getTeacherById);

// @route   POST /api/teachers
// @desc    Create new teacher
router.post('/', createTeacher);

// @route   PUT /api/teachers/:id
// @desc    Update teacher
router.put('/:id', updateTeacher);

// @route   DELETE /api/teachers/:id
// @desc    Delete teacher
router.delete('/:id', deleteTeacher);

// @route   GET /api/teachers/payments/history
// @desc    Get all teacher payment transactions
// @access  Public
router.get('/payments/history', async (req, res) => {
    try {
        const { teacherId, month, year, limit = 50 } = req.query;

        const query = {};
        if (teacherId) query.teacherId = teacherId;
        if (month) query.month = month;
        if (year) query.year = parseInt(year);

        const payments = await TeacherPayment.find(query)
            .sort({ paymentDate: -1 })
            .limit(parseInt(limit))
            .populate('teacherId', 'name subject');

        // Calculate total paid amount
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);

        res.json({
            success: true,
            data: {
                payments,
                totalPaid,
                count: payments.length
            }
        });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment history',
            error: error.message
        });
    }
});


// ==================== UNIFIED PAYOUT ENDPOINT ====================
// @route   POST /api/teachers/payout
// @desc    Process teacher payout from Finance dashboard
// @access  Public
router.post('/payout', async (req, res) => {
    try {
        const Teacher = require('../models/Teacher');
        const { teacherId, amount } = req.body;

        console.log('🔍 Payout request received:', { teacherId, amount });

        // Validation
        if (!teacherId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: teacherId, amount',
            });
        }

        const teacher = await Teacher.findById(teacherId);
        console.log('📋 Teacher found:', teacher ? teacher.name : 'NOT FOUND');

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found',
            });
        }

        // Get current month and year
        const now = new Date();
        const month = now.toLocaleString('en-US', { month: 'long' });
        const year = now.getFullYear();
        console.log('📅 Payment period:', { month, year });

        // Check if already paid for this period
        const existingPayment = await TeacherPayment.findOne({
            teacherId: teacher._id,
            month,
            year,
            status: 'paid',
        });
        console.log('🔍 Existing payment check:', existingPayment ? 'FOUND - Already paid' : 'NOT FOUND - Proceeding');

        if (existingPayment) {
            return res.status(400).json({
                success: false,
                message: `Teacher already paid for ${month} ${year}`,
                voucherId: existingPayment.voucherId,
            });
        }

        // Create payment record
        console.log('💾 Creating payment record...');

        // MANUALLY GENERATE VOUCHER ID (bypass broken pre-save hook)
        const paymentCount = await TeacherPayment.countDocuments();
        const voucherId = `TP-${year}${String(now.getMonth() + 1).padStart(2, '0')}-${String(paymentCount + 1).padStart(4, '0')}`;
        console.log('🎫 MANUALLY GENERATED voucherId:', voucherId);

        const payment = new TeacherPayment({
            voucherId: voucherId,  // SET MANUALLY
            teacherId: teacher._id,
            teacherName: teacher.name,
            subject: teacher.subject,
            amountPaid: parseFloat(amount),
            compensationType: teacher.compensation?.type || 'percentage',
            month,
            year,
            paymentMethod: 'cash',
            status: 'paid',
        });

        await payment.save();
        console.log('✅ Payment saved with voucherId:', payment.voucherId);

        console.log(`✅ Payout processed: ${payment.voucherId} for ${teacher.name} - ${amount} PKR`);

        res.status(201).json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                voucherId: payment.voucherId,
                teacherName: teacher.name,
                subject: teacher.subject,
                amountPaid: payment.amountPaid,
                month: payment.month,
                year: payment.year,
                paymentDate: payment.paymentDate,
                paymentMethod: payment.paymentMethod,
            },
        });
    } catch (error) {
        console.error('❌ Error processing teacher payout:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Failed to process payment',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// @route   GET /api/teachers/recent-payouts
// @desc    Get recent payment history for all teachers
// @access  Public
router.get('/recent-payouts', async (req, res) => {
    try {
        const payments = await TeacherPayment.find({ status: 'paid' })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            count: payments.length,
            data: payments,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent payouts',
            error: error.message,
        });
    }
});

module.exports = router;
