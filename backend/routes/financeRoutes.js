const express = require('express');
const router = express.Router();
const {
    closeDay,
    getDashboardStats,
    recordTransaction,
} = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// @route   POST /api/finance/close-day
// @desc    Close the day and lock floating cash
// @access  Partners & Owner only
router.post('/close-day', authorize('OWNER', 'PARTNER'), closeDay);

// @route   GET /api/finance/dashboard-stats
// @desc    Get financial stats for dashboard widgets
// @access  All authenticated users
router.get('/dashboard-stats', getDashboardStats);

// @route   POST /api/finance/record-transaction
// @desc    Record a new income or expense transaction
// @access  Partners & Owner only
router.post('/record-transaction', authorize('OWNER', 'PARTNER'), recordTransaction);

module.exports = router;
