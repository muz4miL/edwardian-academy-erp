const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");

const {
    createExam,
    getAllExams,
    getExamById,
    getExamsForClass,
    getExamForStudent,
    submitExam,
    getExamResults,
    getMyResults,
    updateExam,
    deleteExam,
} = require("../controllers/examController");

/**
 * Student authentication middleware (for protected student routes)
 */
const protectStudent = async (req, res, next) => {
    try {
        let token;

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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "student") {
            return res.status(403).json({
                success: false,
                message: "Not authorized - Invalid role",
            });
        }

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
// ADMIN/TEACHER ROUTES
// ========================================

// Create exam (Teacher/Admin)
router.post("/", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), createExam);

// Get all exams (Teacher/Admin)
router.get("/", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), getAllExams);

// Get single exam with answers (Teacher/Admin)
router.get("/:id", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), getExamById);

// Get exam results/leaderboard (Teacher/Admin)
router.get("/:id/results", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), getExamResults);

// Update exam (Teacher/Admin)
router.put("/:id", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), updateExam);

// Delete exam (Teacher/Admin)
router.delete("/:id", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), deleteExam);

// ========================================
// STUDENT ROUTES
// ========================================

// Get exams for student's class (Student)
router.get("/class/:classId", protectStudent, getExamsForClass);

// Get exam to take (Student - NO correct answers)
router.get("/:id/take", protectStudent, getExamForStudent);

// Submit exam answers (Student)
router.post("/:id/submit", protectStudent, submitExam);

// Get my results (Student)
router.get("/student/my-results", protectStudent, getMyResults);

module.exports = router;
