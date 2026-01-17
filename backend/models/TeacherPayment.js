const mongoose = require('mongoose');

const teacherPaymentSchema = new mongoose.Schema(
    {
        // Payment Voucher ID (Auto-generated)
        voucherId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        // Teacher Reference
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
            required: true,
        },
        teacherName: {
            type: String,
            required: true,
            trim: true,
        },
        subject: {
            type: String,
            required: true,
        },

        // Payment Details
        amountPaid: {
            type: Number,
            required: true,
            min: 0,
        },
        compensationType: {
            type: String,
            enum: ['percentage', 'fixed', 'hybrid'],
            required: true,
        },

        // Period Information
        month: {
            type: String,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },

        // Payment Metadata
        paymentDate: {
            type: Date,
            default: Date.now,
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'bank-transfer', 'cheque'],
            default: 'cash',
        },
        status: {
            type: String,
            enum: ['paid', 'pending', 'cancelled'],
            default: 'paid',
        },

        // Additional Info
        notes: {
            type: String,
            trim: true,
        },
        authorizedBy: {
            type: String,
            default: 'Admin',
        },
    },
    {
        timestamps: true,
    }
);

// Auto-generate voucher ID before saving
teacherPaymentSchema.pre('save', async function () {
    console.log('🎫 PRE-SAVE HOOK TRIGGERED for TeacherPayment');
    console.log('🎫 Current voucherId:', this.voucherId);

    if (!this.voucherId) {
        const count = await mongoose.model('TeacherPayment').countDocuments();
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        this.voucherId = `TP-${year}${month}-${String(count + 1).padStart(4, '0')}`;
        console.log('🎫 GENERATED voucherId:', this.voucherId);
    }
});

// Indexes for faster queries
teacherPaymentSchema.index({ voucherId: 1 });
teacherPaymentSchema.index({ teacherId: 1 });
teacherPaymentSchema.index({ month: 1, year: 1 });
teacherPaymentSchema.index({ status: 1 });

const TeacherPayment = mongoose.model('TeacherPayment', teacherPaymentSchema);

module.exports = TeacherPayment;
