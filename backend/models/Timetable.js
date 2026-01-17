const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    // Timetable entry identifier (auto-generated)
    entryId: {
        type: String,
        unique: true,
    },

    // Reference to Class
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: [true, 'Class reference is required'],
    },

    // Reference to Teacher
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: [true, 'Teacher reference is required'],
    },

    // Subject being taught
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
    },

    // Day of the week
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: [true, 'Day is required'],
    },

    // Start time (stored as string for UI display, e.g., "04:00 PM")
    startTime: {
        type: String,
        required: [true, 'Start time is required'],
    },

    // End time
    endTime: {
        type: String,
        required: [true, 'End time is required'],
    },

    // Room/Location (optional)
    room: {
        type: String,
        trim: true,
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
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

// Pre-save hook to generate entryId and update timestamp
timetableSchema.pre('save', async function () {
    this.updatedAt = new Date();

    if (this.isNew && !this.entryId) {
        try {
            const lastEntry = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });

            let nextNumber = 1;
            if (lastEntry && lastEntry.entryId) {
                const match = lastEntry.entryId.match(/TT-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            this.entryId = `TT-${String(nextNumber).padStart(4, '0')}`;
            console.log(`✅ Generated entryId: ${this.entryId}`);
        } catch (error) {
            console.error('Error generating entryId:', error);
            this.entryId = `TT-${Date.now()}`;
        }
    }
});

// Virtual for duration display
timetableSchema.virtual('duration').get(function () {
    return `${this.startTime} - ${this.endTime}`;
});

// Ensure virtuals are included in JSON output
timetableSchema.set('toJSON', { virtuals: true });
timetableSchema.set('toObject', { virtuals: true });

const Timetable = mongoose.model('Timetable', timetableSchema);

module.exports = Timetable;
