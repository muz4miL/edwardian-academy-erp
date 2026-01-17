const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Expense title is required'],
            trim: true,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: ['Utilities', 'Rent', 'Salaries', 'Stationery', 'Marketing', 'Misc'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative'],
        },

        // Payment Status Tracking (NEW!)
        status: {
            type: String,
            enum: ['pending', 'paid', 'overdue'],
            default: 'pending',
        },

        // Date Tracking (ENHANCED!)
        expenseDate: {
            type: Date,
            default: Date.now,
            required: true,
        },
        dueDate: {
            type: Date,
            required: [true, 'Due date is required'],
        },
        paidDate: {
            type: Date,
            default: null,
        },

        // Vendor Information (NEW!)
        vendorName: {
            type: String,
            required: [true, 'Vendor name is required'],
            trim: true,
        },

        // Optional fields
        description: {
            type: String,
            trim: true,
        },
        billNumber: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
    }
);

// Virtual to check if expense is overdue
ExpenseSchema.virtual('isOverdue').get(function () {
    if (this.status === 'paid') return false;
    return new Date() > this.dueDate;
});

// Pre-save hook to auto-update status to overdue
ExpenseSchema.pre('save', function () {
    if (this.status === 'pending' && new Date() > this.dueDate) {
        this.status = 'overdue';
    }
});

// Indexes for faster queries
ExpenseSchema.index({ expenseDate: -1 });
ExpenseSchema.index({ dueDate: 1 });
ExpenseSchema.index({ status: 1 });
ExpenseSchema.index({ category: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);

