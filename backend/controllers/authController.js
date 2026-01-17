const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ========================================
// UTILITY: Generate JWT Token
// ========================================
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// ========================================
// UTILITY: Send Cookie Response
// ========================================
const sendTokenResponse = (user, statusCode, res, message) => {
    const token = generateToken(user._id);

    // Cookie options
    const cookieOptions = {
        httpOnly: true, // Prevents XSS attacks
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // CSRF protection
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    };

    // Update last login
    user.lastLogin = new Date();
    user.save({ validateBeforeSave: false });

    res.status(statusCode)
        .cookie('authToken', token, cookieOptions)
        .json({
            success: true,
            message,
            user: user.getPublicProfile(),
        });
};

// ========================================
// @route   POST /api/auth/login
// @desc    Authenticate user and set cookie
// @access  Public
// ========================================
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // SECURITY: Reject tokens in body
        if (req.body.token || req.body.authToken) {
            return res.status(403).json({
                success: false,
                message: '⛔ Security Violation: Do not send tokens in the request body.',
            });
        }

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide username and password.',
            });
        }

        // Find user (explicitly select password for comparison)
        const user = await User.findOne({ username }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '❌ Invalid credentials.',
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: '🚫 Account is deactivated. Contact admin.',
            });
        }

        // Compare password
        const isPasswordCorrect = await user.comparePassword(password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: '❌ Invalid credentials.',
            });
        }

        // Send token via cookie
        sendTokenResponse(user, 200, res, `✅ Welcome back, ${user.fullName}!`);
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

// ========================================
// @route   POST /api/auth/logout
// @desc    Clear auth cookie
// @access  Private
// ========================================
exports.logout = async (req, res) => {
    try {
        res.status(200)
            .cookie('authToken', 'none', {
                httpOnly: true,
                expires: new Date(Date.now() + 1000), // Expire immediately
                sameSite: 'strict',
            })
            .json({
                success: true,
                message: '✅ Logged out successfully.',
            });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout.',
        });
    }
};

// ========================================
// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
// ========================================
exports.getMe = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user.getPublicProfile(),
        });
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user data.',
        });
    }
};

// ========================================
// @route   POST /api/auth/create-staff
// @desc    Create a new STAFF account (OWNER only)
// @access  Private (OWNER)
// ========================================
exports.createStaff = async (req, res) => {
    try {
        const { username, password, fullName, phone, email } = req.body;

        // Validate input
        if (!username || !password || !fullName) {
            return res.status(400).json({
                success: false,
                message: 'Please provide username, password, and full name.',
            });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '❌ Username already exists.',
            });
        }

        // Generate unique userId
        const staffCount = await User.countDocuments({ role: 'STAFF' });
        const userId = `STAFF-${String(staffCount + 1).padStart(3, '0')}`;

        // Create new staff member
        const newStaff = await User.create({
            userId,
            username,
            password, // Will be hashed by pre-save hook
            fullName,
            role: 'STAFF',
            phone,
            email,
            canBeDeleted: true,
            isActive: true,
            createdBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: `✅ Staff account created successfully for ${fullName}.`,
            user: newStaff.getPublicProfile(),
        });
    } catch (error) {
        console.error('Create Staff Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating staff account.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

// ========================================
// @route   GET /api/auth/staff
// @desc    Get all staff members (OWNER only)
// @access  Private (OWNER)
// ========================================
exports.getAllStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: 'STAFF' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: staff.length,
            staff: staff.map((s) => s.getPublicProfile()),
        });
    } catch (error) {
        console.error('Get Staff Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching staff list.',
        });
    }
};

// ========================================
// @route   PATCH /api/auth/staff/:id/toggle
// @desc    Activate/Deactivate staff (OWNER only)
// @access  Private (OWNER)
// ========================================
exports.toggleStaffStatus = async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);

        if (!staff || staff.role !== 'STAFF') {
            return res.status(404).json({
                success: false,
                message: '❌ Staff member not found.',
            });
        }

        staff.isActive = !staff.isActive;
        await staff.save();

        res.status(200).json({
            success: true,
            message: `✅ Staff ${staff.isActive ? 'activated' : 'deactivated'} successfully.`,
            user: staff.getPublicProfile(),
        });
    } catch (error) {
        console.error('Toggle Staff Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling staff status.',
        });
    }
};
