import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema({
    accountId: { type: Schema.Types.ObjectId, ref: 'Accounts', required: true },
    loanId: { type: Schema.Types.ObjectId, ref: 'Loans' }, // Optional, for loan-related transactions
    type: { type: String, enum: ['deposit', 'withdrawal', 'transfer', 'loanRepayment', 'loanDisbursed', 'rdInstallment', "adjustment", 'principal', 'fine', 'interestPayment'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, default: Date.now },
    noteBreakdown: {
        type: Map,
        of: Number,
        default: {}
    }
}, {
    timestamps: true
});

export default mongoose.model("Transaction", transactionSchema);
