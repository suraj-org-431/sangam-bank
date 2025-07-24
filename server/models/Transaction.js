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
    paymentType: { type: String, enum: ['cash', 'online'] },
    transactionId: { type: String },
    noteBreakdown: {
        type: Map,
        of: Number,
        default: {}
    }
}, {
    timestamps: true
});

transactionSchema.pre('save', async function (next) {
    if (!this.isNew || this.transactionNo) return next();

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `TRX${year}${month}${day}`;

    let sequence = 1;
    let transactionNo;
    let exists = true;

    while (exists && sequence < 1000) {
        transactionNo = `${prefix}${String(sequence).padStart(3, '0')}`;

        // Check if this transactionNo already exists
        const existing = await mongoose.model('Transaction').findOne({ transactionNo });
        if (!existing) {
            this.transactionNo = transactionNo;
            exists = false;
        } else {
            sequence++;
        }
    }

    if (exists) {
        return next(new Error("Failed to generate unique transaction number"));
    }

    next();
});


export default mongoose.model("Transaction", transactionSchema);
