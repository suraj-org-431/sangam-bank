import Account from '../models/Account.js';
import Ledger from '../models/Ledger.js';
import Config from '../models/Config.js';

export const applyInterestToAllAccounts = async () => {
    try {
        const config = await Config.findOne().lean();
        const interestRates = config?.monthlyInterestRates || [];
        const now = new Date();

        const accounts = await Account.find();

        let appliedCount = 0;

        for (const account of accounts) {
            // ⛔ Skip auto-created accounts
            if (account.accountType === 'Auto-Created') {
                console.log(`⚠️ Skipped Auto-Created account: ${account.accountNumber}`);
                continue;
            }

            // 🔍 Find interest rate for the account type
            const rateEntry = interestRates.find(r => r?.type?.toLowerCase() === account.accountType?.toLowerCase());
            if (!rateEntry) {
                console.warn(`⚠️ No rate found for type: ${account.accountType}`);
                continue;
            }

            const now = new Date();
            let interestAmount = 0;

            // 💡 Special logic for MIS
            if (account.accountType === 'MIS') {
                // Expect MIS to have fixed tenure of 72 months
                if (account.tenure !== 72 || !account.depositAmount) {
                    console.warn(`❗ MIS account missing required data: ${account.accountNumber}`);
                    continue;
                }
                interestAmount = parseFloat((account.depositAmount / 72).toFixed(2));
            } else {
                // 💰 Normal monthly interest calculation
                const monthlyRate = rateEntry?.rate || 0;
                if (!monthlyRate || monthlyRate <= 0) continue;
                interestAmount = parseFloat(((account.balance * monthlyRate) / 100).toFixed(2));
            }

            if (interestAmount <= 0) continue;
            account.balance += interestAmount;

            const updated = await account.save();
            console.log(`✅ Account updated: ${account.accountNumber}, New Balance: ₹${updated.balance}`);

            const ledgerEntry = await Ledger.create({
                accountId: account._id,
                particulars: account.applicantName || 'Unnamed',
                transactionType: 'interest',
                amount: interestAmount,
                balance: account.balance,
                description: 'Monthly Interest Added',
                date: now,
                createdBy: 'Auto Interest',
            });
            console.log(`📘 Ledger created: ID ${ledgerEntry._id}`);

            appliedCount++;
        }

        return { success: true, updatedCount: appliedCount };
    } catch (err) {
        console.error('❌ Error applying interest:', err);
        throw new Error('Failed to apply interest');
    }
};
