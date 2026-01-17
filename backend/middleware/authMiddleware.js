const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ========================================
// MIDDLEWARE: Verify JWT Token from Cookie
// ========================================
const protect = async (req, res, next) => {
    try {
        // Extract token from HTTP-only cookie
        const token = req.cookies.authToken;

        // SECURITY: Reject if token is sent in body
        if (req.body.token || req.body.authToken) {
            return res.status(403).json({
                success: false,
                message: '⛔ Security Violation: Tokens must be sent via secure cookies, not request body.',
            });
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: '🔒 Authentication required. Please log in.',
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database (exclude password)
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '❌ User not found. Please log in again.',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: '🚫 Account is deactivated. Contact admin.',
            });
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '🔐 Invalid token. Please log in again.',
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '⏰ Session expired. Please log in again.',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Server error during authentication.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

// ========================================
// MIDDLEWARE: Restrict Access by Role
// ========================================
const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `🚫 Access denied. This action requires ${allowedRoles.join(' or ')} privileges.`,
            });
        }
        next();
    };
};

module.exports = { protect, restrictTo };
