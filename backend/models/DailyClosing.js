const mongoose = require('mongoose');

/**
 * DailyClosing — Single-Owner Edition
 * Locks floating cash into verified at end-of-day.
 * No partner handover logic.
 */
const dailyClosingSchema = new mongoose.Schema(
    {
        closedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Closed-by user is required'],
        },
        closedByName: {
            type: String,
            trim: true,
        },
        closedByRole: {
            type: String,
            enum: ['OWNER', 'PARTNER'],
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
        transactionCount: {
            type: Number,
            default: 0,
        },
        // Breakdown for audit trail / proof
        breakdown: {
            tuitionRevenue: { type: Number, default: 0 },
            academyShareRevenue: { type: Number, default: 0 },
            withdrawalAdjustments: { type: Number, default: 0 },
            // Detailed line items for proof
            lineItems: [{
                type: { type: String, enum: ['TUITION_SHARE', 'ACADEMY_SHARE', 'WITHDRAWAL_ADJUSTMENT'] },
                className: { type: String },
                studentName: { type: String },
                amount: { type: Number },
                description: { type: String },
            }],
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

// INDEXES
dailyClosingSchema.index({ closedBy: 1, date: -1 });
dailyClosingSchema.index({ status: 1 });

module.exports = mongoose.model('DailyClosing', dailyClosingSchema);
