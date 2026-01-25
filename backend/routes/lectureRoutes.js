/**
 * Lecture Routes - Academic Video Module
 * All routes protected by authentication
 */

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
    createLecture,
    getAllLectures,
    getTeacherLectures,
    getClassLectures,
    getMyClassroomLectures,
    updateLecture,
    deleteLecture,
    incrementViewCount,
    validateYouTubeUrl,
} = require("../controllers/lectureController");

// All routes require authentication
router.use(protect);

// Validation helper
router.post("/validate-url", validateYouTubeUrl);

// Teacher routes
router.get("/my-lectures", getTeacherLectures);

// Student classroom route
router.get("/my-classroom", getMyClassroomLectures);

// Class-specific lectures
router.get("/class/:classId", getClassLectures);

// View count
router.post("/:id/view", incrementViewCount);

// CRUD operations
router.route("/")
    .get(getAllLectures)
    .post(createLecture);

router.route("/:id")
    .put(updateLecture)
    .delete(deleteLecture);

module.exports = router;
