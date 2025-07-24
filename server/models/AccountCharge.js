// models/AccountCharge.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const accountChargeSchema = new Schema({
    accountId: { type: Schema.Types.ObjectId, ref: 'Accounts', required: false },
    type: {
        type: String,
        enum: ['processingFee', 'insurance', 'fine', 'serviceCharge', 'interest', 'other', 'loanInterest', 'interestPayout', 'salaryPayment', 'officeExpenses', 'cashInHand'],
        required: true,
    },
    label: { type: String, required: true }, // e.g. "Processing Fee for FD", "Late fine"
    amount: { type: Number, required: true },
    chargedDate: { type: Date, default: Date.now },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Admin/staff who created it
}, {
    timestamps: true,
});

export default mongoose.model('AccountCharge', accountChargeSchema);
