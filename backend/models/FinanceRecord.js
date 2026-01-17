const mongoose = require('mongoose');

const financeRecordSchema = new mongoose.Schema(
    {
        receiptId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
        },
        studentName: {
            type: String,
            required: true,
            trim: true,
        },
        studentClass: {
            type: String,
            required: true,
        },
        totalFee: {
            type: Number,
            required: true,
            min: 0,
        },
        paidAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        balance: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ['paid', 'partial', 'pending'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'bank-transfer', 'cheque', 'online'],
            default: 'cash',
        },
        paymentDate: {
            type: Date,
            default: Date.now,
        },
        description: {
            type: String,
            trim: true,
        },
        month: {
            type: String,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
financeRecordSchema.index({ receiptId: 1 });
financeRecordSchema.index({ studentId: 1 });
financeRecordSchema.index({ status: 1 });
financeRecordSchema.index({ month: 1, year: 1 });

const FinanceRecord = mongoose.model('FinanceRecord', financeRecordSchema);

module.exports = FinanceRecord;
