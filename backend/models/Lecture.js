/**
 * Lecture Model - Academic Video Module
 * Stores YouTube lecture videos linked to classes and teachers
 */

const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Lecture title is required"],
            trim: true,
            maxlength: [200, "Title cannot exceed 200 characters"],
        },
        youtubeUrl: {
            type: String,
            required: [true, "YouTube URL is required"],
            trim: true,
        },
        youtubeId: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, "Description cannot exceed 1000 characters"],
        },
        classRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            required: [true, "Class reference is required"],
        },
        teacherRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Teacher reference is required"],
        },
        // Standardized grade level matching Class model exactly
        gradeLevel: {
            type: String,
            required: [true, "Grade level is required"],
            enum: {
                values: [
                    "9th Grade",
                    "10th Grade",
                    "11th Grade",
                    "12th Grade",
                    "MDCAT Prep",
                    "ECAT Prep",
                    "Tuition Classes",
                ],
                message: "{VALUE} is not a valid grade level",
            },
        },
        // Standardized subject matching Admission module exactly
        subject: {
            type: String,
            required: [true, "Subject is required"],
            enum: {
                values: [
                    "Physics",
                    "Chemistry",
                    "Mathematics",
                    "Biology",
                    "English",
                    "Urdu",
                    "Computer Science",
                    "Islamiat",
                    "Pakistan Studies",
                    "General Science",
                    "Other",
                ],
                message: "{VALUE} is not a valid subject",
            },
            trim: true,
        },
        duration: {
            type: String,
            trim: true,
        },
        isLocked: {
            type: Boolean,
            default: false,
        },
        viewCount: {
            type: Number,
            default: 0,
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
lectureSchema.index({ classRef: 1, subject: 1 });
lectureSchema.index({ teacherRef: 1 });
lectureSchema.index({ gradeLevel: 1, subject: 1 }); // For student filtering
lectureSchema.index({ createdAt: -1 });

// Virtual for thumbnail URL
lectureSchema.virtual("thumbnailUrl").get(function () {
    if (this.youtubeId) {
        return `https://img.youtube.com/vi/${this.youtubeId}/mqdefault.jpg`;
    }
    return null;
});

// Virtual for high-quality thumbnail
lectureSchema.virtual("thumbnailUrlHQ").get(function () {
    if (this.youtubeId) {
        return `https://img.youtube.com/vi/${this.youtubeId}/maxresdefault.jpg`;
    }
    return null;
});

// Ensure virtuals are included in JSON output
lectureSchema.set("toJSON", { virtuals: true });
lectureSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Lecture", lectureSchema);
