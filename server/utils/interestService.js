import Account from '../models/Account.js';
import AccountCharge from '../models/AccountCharge.js';
import Config from '../models/Config.js';

export const applyInterestToAllAccounts = async (req) => {
    try {
        const config = await Config.findOne().lean();
        const interestRates = config?.monthlyInterestRates || [];
        const now = new Date();
        const month = now.getMonth() + 1;

        const accounts = await Account.find();

        let appliedCount = 0;

        for (const account of accounts) {
            if (account.accountType === 'Auto-Created') {
                console.log(`⚠️ Skipped Auto-Created account: ${account.accountNumber}`);
                continue;
            }

            const rateEntry = interestRates.find(r => r?.type?.toLowerCase() === account.accountType?.toLowerCase());
            if (!rateEntry) {
                console.warn(`⚠️ No rate found for type: ${account.accountType}`);
                continue;
            }

            let interestAmount = 0;
            let creditedAccount = account; // default

            if (account.accountType?.toLowerCase() === 'fixed') {
                // ✅ Expect fixed tenure of 7 years = 84 months
                if (account.tenure !== 84 || !account.depositAmount) {
                    console.warn(`❗ Fixed account missing required data: ${account.accountNumber}`);
                    continue;
                }
                interestAmount = parseFloat((account.depositAmount / 84).toFixed(2));
            } else {
                const monthlyRate = rateEntry?.rate || 0;
                if (!monthlyRate || monthlyRate <= 0) continue;

                interestAmount = parseFloat(((account.balance * monthlyRate) / 100).toFixed(2));
            }

            if (interestAmount <= 0) continue;

            // 🟡 Special logic for MIS
            if (account.accountType?.toLowerCase() === 'mis') {
                const interestAccountId = account?.misDetails?.interestAccount;
                if (!interestAccountId) {
                    console.warn(`❗ MIS account missing linked interest account: ${account.accountNumber}`);
                    continue;
                }

                const interestAccount = await Account.findById(interestAccountId);
                if (!interestAccount) {
                    console.warn(`❗ Linked interest account not found for MIS: ${account.accountNumber}`);
                    continue;
                }

                interestAccount.balance += interestAmount;
                await interestAccount.save();

                const payload = {
                    accountId: interestAccount._id,
                    type: "interestPaid",
                    label: 'Monthly Interest (MIS)',
                    amount: interestAmount,
                    chargedDate: now,
                    notes: `Interest paid for MIS account ${account.accountNumber}, month ${month}`,
                    createdBy: req?.user?._id
                };

                await AccountCharge.create(payload);
                console.log(`✅ MIS interest credited to linked account ${interestAccount.accountNumber}`);
            } else if (account.accountType?.toLowerCase() === 'loan') {
                console.warn(`❗ Loan account is not applicable for interest: ${account.accountNumber}`);
                continue;
            } else {
                // ✅ Normal flow: add to same account
                account.balance += interestAmount;
                await account.save();

                const payload = {
                    accountId: account._id,
                    type: "interestPaid",
                    label: 'Monthly Interest',
                    amount: interestAmount,
                    chargedDate: now,
                    notes: `Interest paid for month ${month}`,
                    createdBy: req?.user?._id
                };

                await AccountCharge.create(payload);
                console.log(`✅ Account updated: ${account.accountNumber}, New Balance: ₹${account.balance}`);
            }

            appliedCount++;
        }

        return { success: true, updatedCount: appliedCount };
    } catch (err) {
        console.error('❌ Error applying interest:', err);
        throw new Error('Failed to apply interest');
    }
};
