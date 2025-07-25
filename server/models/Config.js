import mongoose from 'mongoose';

const interestRateSchema = new mongoose.Schema({
    type: { type: String, required: true },   // e.g., 'Savings', 'Recurring', 'Fixed'
    rate: { type: Number, required: true }    // e.g., 7.5%
}, { _id: false });

const chargeSchema = new mongoose.Schema({
    name: { type: String, required: true },       // e.g., 'lateFee'
    amount: { type: Number, required: true },     // e.g., 500 or 2%
    isPercentage: { type: Boolean, default: false } // true → %, false → flat ₹
}, { _id: false });

const fineRuleSchema = new mongoose.Schema({
    accountType: { type: String, required: true },       // e.g., Recurring, Loan
    ruleName: { type: String, required: true },          // e.g., Missed Installment
    fineAmount: { type: Number, required: true },        // e.g., 50
    appliesAfterDays: { type: Number, default: 0 },      // grace days
    affectsBalance: { type: Boolean, default: true },    // whether to deduct balance
    ledgerDescription: { type: String, default: 'Fine Applied' }, // message in ledger
}, { _id: false });

const configSchema = new mongoose.Schema({
    monthlyInterestRates: [interestRateSchema],   // For Savings, Recurring, Fixed accounts

    loanInterestRates: [interestRateSchema],      // For Personal, Gold, Education loans

    charges: [chargeSchema],                      // General charges (processing fee, etc.)

    penaltyCharges: {
        rdMissedDeposit: { type: Number, default: 0 },   // ₹ penalty for RD installment miss
        loanMissedEmi: { type: Number, default: 0 },     // ₹ penalty for missed loan EMI
        penaltyPerDay: { type: Number, default: 10 }     // ₹ daily penalty for late payments
    },

    initialDeposits: {
        's/f': { type: Number, default: 100 },    // Default min deposit for savings
        Recurring: { type: Number, default: 200 },  // For RD
        Fixed: { type: Number, default: 500 }       // For FD
    },

    loanDurations: {
        type: [Number],
        default: [6, 12, 24, 36, 60, 72, 84, 96, 120] // In months
    },

    repaymentModes: {
        type: [String],
        default: ['full', 'emi', 'custom']
    },

    fineRules: [fineRuleSchema],                  // Fine rules for different account types

    fineAffectsBalance: { type: Boolean, default: false }, // 💰 Should fine reduce balance?

    fineConfig: {
        enableAutoFine: { type: Boolean, default: true },     // 🔁 Cron-based fine enable/disable
        graceDays: { type: Number, default: 3 },              // 🕒 Grace days before applying fine
        fineDescription: { type: String, default: 'Late payment fine' },
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
});

const Config = mongoose.model('Config', configSchema);
export default Config;
