// utils/ledgerUtils.js
import Ledger from "../models/Ledger.js";

export const generateMonthlyLedgerData = async (month, year) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const allLedgers = await Ledger.find().sort({ date: 1 }).lean();

    let openingBalance = 0;
    for (const entry of allLedgers) {
        if (new Date(entry.date) >= startDate) break;

        const amt = entry.amount || 0;
        if (["deposit", "interest", "loanDisbursed", "openingBalance", "rdInstallment"].includes(entry.transactionType)) {
            openingBalance += amt;
        } else if (["withdrawal", "loanRepayment", "fine", "penalty", "principal", "interestPayment"].includes(entry.transactionType)) {
            openingBalance -= amt;
        }
    }

    let balance = openingBalance;
    let fullEntries = [];
    let entryId = 1;

    fullEntries.push({
        entryId: entryId++,
        date: startDate.toISOString().split('T')[0],
        ledgerHead: "Opening Balance",
        description: "Cash in hand",
        debit: `₹${openingBalance.toLocaleString('en-IN')}`,
        credit: "-",
        balance: `₹${openingBalance.toLocaleString('en-IN')}`
    });

    for (const entry of allLedgers) {
        const entryDate = new Date(entry.date);
        if (entryDate < startDate || entryDate >= endDate) continue;

        const isCredit = ["deposit", "interest", "loanDisbursed", "openingBalance", "rdInstallment"].includes(entry.transactionType);
        const isDebit = ["withdrawal", "loanRepayment", "fine", "penalty", "principal", "interestPayment"].includes(entry.transactionType);
        const amt = entry.amount || 0;

        if (isCredit) balance += amt;
        if (isDebit) balance -= amt;

        fullEntries.push({
            entryId: entryId++,
            date: entryDate.toISOString().split('T')[0],
            ledgerHead: entry.transactionType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            description: entry.description || '-',
            debit: isDebit ? `₹${amt.toLocaleString('en-IN')}` : '-',
            credit: isCredit ? `₹${amt.toLocaleString('en-IN')}` : '-',
            balance: `₹${balance.toLocaleString('en-IN')}`
        });
    }

    fullEntries.push({
        entryId: entryId,
        date: new Date(endDate.getTime() - 1).toISOString().split('T')[0],
        ledgerHead: "Closing Balance",
        description: "End of period balance",
        debit: "-",
        credit: "-",
        balance: `₹${balance.toLocaleString('en-IN')}`
    });

    return {
        entries: fullEntries,
        openingBalance,
        closingBalance: balance,
    };
};
