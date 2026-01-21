const mongoose = require("mongoose");

/**
 * Video Model - LMS Content Module
 * 
 * Stores video content for the Student Portal.
 * Supports YouTube, Bunny.net, and direct URL embeds.
 */

const videoSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Video title is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        // Video URL (YouTube, Bunny.net, or direct link)
        url: {
            type: String,
            required: [true, "Video URL is required"],
            trim: true,
        },
        // Thumbnail image URL
        thumbnail: {
            type: String,
            trim: true,
        },
        // Video provider for special handling
        provider: {
            type: String,
            enum: ["youtube", "bunny", "vimeo", "direct"],
            default: "youtube",
        },
        // Duration in seconds
        duration: {
            type: Number,
            min: 0,
        },
        // Categorization
        classRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
        },
        className: {
            type: String,
            trim: true,
        },
        subjectRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
        },
        subjectName: {
            type: String,
            trim: true,
        },
        // Teacher who uploaded
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Teacher",
        },
        teacherName: {
            type: String,
            trim: true,
        },
        // Visibility control
        isPublished: {
            type: Boolean,
            default: true,
        },
        // Order for playlist sorting
        sortOrder: {
            type: Number,
            default: 0,
        },
        // View tracking
        viewCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Upload metadata
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
videoSchema.index({ classRef: 1, subjectName: 1 });
videoSchema.index({ teacherId: 1 });
videoSchema.index({ isPublished: 1, uploadedAt: -1 });

// Virtual for formatted duration
videoSchema.virtual("formattedDuration").get(function () {
    if (!this.duration) return "N/A";
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

// Ensure virtuals are included
videoSchema.set("toJSON", { virtuals: true });
videoSchema.set("toObject", { virtuals: true });

// Static method to get videos for a student's class
videoSchema.statics.getVideosForClass = async function (classRef, subjectName) {
    const query = {
        classRef,
        isPublished: true
    };

    if (subjectName) {
        query.subjectName = subjectName;
    }

    return this.find(query)
        .sort({ sortOrder: 1, uploadedAt: -1 })
        .populate("teacherId", "name")
        .lean();
};

module.exports = mongoose.model("Video", videoSchema);
