const mongoose = require('mongoose');

const dailyClosingSchema = new mongoose.Schema(
    {
        partnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Partner ID is required'],
        },
        date: {
            type: Date,
            required: [true, 'Closing date is required'],
            default: Date.now,
        },
        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required'],
            default: 0,
        },
        breakdown: {
            chemistry: {
                type: Number,
                default: 0,
            },
            tuition: {
                type: Number,
                default: 0,
            },
            pool: {
                type: Number,
                default: 0,
            },
        },
        status: {
            type: String,
            enum: ['PENDING', 'VERIFIED', 'CANCELLED'],
            default: 'VERIFIED',
        },
        notes: {
            type: String,
            maxlength: 500,
        },
    },
    {
        timestamps: true,
    }
);

// INDEXES: For faster queries
dailyClosingSchema.index({ partnerId: 1, date: -1 });
dailyClosingSchema.index({ status: 1 });

// INSTANCE METHOD: Get closing summary
dailyClosingSchema.methods.getSummary = function () {
    return {
        id: this._id,
        date: this.date,
        totalAmount: this.totalAmount,
        breakdown: this.breakdown,
        status: this.status,
    };
};

module.exports = mongoose.model('DailyClosing', dailyClosingSchema);
