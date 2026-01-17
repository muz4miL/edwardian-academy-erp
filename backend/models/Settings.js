const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
    {
        // Academy Identity
        academyName: {
            type: String,
            default: 'Academy Management System',
            required: true,
            trim: true,
        },
        contactEmail: {
            type: String,
            default: 'admin@academy.com',
            required: true,
            lowercase: true,
            trim: true,
        },
        contactPhone: {
            type: String,
            default: '+92 321 1234567',
            required: true,
            trim: true,
        },
        currency: {
            type: String,
            default: 'PKR',
            enum: ['PKR', 'USD'],
            required: true,
        },

        // Teacher Compensation Defaults
        defaultCompensationMode: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'percentage',
            required: true,
        },
        defaultTeacherShare: {
            type: Number,
            default: 70,
            min: 0,
            max: 100,
        },
        defaultAcademyShare: {
            type: Number,
            default: 30,
            min: 0,
            max: 100,
        },
        defaultBaseSalary: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Student Financial Policies
        defaultLateFee: {
            type: Number,
            default: 500,
            min: 0,
            required: true,
        },
        feeDueDay: {
            type: String,
            default: '10',
            enum: ['1', '5', '10', '15'],
            required: true,
        },

        // Global Subject Fee Configuration (Peshawar Standard Rates)
        defaultSubjectFees: [
            {
                name: {
                    type: String,
                    required: true,
                    trim: true,
                },
                fee: {
                    type: Number,
                    default: 0,
                    min: [0, 'Subject fee cannot be negative'],
                },
            },
        ],
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
    }
);

// Pre-save hook: Normalize and deduplicate defaultSubjectFees
SettingsSchema.pre('save', function () {
    if (this.defaultSubjectFees && Array.isArray(this.defaultSubjectFees)) {
        const subjectMap = new Map();

        for (const subject of this.defaultSubjectFees) {
            if (!subject.name) continue;

            // Normalize name (trim and proper capitalization)
            const normalizedName = subject.name.trim();
            const key = normalizedName.toLowerCase();

            // Keep the one with highest fee if duplicate exists
            if (subjectMap.has(key)) {
                const existing = subjectMap.get(key);
                if (subject.fee > existing.fee) {
                    subjectMap.set(key, { name: normalizedName, fee: subject.fee });
                }
            } else {
                subjectMap.set(key, { name: normalizedName, fee: subject.fee || 0 });
            }
        }

        // Replace with deduplicated list
        this.defaultSubjectFees = Array.from(subjectMap.values());
        console.log(`✅ Normalized ${this.defaultSubjectFees.length} global subject fees`);
    }

    // Set Peshawar standard rates on first save if empty
    if (this.isNew && (!this.defaultSubjectFees || this.defaultSubjectFees.length === 0)) {
        this.defaultSubjectFees = [
            { name: 'Biology', fee: 3000 },
            { name: 'Physics', fee: 3000 },
            { name: 'Chemistry', fee: 2500 },
            { name: 'Mathematics', fee: 2500 },
            { name: 'English', fee: 2000 },
        ];
        console.log('✅ Initialized with Peshawar standard subject rates');
    }
});

// Ensure only one settings document exists (Singleton pattern)
SettingsSchema.index({ _id: 1 }, { unique: true });

module.exports = mongoose.model('Settings', SettingsSchema);
