/**
 * Website Configuration Model
 * Stores public site content managed by OWNER via CMS
 */

const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 0, // Higher number = higher priority
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const websiteConfigSchema = new mongoose.Schema(
  {
    // Hero Section (main banner)
    heroSection: {
      title: {
        type: String,
        default: "The Edwardian's Academy",
      },
      subtitle: {
        type: String,
        default: "Your Pathway to Success",
      },
      tagline: {
        type: String,
        default: "Excellence in Education Since 2017",
      },
    },

    // Scrolling announcements / notice board
    announcements: [announcementSchema],

    // Admission status toggle
    admissionStatus: {
      isOpen: {
        type: Boolean,
        default: true,
      },
      notice: {
        type: String,
        default: "Admissions are now OPEN for the new session!",
      },
      closedMessage: {
        type: String,
        default: "Admissions are currently closed. Please check back later.",
      },
    },

    // Contact information
    contactInfo: {
      phone: {
        type: String,
        default: "091-5601600",
      },
      mobile: {
        type: String,
        default: "0334-5852326",
      },
      email: {
        type: String,
        default: "theedwardianacademy2017@gmail.com",
      },
      address: {
        type: String,
        default:
          "Opposite Islamia College Behind, Danishabad University Road Peshawar",
      },
      facebook: {
        type: String,
        default: "https://www.facebook.com/theedwardianacademy",
      },
    },

    // Featured subjects for display
    featuredSubjects: {
      type: [String],
      default: ["Chemistry", "Physics", "Biology", "Mathematics"],
    },

    // Academy highlights/features
    highlights: [
      {
        title: { type: String },
        description: { type: String },
        icon: { type: String }, // Icon name for frontend
      },
    ],

    // Last updated info
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Ensure only one config document exists (singleton pattern)
websiteConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    // Create default config if none exists
    config = await this.create({
      highlights: [
        {
          title: "Expert Faculty",
          description: "Learn from experienced professors",
          icon: "GraduationCap",
        },
        {
          title: "Fresh Tuition Classes",
          description: "F.Sc classes for First & Second Year",
          icon: "BookOpen",
        },
        {
          title: "Personalized Attention",
          description: "Small batch sizes for better learning",
          icon: "Users",
        },
        {
          title: "Proven Results",
          description: "Consistent board exam success",
          icon: "Trophy",
        },
      ],
    });
  }
  return config;
};

module.exports = mongoose.model("WebsiteConfig", websiteConfigSchema);
