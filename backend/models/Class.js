const mongoose = require('mongoose');

// Subject sub-schema with name and fee
const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    fee: {
        type: Number,
        default: 0,
        min: [0, 'Fee cannot be negative'],
    },
}, { _id: false });

const classSchema = new mongoose.Schema({
    // Class identifier (auto-generated)
    classId: {
        type: String,
        unique: true,
    },

    // Class name (e.g., "9th Grade", "10th Grade", "MDCAT Prep")
    className: {
        type: String,
        required: [true, 'Class name is required'],
        trim: true,
    },

    // Section (e.g., "Medical", "Engineering", "Evening", "Morning")
    section: {
        type: String,
        required: [true, 'Section is required'],
        trim: true,
    },

    // Subjects offered in this class with individual fees
    subjects: [subjectSchema],

    // Base monthly fee for this class (fallback/default fee per subject)
    baseFee: {
        type: Number,
        default: 0,
        min: [0, 'Base fee cannot be negative'],
    },

    // Class status
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

// Pre-save hook to generate classId, update timestamp, and ensure subject fees
classSchema.pre('save', async function () {
    // Update timestamp
    this.updatedAt = new Date();

    // Ensure each subject has a fee (default to baseFee if missing)
    if (this.subjects && Array.isArray(this.subjects)) {
        this.subjects = this.subjects.map(subject => {
            // Handle legacy string format migration
            if (typeof subject === 'string') {
                return {
                    name: subject,
                    fee: this.baseFee || 0,
                };
            }
            // Ensure fee exists, default to baseFee
            return {
                name: subject.name,
                fee: subject.fee !== undefined && subject.fee !== null ? subject.fee : (this.baseFee || 0),
            };
        });
    }

    // Generate classId if new document
    if (this.isNew && !this.classId) {
        try {
            // Find the highest existing classId
            const lastClass = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });

            let nextNumber = 1;
            if (lastClass && lastClass.classId) {
                const match = lastClass.classId.match(/CLS-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            this.classId = `CLS-${String(nextNumber).padStart(3, '0')}`;
            console.log(`✅ Generated classId: ${this.classId}`);
        } catch (error) {
            console.error('Error generating classId:', error);
            // Fallback to timestamp-based ID
            this.classId = `CLS-${Date.now()}`;
        }
    }
});

// Virtual for display name (e.g., "10th Grade - Medical")
classSchema.virtual('displayName').get(function () {
    return `${this.className} - ${this.section}`;
});

// Virtual for total fee (sum of all subject fees)
classSchema.virtual('totalSubjectFees').get(function () {
    if (!this.subjects || !Array.isArray(this.subjects)) return 0;
    return this.subjects.reduce((sum, subject) => sum + (subject.fee || 0), 0);
});

// Ensure virtuals are included in JSON output
classSchema.set('toJSON', { virtuals: true });
classSchema.set('toObject', { virtuals: true });

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
