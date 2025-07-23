import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Config from '../models/Config.js';

const seedConfig = async () => {
    await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    await Config.deleteMany({}); // Optional: clear old configs

    const configData = {
        monthlyInterestRates: [
            { type: 'Savings', rate: 4 },
            { type: 'Recurring', rate: 7.5 },
            { type: 'Fixed', rate: 8 },
            { type: 'Current', rate: 0 },
            { type: 'Loan', rate: 1.5 },
            { type: 'MIS', rate: 16.67 },
            { type: 'Auto-Created', rate: 0 }
        ],
        loanInterestRates: [
            { type: 'personal', rate: 1.5 },
            { type: 'education', rate: 2.5 }
        ],
        charges: [
            { name: 'processingFee', amount: 500, isPercentage: false },
            { name: 'lateFee', amount: 2, isPercentage: true },
            { name: 'foreclosureCharge', amount: 1, isPercentage: true }
        ],
        initialDeposits: {
            's/f': 100,
            recurring: 1000,
            fixed: 2000,
            Fixed: 500,
            Recurring: 200
        },
        loanDurations: [6, 12, 24, 36, 60, 72, 84],
        repaymentModes: ['full', 'emi', 'custom'],
        penaltyCharges: {
            rdMissedDeposit: 50,
            loanMissedEmi: 100,
            penaltyPerDay: 10
        },
        fineRules: [
            {
                accountType: 'Recurring',
                ruleName: 'Missed RD Installment',
                fineAmount: 50,
                appliesAfterDays: 5,
                affectsBalance: true,
                ledgerDescription: 'RD Missed Fine'
            },
            {
                accountType: 'Loan',
                ruleName: 'Missed EMI',
                fineAmount: 100,
                appliesAfterDays: 3,
                affectsBalance: true,
                ledgerDescription: 'Loan EMI Fine'
            }
        ],
        loanFlowConfig: [
            {
                type: 'personal',
                loanType: 'fixed',
                repayment: 'EMI',
                formFields: ['amount', 'duration', 'monthlyEMI']
            },
            {
                type: 'personal',
                loanType: 'flexible',
                repayment: 'interest-only',
                formFields: ['amount', 'interestRate', 'monthlyInterest']
            },
            {
                type: 'education',
                loanType: 'fixed',
                repayment: 'EMI',
                formFields: ['amount', 'duration', 'monthlyEMI']
            },
            {
                type: 'gold',
                loanType: 'fixed',
                repayment: 'EMI',
                formFields: ['goldWeight', 'amount', 'monthlyEMI']
            }
        ],
        fineAffectsBalance: true,
        fineConfig: {
            enableAutoFine: true,
            fineDescription: 'Late payment fine',
            graceDays: 3
        },
        updatedAt: new Date(),
        createdAt: new Date()
    };

    await Config.create(configData);
    console.log('✅ Config seeded successfully!');
    mongoose.disconnect();
};

seedConfig().catch((err) => {
    console.error('❌ Failed to seed config:', err);
    mongoose.disconnect();
});
