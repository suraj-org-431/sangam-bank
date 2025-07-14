import mongoose from "mongoose";

const { Schema } = mongoose;

// 📅 Installment Subschema
const installmentSchema = new Schema({
    dueDate: { type: Date },
    amount: { type: Number },
    paid: { type: Boolean },
    paidOn: Date
}, { _id: false });

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
    disbursedDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['draft', 'approved', 'disbursed', 'repaid', 'defaulted'],
        default: 'draft'
    },
    remarks: {
        type: String,
        default: ''
    },
    repaymentSchedule: {
        type: [installmentSchema],
        default: []
    }
}, {
    timestamps: true
});

export default mongoose.model("Loan", loanSchema);
