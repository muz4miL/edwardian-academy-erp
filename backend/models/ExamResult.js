const mongoose = require("mongoose");

/**
 * ExamResult Model
 * 
 * Stores individual student exam submissions.
 * Features:
 * - Compound unique index prevents duplicate submissions
 * - Stores student's answers for review
 * - Auto-calculated score and percentage
 * - Server-side time tracking for anti-cheat
 */
const examResultSchema = new mongoose.Schema(
    {
        // Reference to the student
        studentRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: [true, "Student reference is required"],
        },

        // Reference to the exam
        examRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: [true, "Exam reference is required"],
        },

        // Student's selected answers (array of option indices: [0, 2, 1, 3...])
        answers: {
            type: [Number],
            required: true,
        },

        // Auto-calculated score (number of correct answers)
        score: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        // Total marks for this exam (snapshot at submission time)
        totalMarks: {
            type: Number,
            required: true,
        },

        // Calculated percentage
        percentage: {
            type: Number,
            default: 0,
        },

        // When the student started the exam
        startedAt: {
            type: Date,
            required: true,
        },

        // When the student submitted
        submittedAt: {
            type: Date,
            default: Date.now,
        },

        // Time taken in seconds (for leaderboard sorting)
        timeTakenSeconds: {
            type: Number,
            default: 0,
        },

        // ANTI-CHEAT: Track suspicious behavior
        tabSwitchCount: {
            type: Number,
            default: 0,
        },

        // Was this submission flagged for review?
        isFlagged: {
            type: Boolean,
            default: false,
        },

        // Flag reason (if any)
        flagReason: {
            type: String,
            trim: true,
        },

        // Was this auto-submitted due to timeout?
        isAutoSubmitted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// CRITICAL: Compound unique index to prevent duplicate submissions
// A student can only submit ONE result per exam
examResultSchema.index({ studentRef: 1, examRef: 1 }, { unique: true });

// Index for efficient leaderboard queries
examResultSchema.index({ examRef: 1, score: -1, timeTakenSeconds: 1 });

// Virtual: Pass/Fail status
examResultSchema.virtual("isPassed").get(function () {
    return this.percentage >= 50; // Could be made configurable
});

// Virtual: Grade letter
examResultSchema.virtual("grade").get(function () {
    if (this.percentage >= 90) return "A+";
    if (this.percentage >= 80) return "A";
    if (this.percentage >= 70) return "B";
    if (this.percentage >= 60) return "C";
    if (this.percentage >= 50) return "D";
    return "F";
});

// Pre-save: Calculate percentage and time taken
examResultSchema.pre("save", function () {
    // Calculate percentage
    if (this.totalMarks > 0) {
        this.percentage = Math.round((this.score / this.totalMarks) * 100);
    }

    // Calculate time taken
    if (this.startedAt && this.submittedAt) {
        this.timeTakenSeconds = Math.round(
            (this.submittedAt.getTime() - this.startedAt.getTime()) / 1000
        );
    }
});

// Ensure virtuals are included in JSON output
examResultSchema.set("toJSON", { virtuals: true });
examResultSchema.set("toObject", { virtuals: true });

const ExamResult = mongoose.model("ExamResult", examResultSchema);

module.exports = ExamResult;
