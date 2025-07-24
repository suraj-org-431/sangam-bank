import Transaction from "../models/Transaction.js";
import Ledger from "../models/Ledger.js";

export const createTransactionAndLedger = async ({
    account,
    type,
    amount,
    description,
    date,
    paymentType,
    transactionId,
    loanId,
    createdBy,
    adjustmentType,
    noteBreakdown,
    additionalTransactions = []
}) => {
    const parsedAmount = parseFloat(amount);
    if (type === 'adjustment' && adjustmentType !== 'waiveFine' && (!parsedAmount || parsedAmount <= 0)) {
        throw new Error('Invalid adjustment amount');
    }

    // 🧮 Balance Logic
    switch (type) {
        case 'deposit':
        case "rdInstallment":
            account.balance += parsedAmount;
            break;
        case 'withdrawal':
            if (account.balance < parsedAmount) throw new Error('Insufficient balance for withdrawal');
            account.balance -= parsedAmount;
            break;
        case 'adjustment':
            if (adjustmentType === 'customAdjustment') account.balance += parsedAmount;
            break;
        case 'loanDisbursed':
            break;
        case 'loanRepayment':
            if (parsedAmount > 0) {
                if (account.balance < parsedAmount) throw new Error(`Insufficient balance. Need ₹${parsedAmount}`);
                account.balance -= parsedAmount;
                account.balance = Math.max(account.balance, 0);
            }
            break;
        case 'interestPayment':
            break;
        case 'fine':
            if (affectsBalance) {
                if (account.balance < parsedAmount) throw new Error(`Insufficient balance for fine ₹${parsedAmount}`);
                account.balance -= parsedAmount;
            }
            break;
        default:
            throw new Error(`Unsupported transaction type: ${type}`);
    }

    await account.save();

    // ✅ Main Transaction
    const tx = await Transaction.create({
        accountId: account._id,
        type,
        amount: parsedAmount,
        description,
        date,
        paymentType,
        transactionId,
        loanId,
        noteBreakdown
    });

    for (const txn of additionalTransactions) {
        const extraAmount = parseFloat(txn.amount);
        if (!extraAmount || extraAmount <= 0) continue;

        const shouldAffectBalance = txn.affectsBalance ?? true;

        if (shouldAffectBalance) {
            if (account.balance < extraAmount) throw new Error(`Insufficient balance for fine ₹${extraAmount}`);
            account.balance -= extraAmount;
            await account.save();
        }

        await Transaction.create({
            accountId: account._id,
            type: txn.type,
            amount: extraAmount,
            description: txn.description,
            date,
            paymentType,
            loanId,
            createdBy,
        });
    }

    return tx;
};
