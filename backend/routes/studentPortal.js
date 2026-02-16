const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const {
    studentLogin,
    getStudentProfile,
    getStudentVideos,
    recordVideoView,
    studentLogout,
    getStudentSchedule,
} = require("../controllers/studentPortalController");

/**
 * Student Portal Routes - LMS Module
 */

// Middleware to protect student routes
const protectStudent = async (req, res, next) => {
    try {
        let token;

        // Check for token in cookie or Authorization header
        if (req.cookies.studentToken) {
            token = req.cookies.studentToken;
        } else if (req.headers.authorization?.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized - No token",
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "student") {
            return res.status(403).json({
                success: false,
                message: "Not authorized - Invalid role",
            });
        }

        // Get student
        const student = await Student.findById(decoded.id);
        if (!student) {
            return res.status(401).json({
                success: false,
                message: "Student not found",
            });
        }

        req.student = student;
        next();
    } catch (error) {
        console.error("Student auth error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Not authorized - Invalid token",
        });
    }
};

// ========================================
// PUBLIC ROUTES
// ========================================

// Student login
router.post("/login", studentLogin);

// ========================================
// PROTECTED ROUTES (Student only)
// ========================================

// Get profile
router.get("/me", protectStudent, getStudentProfile);

// Get videos
router.get("/videos", protectStudent, getStudentVideos);

// Get schedule/timetable
router.get("/schedule", protectStudent, getStudentSchedule);

// Record video view
router.post("/videos/:id/view", protectStudent, recordVideoView);

// Logout
router.post("/logout", protectStudent, studentLogout);

module.exports = router;

