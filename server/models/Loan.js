import mongoose from "mongoose";
const { Schema } = mongoose;

// 📅 Installment Subschema
const installmentSchema = new Schema({
    month: Number,
    dueDate: Date,
    amount: Number,
    interest: Number,
    principal: Number,
    balance: Number,
    paid: { type: Boolean, default: false },
    paidOn: Date,
    amountPaid: { type: Number, default: 0 },
    fine: { type: Number, default: 0 },
    paymentRef: { type: String, default: '' }
}, { _id: false });

// ✅ Adjustment Subschema
const adjustmentSchema = new Schema({
    type: {
        type: String,
        enum: ['waiveFine', 'writeOff', 'customAdjustment'],
        required: true
    },
    amount: {
        type: Number,
        required: function () {
            return this.type !== 'waiveFine';
        }
    },
    remarks: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: String,
    approvedBy: String,
    approvedAt: Date
}, { _id: true });

// 💰 Loan Schema
const loanSchema = new Schema({
    borrower: {
        type: Schema.Types.ObjectId,
        ref: 'Accounts',
        required: true
    },
    loanAmount: {
        type: Number,
        required: true
    },
    loanType: {
        type: String,
        enum: ['personal', 'education', 'gold', 'vehicle', 'home', 'business'],
        required: true
    },
    disbursedAmount: {
        type: Number,
        default: 0
    },
    interestRate: {
        type: Number,
        required: true
    },
    tenureMonths: {
        type: Number,
        required: true
    },
    disbursedDate: Date,
    status: {
        type: String,
        enum: ['draft', 'approved', 'disbursed', 'repaid', 'defaulted'],
        default: 'draft'
    },
    remarks: String,
    repaymentSchedule: {
        type: [installmentSchema],
        default: []
    },
    adjustments: {
        type: [adjustmentSchema],
        default: []
    }
}, {
    timestamps: true
});

export default mongoose.model("Loan", loanSchema);
