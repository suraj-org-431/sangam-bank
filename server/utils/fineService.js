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

export const applyLoanFines = async () => {
    const config = await Config.findOne();
    const graceDays = config?.fineConfig?.graceDays || 3;
    const dailyFine = config?.penaltyCharges?.penaltyPerDay || 10;
    const fineDescription = config?.fineConfig?.fineDescription || "Late EMI fine";

    const today = new Date();
    const finedLoans = [];
    let totalFineAmount = 0;

    const loans = await Loan.find({ status: 'disbursed' }).populate('borrower');

    for (const loan of loans) {
        const schedule = loan.repaymentSchedule || [];

        for (const inst of schedule) {
            if (!inst.paid && inst.dueDate) {
                const dueDate = new Date(inst.dueDate);
                const graceDate = new Date(dueDate);
                graceDate.setDate(graceDate.getDate() + graceDays);

                if (today > graceDate && inst.fine === 0) {
                    const overdueDays = Math.ceil((today - graceDate) / (1000 * 60 * 60 * 24));
                    const fineAmount = overdueDays * dailyFine;

                    inst.fine = fineAmount;
                    totalFineAmount += fineAmount;

                    // Deduct from account balance if setting allows
                    const borrower = loan.borrower;
                    if (config.fineAffectsBalance) {
                        borrower.balance = Math.max((borrower.balance || 0) - fineAmount, 0);
                    }

                    await createTransactionAndLedger({
                        account: borrower,
                        type: 'penalty',
                        amount: fineAmount,
                        description: fineDescription,
                        date: today,
                        loanId: loan._id,
                        createdBy: 'System Fine Cron'
                    });

                    await borrower.save();
                    finedLoans.push(loan._id.toString());
                }
            }
        }

        await loan.save();
    }

    return {
        finedLoans: [...new Set(finedLoans)],
        totalFineAmount
    };
};
