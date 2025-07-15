import Account from "../models/Account.js";
import Config from "../models/Config.js";
import { createTransactionAndLedger } from "./accountLedger.js";

export const applyRecurringFines = async () => {
    const config = await Config.findOne();
    const graceDays = config?.fineConfig?.graceDays || 3;
    const fineRule = config?.fineRules?.find(r => r.accountType === 'Recurring');

    if (!fineRule || !config?.fineConfig?.enableAutoFine) return {
        finedAccounts: 0,
        totalFineAmount: 0
    };

    const today = new Date();
    let finedAccounts = 0;
    let totalFineAmount = 0;

    const accounts = await Account.find({ accountType: 'Recurring' });

    for (const acc of accounts) {
        const details = acc.recurringDetails;
        if (!details || !Array.isArray(details.schedule)) continue;

        for (let sched of details.schedule) {
            const dueDate = new Date(sched.dueDate);
            dueDate.setDate(dueDate.getDate() + graceDays);

            if (!sched.paid && today > dueDate && sched.fine === 0) {
                // Apply fine
                sched.fine = fineRule.fineAmount;
                details.fineTotal += fineRule.fineAmount;
                finedAccounts++;
                totalFineAmount += fineRule.fineAmount;

                if (fineRule.affectsBalance) {
                    acc.balance -= fineRule.fineAmount;
                }

                await createTransactionAndLedger({
                    account: acc,
                    type: 'fine',
                    amount: fineRule.fineAmount,
                    description: fineRule.ledgerDescription || 'Fine Applied',
                    date: new Date(),
                    createdBy: 'System'
                });
            }
        }

        await acc.save();
    }

    return { finedAccounts, totalFineAmount };
};
