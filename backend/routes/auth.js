const express = require('express');
const router = express.Router();
const {
    login,
    logout,
    getMe,
    createStaff,
    getAllStaff,
    toggleStaffStatus,
} = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// ========================================
// PUBLIC ROUTES
// ========================================
router.post('/login', login);

// ========================================
// PROTECTED ROUTES (All authenticated users)
// ========================================
router.use(protect); // Everything below requires authentication

router.post('/logout', logout);
router.get('/me', getMe);

// ========================================
// OWNER-ONLY ROUTES (Staff Management)
// ========================================
router.post('/create-staff', restrictTo('OWNER'), createStaff);
router.get('/staff', restrictTo('OWNER'), getAllStaff);
router.patch('/staff/:id/toggle', restrictTo('OWNER'), toggleStaffStatus);

module.exports = router;
