import Account from "../models/Account.js";

export const applyLoanFineIfOverdue = async (accountId, finePerDay = 10) => {
    const account = await Account.findById(accountId);
    if (!account || !account.hasLoan || !account.loanDetails?.repaymentSchedule) return;

    const today = new Date();
    let updated = false;

    for (const emi of account.loanDetails.repaymentSchedule) {
        if (!emi.paid && new Date(emi.dueDate) < today) {
            const overdueDays = Math.floor((today - new Date(emi.dueDate)) / (1000 * 60 * 60 * 24));
            emi.fine = overdueDays * finePerDay;
            updated = true;
        }
    }

    if (updated) await account.save();
};
