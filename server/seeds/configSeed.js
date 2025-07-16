// configSeed.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Config from '../models/Config.js';

const seedConfig = async () => {
    await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    await Config.deleteMany({}); // Clear old configs if needed

    const configData = {
        monthlyInterestRates: [
            { type: 'Savings', rate: 4 },
            { type: 'Recurring', rate: 6.5 },
            { type: 'Fixed', rate: 7.5 }
        ],
        loanInterestRates: [
            { type: 'personal', rate: 12.5 },
            { type: 'education', rate: 8.5 },
            { type: 'gold', rate: 10 }
        ],
        charges: [
            { name: 'processingFee', amount: 500, isPercentage: false },
            { name: 'lateFee', amount: 2, isPercentage: true },
            { name: 'foreclosureCharge', amount: 1, isPercentage: true }
        ],
        initialDeposits: {
            savings: 500,
            recurring: 1000,
            fixed: 2000,
            Fixed: 500,
            Recurring: 200,
            Savings: 100
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
        fineAffectsBalance: true,
        fineConfig: {
            enableAutoFine: true,
            fineDescription: 'Late payment fine',
            graceDays: 3
        },
        updatedAt: new Date()
    };

    await Config.create(configData);
    console.log('✅ Config seeded successfully!');
    mongoose.disconnect();
};

seedConfig().catch((err) => {
    console.error('❌ Failed to seed config:', err);
    mongoose.disconnect();
});
