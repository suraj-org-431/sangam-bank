import Transaction from "../models/Transaction.js";
import Ledger from "../models/Ledger.js";

export const createTransactionAndLedger = async ({
    account,
    type, // 'deposit' | 'withdrawal' | 'loanRepayment' | 'interestPayment' | 'fine' | 'adjustment'
    amount,
    description,
    date,
    loanId,
    createdBy,
    adjustmentType, // optional: 'writeOff' | 'customAdjustment'
    noteBreakdown
}) => {
    const parsedAmount = parseFloat(amount);

    // 🚫 Skip invalid or zero adjustments
    if (type === 'adjustment' && (!parsedAmount || parsedAmount <= 0)) {
        throw new Error('Invalid adjustment amount');
    }

    // ✅ Create Transaction
    const tx = await Transaction.create({
        accountId: account._id,
        type,
        amount: parsedAmount,
        description,
        date,
        loanId,
        noteBreakdown
    });

    // 🧮 Balance Update Logic
    if (type === 'deposit') {
        account.balance += parsedAmount;

    } else if (type === 'withdrawal') {
        if (account.balance < parsedAmount) {
            throw new Error('Insufficient balance for this transaction');
        }
        account.balance -= parsedAmount;

    } else if (type === 'adjustment') {
        if (adjustmentType === 'customAdjustment') {
            account.balance += parsedAmount;
        } else if (adjustmentType === 'writeOff') {
            // No balance update
        }

    } else if (type === 'interestPayment' || type === 'fine') {
        // These are already deducted during total EMI, no need to deduct again
        // Simply log to ledger/transaction
    }

    await account.save();

    // 🧾 Ledger Entry
    await Ledger.create({
        particulars: account.applicantName,
        transactionType: type,
        amount: parsedAmount,
        balance: account.balance,
        description,
        date,
        createdBy,
    });

    return tx;
};
