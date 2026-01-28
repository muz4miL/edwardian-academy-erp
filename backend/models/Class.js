const mongoose = require("mongoose");

// Subject sub-schema with name and fee
const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fee: {
      type: Number,
      default: 0,
      min: [0, "Fee cannot be negative"],
    },
  },
  { _id: false },
);

const classSchema = new mongoose.Schema({
  // Class identifier (auto-generated)
  classId: {
    type: String,
    unique: true,
  },

  // ========== NEW: Class Instance Fields ==========

  // Class Title - Primary unique identifier (e.g., "10th Medical Batch A")
  classTitle: {
    type: String,
    required: [true, "Class title is required"],
    unique: true,
    trim: true,
  },

  // Grade Level - Enum for standardized grade selection
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

  // Session Type - For ETEA/MDCAT special fee handling
  sessionType: {
    type: String,
    enum: {
      values: ["regular", "etea", "mdcat", "ecat", "test-prep"],
      message: "{VALUE} is not a valid session type",
    },
    default: "regular",
  },

  // Group - Academic stream/category (e.g., "Pre-Medical", "Pre-Engineering")
  group: {
    type: String,
    required: [true, "Group is required"],
    enum: {
      values: ["Pre-Medical", "Pre-Engineering", "Computer Science", "Arts"],
      message: "{VALUE} is not a valid group",
    },
    trim: true,
  },

  // Shift - Optional timing category (e.g., "Morning", "Evening")
  shift: {
    type: String,
    required: false,
    enum: {
      values: [
        "Morning",
        "Evening",
        "Weekend",
        "Batch A",
        "Batch B",
        "Batch C",
      ],
      message: "{VALUE} is not a valid shift",
    },
    trim: true,
  },

  // ========== SCHEDULE FIELDS ==========

  // Days of the week this class runs
  days: [
    {
      type: String,
      enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
  ],

  // Start Time (24h format, e.g., "16:00")
  startTime: {
    type: String,
    required: [true, "Start time is required"],
    match: [
      /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format (use HH:MM)",
    ],
  },

  // End Time (24h format, e.g., "18:00")
  endTime: {
    type: String,
    required: [true, "End time is required"],
    match: [
      /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format (use HH:MM)",
    ],
  },

  // Room Number (free text for flexibility)
  roomNumber: {
    type: String,
    trim: true,
    default: "TBD",
  },

  // ========== CAPACITY TRACKING ==========

  // Maximum students allowed
  maxCapacity: {
    type: Number,
    default: 30,
    min: [1, "Capacity must be at least 1"],
  },

  // Current enrolled count (updated when students join)
  enrolledCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  // ========== EXISTING FIELDS ==========

  // Assigned Teacher/Professor for this class
  assignedTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
  },

  // Teacher name (denormalized for quick display)
  teacherName: {
    type: String,
    trim: true,
  },

  // Revenue Mode: 'standard' (70/30 split) or 'partner' (100% to teacher)
  revenueMode: {
    type: String,
    enum: ["standard", "partner"],
    default: "standard",
  },

  // Subjects offered in this class with individual fees
  subjects: [subjectSchema],

  // Base monthly fee for this class (fallback/default fee per subject)
  baseFee: {
    type: Number,
    default: 0,
    min: [0, "Base fee cannot be negative"],
  },

  // Class status
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to generate classId, update timestamp, and ensure subject fees
classSchema.pre("save", async function () {
  // Update timestamp
  this.updatedAt = new Date();

  // Ensure each subject has a fee (default to baseFee if missing)
  if (this.subjects && Array.isArray(this.subjects)) {
    this.subjects = this.subjects.map((subject) => {
      // Handle legacy string format migration
      if (typeof subject === "string") {
        return {
          name: subject,
          fee: this.baseFee || 0,
        };
      }
      // Ensure fee exists, default to baseFee
      return {
        name: subject.name,
        fee:
          subject.fee !== undefined && subject.fee !== null
            ? subject.fee
            : this.baseFee || 0,
      };
    });
  }

  // Generate classId if new document
  if (this.isNew && !this.classId) {
    try {
      // Find the highest existing classId
      const lastClass = await this.constructor.findOne(
        {},
        {},
        { sort: { createdAt: -1 } },
      );

      let nextNumber = 1;
      if (lastClass && lastClass.classId) {
        const match = lastClass.classId.match(/CLS-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      this.classId = `CLS-${String(nextNumber).padStart(3, "0")}`;
      console.log(`✅ Generated classId: ${this.classId}`);
    } catch (error) {
      console.error("Error generating classId:", error);
      // Fallback to timestamp-based ID
      this.classId = `CLS-${Date.now()}`;
    }
  }
});

// Virtual for display name (uses classTitle as primary identifier)
classSchema.virtual("displayName").get(function () {
  return (
    this.classTitle ||
    `${this.gradeLevel} - ${this.group}${this.shift ? ` (${this.shift})` : ""}`
  );
});

// Virtual for schedule display (e.g., "Mon, Wed, Fri | 4:00-6:00 PM")
classSchema.virtual("scheduleDisplay").get(function () {
  const daysStr = this.days?.join(", ") || "TBD";
  const timeStr =
    this.startTime && this.endTime
      ? `${this.startTime} - ${this.endTime}`
      : "TBD";
  return `${daysStr} | ${timeStr}`;
});

// Virtual for full public display (e.g., "10th Medical Batch A | Mon, Wed, Fri | 4:00-6:00 PM")
classSchema.virtual("fullDisplayName").get(function () {
  return `${this.classTitle} | ${this.scheduleDisplay}`;
});

// Virtual for total fee (sum of all subject fees)
classSchema.virtual("totalSubjectFees").get(function () {
  if (!this.subjects || !Array.isArray(this.subjects)) return 0;
  return this.subjects.reduce((sum, subject) => sum + (subject.fee || 0), 0);
});

// Virtual for capacity status
classSchema.virtual("capacityStatus").get(function () {
  const remaining = this.maxCapacity - this.enrolledCount;
  if (remaining <= 0) return "FULL";
  if (remaining <= 5) return "ALMOST_FULL";
  return "AVAILABLE";
});

// Ensure virtuals are included in JSON output
classSchema.set("toJSON", { virtuals: true });
classSchema.set("toObject", { virtuals: true });

const Class = mongoose.model("Class", classSchema);

module.exports = Class;
