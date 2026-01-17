const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    // Session identifier (auto-generated)
    sessionId: {
        type: String,
        unique: true,
    },

    // Session name (e.g., "MDCAT 2026", "Academic Year 2025-26")
    sessionName: {
        type: String,
        required: [true, 'Session name is required'],
        trim: true,
    },

    // Session description
    description: {
        type: String,
        trim: true,
    },

    // Start date
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
    },

    // End date
    endDate: {
        type: Date,
        required: [true, 'End date is required'],
    },

    // Session status
    status: {
        type: String,
        enum: ['active', 'completed', 'upcoming'],
        default: 'upcoming',
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

// Pre-save hook to generate sessionId and update timestamp
sessionSchema.pre('save', async function () {
    // Update timestamp
    this.updatedAt = new Date();

    // Generate sessionId if new document
    if (this.isNew && !this.sessionId) {
        try {
            const lastSession = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });

            let nextNumber = 1;
            if (lastSession && lastSession.sessionId) {
                const match = lastSession.sessionId.match(/SES-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            this.sessionId = `SES-${String(nextNumber).padStart(3, '0')}`;
            console.log(`✅ Generated sessionId: ${this.sessionId}`);
        } catch (error) {
            console.error('Error generating sessionId:', error);
            this.sessionId = `SES-${Date.now()}`;
        }
    }

    // Auto-calculate status based on dates
    const now = new Date();
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    if (now < start) {
        this.status = 'upcoming';
    } else if (now >= start && now <= end) {
        this.status = 'active';
    } else {
        this.status = 'completed';
    }
});

// Virtual for formatted date range
sessionSchema.virtual('dateRange').get(function () {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const start = new Date(this.startDate).toLocaleDateString('en-US', options);
    const end = new Date(this.endDate).toLocaleDateString('en-US', options);
    return `${start} - ${end}`;
});

// Virtual for duration in days
sessionSchema.virtual('durationDays').get(function () {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON output
sessionSchema.set('toJSON', { virtuals: true });
sessionSchema.set('toObject', { virtuals: true });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
