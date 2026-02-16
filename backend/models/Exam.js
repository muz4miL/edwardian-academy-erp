const mongoose = require("mongoose");

/**
 * Question sub-schema for MCQ questions
 */
const questionSchema = new mongoose.Schema(
    {
        questionText: {
            type: String,
            required: [true, "Question text is required"],
            trim: true,
        },
        options: {
            type: [String],
            required: true,
            validate: {
                validator: function (v) {
                    return v && v.length === 4;
                },
                message: "Each question must have exactly 4 options",
            },
        },
        correctOptionIndex: {
            type: Number,
            required: true,
            min: 0,
            max: 3,
        },
    },
    { _id: false }
);

/**
 * Exam Model
 * 
 * Stores MCQ exams created by teachers for specific classes.
 * Questions contain correctOptionIndex which is STRIPPED from
 * student-facing API responses to prevent cheating.
 */
const examSchema = new mongoose.Schema(
    {
        // Auto-generated exam ID (e.g., "EXAM-001")
        examId: {
            type: String,
            unique: true,
        },

        // Exam title (e.g., "Physics Chapter 1 Quiz")
        title: {
            type: String,
            required: [true, "Exam title is required"],
            trim: true,
        },

        // Subject (e.g., "Physics", "Chemistry")
        subject: {
            type: String,
            required: [true, "Subject is required"],
            trim: true,
        },

        // Reference to Class (which students can take this exam)
        classRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            required: [true, "Class reference is required"],
        },

        // Class name (denormalized for quick display)
        className: {
            type: String,
            trim: true,
        },

        // Teacher who created this exam
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Duration in minutes
        durationMinutes: {
            type: Number,
            required: true,
            default: 30,
            min: [5, "Exam must be at least 5 minutes"],
            max: [180, "Exam cannot exceed 3 hours"],
        },

        // When the exam becomes available for students
        startTime: {
            type: Date,
            required: [true, "Start time is required"],
        },

        // When the exam closes (no more submissions accepted)
        endTime: {
            type: Date,
            required: [true, "End time is required"],
        },

        // Array of MCQ questions
        questions: {
            type: [questionSchema],
            required: true,
            validate: {
                validator: function (v) {
                    return v && v.length >= 1;
                },
                message: "Exam must have at least 1 question",
            },
        },

        // Exam status
        status: {
            type: String,
            enum: ["draft", "published", "completed"],
            default: "draft",
        },

        // ANTI-SPOILER: Should student see score immediately after submission?
        showResultToStudent: {
            type: Boolean,
            default: false,
        },

        // Instructions for students (optional)
        instructions: {
            type: String,
            trim: true,
            default: "Read each question carefully. Select the best answer.",
        },

        // Passing percentage (optional)
        passingPercentage: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
        },
    },
    {
        timestamps: true,
    }
);

// Virtual: Total marks (1 per question)
examSchema.virtual("totalMarks").get(function () {
    return this.questions?.length || 0;
});

// Virtual: Is exam currently active?
examSchema.virtual("isActive").get(function () {
    const now = new Date();
    return this.status === "published" && now >= this.startTime && now <= this.endTime;
});

// Virtual: Has exam ended?
examSchema.virtual("hasEnded").get(function () {
    return new Date() > this.endTime;
});

// Pre-save hook to generate examId
examSchema.pre("save", async function () {
    if (this.isNew && !this.examId) {
        try {
            const lastExam = await this.constructor.findOne(
                {},
                {},
                { sort: { createdAt: -1 } }
            );

            let nextNumber = 1;
            if (lastExam && lastExam.examId) {
                const match = lastExam.examId.match(/EXAM-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            this.examId = `EXAM-${String(nextNumber).padStart(3, "0")}`;
            console.log(`📝 Generated examId: ${this.examId}`);
        } catch (error) {
            console.error("Error generating examId:", error);
            this.examId = `EXAM-${Date.now()}`;
        }
    }
});

// Instance method to get exam without correct answers (for students)
examSchema.methods.getStudentView = function () {
    const examObj = this.toObject({ virtuals: true });

    // CRITICAL: Strip correctOptionIndex from each question
    examObj.questions = examObj.questions.map((q) => ({
        questionText: q.questionText,
        options: q.options,
        // correctOptionIndex is intentionally omitted
    }));

    return examObj;
};

// Ensure virtuals are included in JSON output
examSchema.set("toJSON", { virtuals: true });
examSchema.set("toObject", { virtuals: true });

const Exam = mongoose.model("Exam", examSchema);

module.exports = Exam;
