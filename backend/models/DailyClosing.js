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
        // Partner's calculated share (reference only)
        partnerShare: {
            type: Number,
            default: 0,
        },
        // Actual amount partner is handing to owner
        handoverAmount: {
            type: Number,
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
            enum: ['PENDING', 'PENDING_VERIFICATION', 'VERIFIED', 'CANCELLED'],
            default: 'VERIFIED',
        },
        notes: {
            type: String,
            maxlength: 500,
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        verifiedAt: {
            type: Date,
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
        partnerShare: this.partnerShare,
        handoverAmount: this.handoverAmount,
        breakdown: this.breakdown,
        status: this.status,
    };
};

module.exports = mongoose.model('DailyClosing', dailyClosingSchema);
