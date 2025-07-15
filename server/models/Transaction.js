import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema({
    accountId: { type: Schema.Types.ObjectId, ref: 'Accounts', required: true },
    type: { type: String, enum: ['deposit', 'withdrawal', 'transfer', 'loanRepayment', 'loanDisbursed', 'rdInstallment'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, default: Date.now },
    loanId: { type: Schema.Types.ObjectId, ref: 'Loans' }, // Optional, for loan-related transactions
}, {
    timestamps: true
});

export default mongoose.model("Transaction", transactionSchema);
