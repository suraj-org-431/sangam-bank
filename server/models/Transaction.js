import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema({
    transactionNo: { type: String, unique: true },
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

transactionSchema.pre('save', async function (next) {
    if (this.isNew && !this.transactionNo) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        const prefix = `TRX${year}${month}${day}`;

        // Count how many transactions were created today (based on createdAt)
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const count = await mongoose.model('Transaction').countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        const sequence = String(count + 1).padStart(3, '0'); // e.g., 001, 002...
        this.transactionNo = `${prefix}${sequence}`;
    }

    next();
});


export default mongoose.model("Transaction", transactionSchema);
