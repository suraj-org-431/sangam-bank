import mongoose from 'mongoose';

const interestRateSchema = new mongoose.Schema({
    type: { type: String, required: true }, // e.g., 'personal', 'gold', 'education'
    rate: { type: Number, required: true }, // e.g., 12.5
}, { _id: false });

const chargeSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., 'processingFee', 'lateFee'
    amount: { type: Number, required: true }, // e.g., 500
    isPercentage: { type: Boolean, default: false } // true → %, false → flat
}, { _id: false });

const configSchema = new mongoose.Schema({
    interestRates: [interestRateSchema],

    charges: [chargeSchema],

    initialDeposits: {
        savings: { type: Number, default: 100 },
        recurring: { type: Number, default: 200 },
        fixed: { type: Number, default: 500 }
    },

    loanDurations: {
        type: [Number], // months
        default: [6, 12, 24, 36, 60]
    },

    repaymentModes: {
        type: [String],
        default: ['full', 'emi', 'custom']
    },

    autoCloseOnFullRepayment: {
        type: Boolean,
        default: true
    },

    maxLoanAmount: {
        type: Number,
        default: 1000000 // ₹10 Lakh
    },

    minLoanAmount: {
        type: Number,
        default: 1000
    },

    penaltyPerDay: {
        type: Number,
        default: 10 // ₹10/day after due date
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Config = mongoose.model('Config', configSchema);
export default Config;
