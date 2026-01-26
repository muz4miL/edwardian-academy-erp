const Exam = require("../models/Exam");
const ExamResult = require("../models/ExamResult");
const Student = require("../models/Student");
const Class = require("../models/Class");

/**
 * Exam Controller
 * 
 * Handles exam CRUD, auto-grading, and anti-cheat measures.
 */

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Teacher/Admin
exports.createExam = async (req, res) => {
    try {
        const {
            title,
            subject,
            classRef,
            durationMinutes,
            startTime,
            endTime,
            questions,
            showResultToStudent,
            instructions,
            passingPercentage,
        } = req.body;

        // Validation
        if (!title || !subject || !classRef || !questions || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Title, subject, class, and at least one question are required",
            });
        }

        // Validate each question
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.questionText || !q.options || q.options.length !== 4) {
                return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1}: Must have question text and exactly 4 options`,
                });
            }
            if (q.correctOptionIndex === undefined || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
                return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1}: Must have a valid correct option (0-3)`,
                });
            }
        }

        // Get class name for denormalization
        const classDoc = await Class.findById(classRef);
        if (!classDoc) {
            return res.status(404).json({
                success: false,
                message: "Class not found",
            });
        }

        const exam = await Exam.create({
            title,
            subject,
            classRef,
            className: classDoc.classTitle || classDoc.displayName,
            createdBy: req.user._id,
            durationMinutes: durationMinutes || 30,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            questions,
            showResultToStudent: showResultToStudent || false,
            instructions,
            passingPercentage,
            status: "published",
        });

        console.log(`📝 Exam created: ${exam.examId} - ${exam.title}`);

        return res.status(201).json({
            success: true,
            message: "Exam created successfully",
            data: exam,
        });
    } catch (error) {
        console.error("❌ Error creating exam:", error);
        return res.status(500).json({
            success: false,
            message: "Server error creating exam",
            error: error.message,
        });
    }
};

// @desc    Get all exams (Admin/Teacher view with answers)
// @route   GET /api/exams
// @access  Teacher/Admin
exports.getAllExams = async (req, res) => {
    try {
        const { status, classRef, subject } = req.query;

        const query = {};
        if (status) query.status = status;
        if (classRef) query.classRef = classRef;
        if (subject) query.subject = subject;

        // Only show exams created by this teacher (unless admin)
        if (req.user.role !== "OWNER" && req.user.role !== "ADMIN") {
            query.createdBy = req.user._id;
        }

        const exams = await Exam.find(query)
            .populate("classRef", "classTitle gradeLevel")
            .populate("createdBy", "fullName")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: exams.length,
            data: exams,
        });
    } catch (error) {
        console.error("❌ Error fetching exams:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching exams",
            error: error.message,
        });
    }
};

// @desc    Get single exam by ID (with answers for teacher)
// @route   GET /api/exams/:id
// @access  Teacher/Admin
exports.getExamById = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id)
            .populate("classRef", "classTitle gradeLevel")
            .populate("createdBy", "fullName");

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: exam,
        });
    } catch (error) {
        console.error("❌ Error fetching exam:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching exam",
            error: error.message,
        });
    }
};

// @desc    Get exams for a class (Student view - NO correct answers)
// @route   GET /api/exams/class/:classId
// @access  Student
exports.getExamsForClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const studentId = req.student?._id;

        const exams = await Exam.find({
            classRef: classId,
            status: "published",
        })
            .populate("classRef", "classTitle")
            .sort({ startTime: -1 });

        // Get student's submissions for these exams
        let studentResults = [];
        if (studentId) {
            studentResults = await ExamResult.find({
                studentRef: studentId,
                examRef: { $in: exams.map((e) => e._id) },
            }).lean();
        }

        // Create a map for quick lookup
        const submissionMap = {};
        studentResults.forEach((result) => {
            submissionMap[result.examRef.toString()] = {
                submittedAt: result.submittedAt,
                score: result.score,
                totalMarks: result.totalMarks,
                percentage: result.percentage,
                grade: result.grade,
                isPassed: result.isPassed,
            };
        });

        // CRITICAL: Strip correct answers and include submission data
        const safeExams = exams.map((exam) => {
            const safeExam = exam.getStudentView();
            const examIdStr = exam._id.toString();
            
            // Include mySubmission if student has taken this exam
            if (submissionMap[examIdStr]) {
                safeExam.mySubmission = submissionMap[examIdStr];
            } else {
                safeExam.mySubmission = null;
            }
            
            return safeExam;
        });

        return res.status(200).json({
            success: true,
            count: safeExams.length,
            data: safeExams,
        });
    } catch (error) {
        console.error("❌ Error fetching exams for class:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching exams",
            error: error.message,
        });
    }
};

// @desc    Get exam for student (NO correct answers)
// @route   GET /api/exams/:id/take
// @access  Student
exports.getExamForStudent = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id)
            .populate("classRef", "classTitle");

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found",
            });
        }

        // Check if exam is currently active
        const now = new Date();
        if (now < exam.startTime) {
            return res.status(403).json({
                success: false,
                message: "Exam has not started yet",
                startsAt: exam.startTime,
            });
        }

        if (now > exam.endTime) {
            return res.status(403).json({
                success: false,
                message: "Exam has ended",
            });
        }

        // Check if student already submitted
        if (req.student) {
            const existingResult = await ExamResult.findOne({
                studentRef: req.student._id,
                examRef: exam._id,
            });

            if (existingResult) {
                return res.status(400).json({
                    success: false,
                    message: "You have already submitted this exam",
                    result: {
                        score: existingResult.score,
                        totalMarks: existingResult.totalMarks,
                        percentage: existingResult.percentage,
                    },
                });
            }
        }

        // Return safe exam (no correct answers)
        return res.status(200).json({
            success: true,
            data: exam.getStudentView(),
        });
    } catch (error) {
        console.error("❌ Error fetching exam for student:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching exam",
            error: error.message,
        });
    }
};

// @desc    Submit exam answers and auto-grade
// @route   POST /api/exams/:id/submit
// @access  Student
exports.submitExam = async (req, res) => {
    try {
        const { answers, startedAt, tabSwitchCount, isAutoSubmitted } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: "Answers array is required",
            });
        }

        const exam = await Exam.findById(req.params.id);

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found",
            });
        }

        const studentId = req.student._id;
        const submittedAt = new Date();
        const examStartTime = new Date(startedAt);

        // Check for duplicate submission
        const existingResult = await ExamResult.findOne({
            studentRef: studentId,
            examRef: exam._id,
        });

        if (existingResult) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted this exam",
                result: {
                    score: existingResult.score,
                    totalMarks: existingResult.totalMarks,
                    percentage: existingResult.percentage,
                },
            });
        }

        // SERVER-SIDE TIME VALIDATION (Anti-Cheat)
        const allowedDurationMs = (exam.durationMinutes + 2) * 60 * 1000; // +2 min buffer
        const actualDurationMs = submittedAt.getTime() - examStartTime.getTime();

        let isFlagged = false;
        let flagReason = "";

        if (actualDurationMs > allowedDurationMs) {
            isFlagged = true;
            flagReason = `Exceeded time limit: ${Math.round(actualDurationMs / 60000)} minutes vs ${exam.durationMinutes} allowed`;
        }

        if (tabSwitchCount > 3) {
            isFlagged = true;
            flagReason += (flagReason ? "; " : "") + `Excessive tab switches: ${tabSwitchCount}`;
        }

        // AUTO-GRADE: Compare answers with correct answers
        let score = 0;
        const totalMarks = exam.questions.length;

        exam.questions.forEach((question, index) => {
            if (answers[index] === question.correctOptionIndex) {
                score++;
            }
        });

        // Calculate percentage
        const percentage = Math.round((score / totalMarks) * 100);

        // Create result
        const result = await ExamResult.create({
            studentRef: studentId,
            examRef: exam._id,
            answers,
            score,
            totalMarks,
            percentage,
            startedAt: examStartTime,
            submittedAt,
            tabSwitchCount: tabSwitchCount || 0,
            isFlagged,
            flagReason,
            isAutoSubmitted: isAutoSubmitted || false,
        });

        console.log(`✅ Exam submitted: ${exam.examId} by student ${studentId} - Score: ${score}/${totalMarks}`);

        // Prepare response based on showResultToStudent setting
        const response = {
            success: true,
            message: exam.showResultToStudent
                ? `Exam submitted. You scored ${score}/${totalMarks} (${percentage}%)`
                : "Exam submitted successfully. Results pending.",
        };

        if (exam.showResultToStudent) {
            response.result = {
                score,
                totalMarks,
                percentage,
                grade: result.grade,
                isPassed: result.isPassed,
                timeTaken: result.timeTakenSeconds,
            };
        } else {
            response.result = {
                message: "Results will be available after the exam window closes",
            };
        }

        return res.status(201).json(response);
    } catch (error) {
        // Handle duplicate key error (compound index)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted this exam",
            });
        }

        console.error("❌ Error submitting exam:", error);
        return res.status(500).json({
            success: false,
            message: "Server error submitting exam",
            error: error.message,
        });
    }
};

// @desc    Get results/leaderboard for an exam
// @route   GET /api/exams/:id/results
// @access  Teacher/Admin
exports.getExamResults = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found",
            });
        }

        const results = await ExamResult.find({ examRef: exam._id })
            .populate("studentRef", "studentName barcodeId class")
            .sort({ score: -1, timeTakenSeconds: 1 });

        // Calculate stats
        const totalSubmissions = results.length;
        const averageScore = totalSubmissions > 0
            ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalSubmissions)
            : 0;
        const passCount = results.filter((r) => r.isPassed).length;
        const flaggedCount = results.filter((r) => r.isFlagged).length;

        return res.status(200).json({
            success: true,
            exam: {
                examId: exam.examId,
                title: exam.title,
                subject: exam.subject,
                totalMarks: exam.totalMarks,
            },
            stats: {
                totalSubmissions,
                averageScore,
                passRate: totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0,
                flaggedCount,
            },
            data: results,
        });
    } catch (error) {
        console.error("❌ Error fetching exam results:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching results",
            error: error.message,
        });
    }
};

// @desc    Get student's own exam results
// @route   GET /api/exams/my-results
// @access  Student
exports.getMyResults = async (req, res) => {
    try {
        const studentId = req.student._id;

        const results = await ExamResult.find({ studentRef: studentId })
            .populate({
                path: "examRef",
                select: "examId title subject className showResultToStudent endTime",
            })
            .sort({ submittedAt: -1 });

        // Filter results - only show scores for exams where showResultToStudent is true OR exam has ended
        const safeResults = results.map((result) => {
            const exam = result.examRef;
            const canShowScore = exam?.showResultToStudent || new Date() > exam?.endTime;

            return {
                _id: result._id,
                exam: {
                    examId: exam?.examId,
                    title: exam?.title,
                    subject: exam?.subject,
                    className: exam?.className,
                },
                submittedAt: result.submittedAt,
                ...(canShowScore
                    ? {
                        score: result.score,
                        totalMarks: result.totalMarks,
                        percentage: result.percentage,
                        grade: result.grade,
                        isPassed: result.isPassed,
                    }
                    : {
                        message: "Results pending",
                    }),
            };
        });

        return res.status(200).json({
            success: true,
            count: safeResults.length,
            data: safeResults,
        });
    } catch (error) {
        console.error("❌ Error fetching student results:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching results",
            error: error.message,
        });
    }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Teacher/Admin
exports.updateExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found",
            });
        }

        // Don't allow updates if exam has started
        if (new Date() >= exam.startTime) {
            return res.status(400).json({
                success: false,
                message: "Cannot update exam after it has started",
            });
        }

        const updatedExam = await Exam.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Exam updated successfully",
            data: updatedExam,
        });
    } catch (error) {
        console.error("❌ Error updating exam:", error);
        return res.status(500).json({
            success: false,
            message: "Server error updating exam",
            error: error.message,
        });
    }
};

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Teacher/Admin
exports.deleteExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found",
            });
        }

        // Delete associated results
        await ExamResult.deleteMany({ examRef: exam._id });

        await exam.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Exam and all results deleted successfully",
        });
    } catch (error) {
        console.error("❌ Error deleting exam:", error);
        return res.status(500).json({
            success: false,
            message: "Server error deleting exam",
            error: error.message,
        });
    }
};
