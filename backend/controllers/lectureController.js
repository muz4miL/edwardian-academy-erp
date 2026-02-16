/**
 * Lecture Controller - Academic Video Module
 * Handles YouTube lecture management for teachers and students
 */

const Lecture = require("../models/Lecture");
const Class = require("../models/Class");
const Student = require("../models/Student");

// ========================================
// HELPER: Extract YouTube Video ID from URL
// Supports: youtu.be, youtube.com/watch, youtube.com/embed, mobile links
// ========================================
const extractYouTubeID = (url) => {
    if (!url) return null;

    // Clean the URL
    url = url.trim();

    // Pattern 1: youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];

    // Pattern 2: youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];

    // Pattern 3: youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];

    // Pattern 4: youtube.com/v/VIDEO_ID
    const vMatch = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
    if (vMatch) return vMatch[1];

    // Pattern 5: Direct video ID (11 characters)
    const directMatch = url.match(/^([a-zA-Z0-9_-]{11})$/);
    if (directMatch) return directMatch[1];

    return null;
};

// ========================================
// @desc    Create a new lecture
// @route   POST /api/lectures
// @access  OWNER ONLY (Waqar)
// ========================================
exports.createLecture = async (req, res) => {
    try {
        // STRICT PERMISSION: Only OWNER (Waqar) can upload lectures
        if (req.user.role !== "OWNER") {
            return res.status(403).json({
                success: false,
                message: "🚫 Access denied. Only Waqar can upload lectures. Teachers should send YouTube links to Waqar.",
            });
        }

        const { title, youtubeUrl, description, classRef, subject, gradeLevel, isLocked, order } = req.body;

        // Validate required fields
        if (!title || !youtubeUrl || !classRef || !subject || !gradeLevel) {
            return res.status(400).json({
                success: false,
                message: "Please provide title, YouTube URL, class, subject, and grade level",
            });
        }

        // Extract YouTube ID
        const youtubeId = extractYouTubeID(youtubeUrl);
        if (!youtubeId) {
            return res.status(400).json({
                success: false,
                message: "Invalid YouTube URL. Please provide a valid YouTube link.",
            });
        }

        // Verify class exists
        const classExists = await Class.findById(classRef);
        if (!classExists) {
            return res.status(404).json({
                success: false,
                message: "Class not found",
            });
        }

        // Create lecture
        const lecture = await Lecture.create({
            title,
            youtubeUrl,
            youtubeId,
            description: description || "",
            classRef,
            teacherRef: req.user._id,
            subject,
            gradeLevel,
            isLocked: isLocked || false,
            order: order || 0,
        });

        // Populate for response
        await lecture.populate([
            { path: "classRef", select: "classTitle className name grade section group gradeLevel" },
            { path: "teacherRef", select: "fullName" },
        ]);

        console.log(`🎥 Lecture created: "${title}" by ${req.user.fullName}`);

        res.status(201).json({
            success: true,
            message: `Lecture "${title}" created successfully`,
            data: lecture,
        });
    } catch (error) {
        console.error("❌ Error creating lecture:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create lecture",
            error: error.message,
        });
    }
};

// ========================================
// @desc    Get all lectures (Admin/Owner view - God Mode)
// @route   GET /api/lectures
// @access  Admin, Owner
// ========================================
exports.getAllLectures = async (req, res) => {
    try {
        // Only OWNER/ADMIN can see all lectures
        if (req.user.role !== "OWNER" && req.user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin privileges required.",
            });
        }

        const lectures = await Lecture.find()
            .populate("classRef", "classTitle className name grade section group gradeLevel")
            .populate("teacherRef", "fullName")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: lectures.length,
            data: lectures,
        });
    } catch (error) {
        console.error("❌ Error fetching lectures:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lectures",
            error: error.message,
        });
    }
};

// ========================================
// @desc    Get teacher's own lectures
// @route   GET /api/lectures/my-lectures
// @access  Teacher, Admin, Owner
// ========================================
exports.getTeacherLectures = async (req, res) => {
    try {
        let query = {};

        // If OWNER/ADMIN, they can see all lectures (God Mode)
        if (req.user.role !== "OWNER" && req.user.role !== "ADMIN") {
            query.teacherRef = req.user._id;
        }

        const lectures = await Lecture.find(query)
            .populate("classRef", "classTitle className name grade section group gradeLevel")
            .populate("teacherRef", "fullName")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: lectures.length,
            data: lectures,
        });
    } catch (error) {
        console.error("❌ Error fetching teacher lectures:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lectures",
            error: error.message,
        });
    }
};

// ========================================
// @desc    Get lectures for a specific class (Student view)
// @route   GET /api/lectures/class/:classId
// @access  Authenticated (Students enrolled in class)
// ========================================
exports.getClassLectures = async (req, res) => {
    try {
        const { classId } = req.params;

        // Fetch lectures for this class (exclude locked ones for students)
        const lectures = await Lecture.find({
            classRef: classId,
            isLocked: false,
        })
            .populate("classRef", "classTitle className name grade section group gradeLevel")
            .populate("teacherRef", "fullName")
            .sort({ order: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: lectures.length,
            data: lectures,
        });
    } catch (error) {
        console.error("❌ Error fetching class lectures:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lectures",
            error: error.message,
        });
    }
};

// ========================================
// @desc    Get lectures for student's enrolled class
// @route   GET /api/lectures/my-classroom
// @access  Student (based on session token)
// ========================================
exports.getMyClassroomLectures = async (req, res) => {
    try {
        const { studentId } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID is required",
            });
        }

        // Find student and their class
        const student = await Student.findOne({ studentId }).populate("classRef");
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        if (!student.classRef) {
            return res.status(400).json({
                success: false,
                message: "Student is not enrolled in any class",
            });
        }

        // Fetch unlocked lectures for student's class
        const lectures = await Lecture.find({
            classRef: student.classRef._id,
            isLocked: false,
        })
            .populate("classRef", "classTitle className name grade section group gradeLevel")
            .populate("teacherRef", "fullName")
            .sort({ subject: 1, order: 1, createdAt: -1 });

        // Group by subject for Netflix-style display
        const groupedLectures = lectures.reduce((acc, lecture) => {
            const subject = lecture.subject || "General";
            if (!acc[subject]) {
                acc[subject] = [];
            }
            acc[subject].push(lecture);
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            count: lectures.length,
            className: student.classRef.name,
            data: lectures,
            grouped: groupedLectures,
        });
    } catch (error) {
        console.error("❌ Error fetching classroom lectures:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch classroom lectures",
            error: error.message,
        });
    }
};

// ========================================
// @desc    Get lectures for logged-in student (Smart Filter)
// @route   GET /api/lectures/student
// @access  Student (filtered by grade and subjects)
// ========================================
exports.getStudentLectures = async (req, res) => {
    try {
        // Get student ID from authenticated user
        const studentId = req.user.studentId;
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID not found in user session",
            });
        }

        // Find student with class reference
        const student = await Student.findOne({ studentId }).populate("classRef");
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        if (!student.classRef) {
            return res.status(400).json({
                success: false,
                message: "Student is not enrolled in any class",
            });
        }

        // Get student's subjects (exact name matching)
        const studentSubjects = student.subjects.map(s => s.name);
        
        // Smart filter: Match by gradeLevel AND subject
        const lectures = await Lecture.find({
            gradeLevel: student.classRef.gradeLevel,  // Exact grade level match
            subject: { $in: studentSubjects },        // Exact subject match from enrollment
            isLocked: false,                          // Only unlocked lectures
        })
            .populate("classRef", "classTitle className name grade section group gradeLevel")
            .populate("teacherRef", "fullName")
            .sort({ subject: 1, createdAt: -1 });

        // Group by subject for clean display
        const groupedLectures = lectures.reduce((acc, lecture) => {
            const subject = lecture.subject || "General";
            if (!acc[subject]) {
                acc[subject] = [];
            }
            acc[subject].push(lecture);
            return acc;
        }, {});

        console.log(`📚 Student ${studentId} (${student.classRef.gradeLevel}) viewing ${lectures.length} lectures in subjects: ${studentSubjects.join(', ')}`);

        res.status(200).json({
            success: true,
            count: lectures.length,
            gradeLevel: student.classRef.gradeLevel,
            enrolledSubjects: studentSubjects,
            data: lectures,
            grouped: groupedLectures,
        });
    } catch (error) {
        console.error("❌ Error fetching student lectures:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lectures",
            error: error.message,
        });
    }
};

// ========================================
// @desc    Update a lecture
// @route   PUT /api/lectures/:id
// @access  OWNER ONLY (Waqar)
// ========================================
exports.updateLecture = async (req, res) => {
    try {
        // STRICT PERMISSION: Only OWNER (Waqar) can update lectures
        if (req.user.role !== "OWNER") {
            return res.status(403).json({
                success: false,
                message: "🚫 Access denied. Only Waqar can update lectures.",
            });
        }

        const { id } = req.params;
        const { title, youtubeUrl, description, classRef, subject, gradeLevel, isLocked, order } = req.body;

        const lecture = await Lecture.findById(id);
        if (!lecture) {
            return res.status(404).json({
                success: false,
                message: "Lecture not found",
            });
        }

        // Update fields
        if (title) lecture.title = title;
        if (description !== undefined) lecture.description = description;
        if (classRef) lecture.classRef = classRef;
        if (subject) lecture.subject = subject;
        if (gradeLevel) lecture.gradeLevel = gradeLevel;
        if (typeof isLocked === "boolean") lecture.isLocked = isLocked;
        if (order !== undefined) lecture.order = order;

        // Update YouTube URL and extract new ID if changed
        if (youtubeUrl && youtubeUrl !== lecture.youtubeUrl) {
            const youtubeId = extractYouTubeID(youtubeUrl);
            if (!youtubeId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid YouTube URL",
                });
            }
            lecture.youtubeUrl = youtubeUrl;
            lecture.youtubeId = youtubeId;
        }

        await lecture.save();
        await lecture.populate([
            { path: "classRef", select: "classTitle className name grade section group gradeLevel" },
            { path: "teacherRef", select: "fullName" },
        ]);

        console.log(`✏️ Lecture updated: "${lecture.title}"`);

        res.status(200).json({
            success: true,
            message: `Lecture "${lecture.title}" updated successfully`,
            data: lecture,
        });
    } catch (error) {
        console.error("❌ Error updating lecture:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update lecture",
            error: error.message,
        });
    }
};

// ========================================
// @desc    Delete a lecture
// @route   DELETE /api/lectures/:id
// @access  OWNER ONLY (Waqar)
// ========================================
exports.deleteLecture = async (req, res) => {
    try {
        // STRICT PERMISSION: Only OWNER (Waqar) can delete lectures
        if (req.user.role !== "OWNER") {
            return res.status(403).json({
                success: false,
                message: "🚫 Access denied. Only Waqar can delete lectures.",
            });
        }

        const { id } = req.params;

        const lecture = await Lecture.findById(id);
        if (!lecture) {
            return res.status(404).json({
                success: false,
                message: "Lecture not found",
            });
        }

        const lectureTitle = lecture.title;
        await Lecture.findByIdAndDelete(id);

        console.log(`🗑️ Lecture deleted: "${lectureTitle}"`);

        res.status(200).json({
            success: true,
            message: `Lecture "${lectureTitle}" deleted successfully`,
        });
    } catch (error) {
        console.error("❌ Error deleting lecture:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete lecture",
            error: error.message,
        });
    }
};

// ========================================
// @desc    Increment view count
// @route   POST /api/lectures/:id/view
// @access  Authenticated
// ========================================
exports.incrementViewCount = async (req, res) => {
    try {
        const { id } = req.params;

        const lecture = await Lecture.findByIdAndUpdate(
            id,
            { $inc: { viewCount: 1 } },
            { new: true }
        );

        if (!lecture) {
            return res.status(404).json({
                success: false,
                message: "Lecture not found",
            });
        }

        res.status(200).json({
            success: true,
            viewCount: lecture.viewCount,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update view count",
        });
    }
};

// ========================================
// @desc    Validate YouTube URL (preview)
// @route   POST /api/lectures/validate-url
// @access  Authenticated
// ========================================
exports.validateYouTubeUrl = async (req, res) => {
    try {
        const { url } = req.body;

        const youtubeId = extractYouTubeID(url);
        if (!youtubeId) {
            return res.status(400).json({
                success: false,
                message: "Invalid YouTube URL",
                valid: false,
            });
        }

        res.status(200).json({
            success: true,
            valid: true,
            youtubeId,
            thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
            thumbnailUrlHQ: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
            embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to validate URL",
        });
    }
};
