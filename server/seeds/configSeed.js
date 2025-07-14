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

    await Config.deleteMany({}); // Optional: Clear old configs

    const configData = {
        interestRates: [
            { type: 'savings', rate: 4 },
            { type: 'recurring', rate: 6.5 },
            { type: 'fixed', rate: 7.5 },
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
            fixed: 2000
        },
        loanDurations: [6, 12, 24, 36, 60],
        repaymentModes: ['full', 'emi', 'custom'],
        autoCloseOnFullRepayment: true,
        maxLoanAmount: 1000000,
        minLoanAmount: 1000,
        penaltyPerDay: 10,
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
