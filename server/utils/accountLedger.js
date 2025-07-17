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
    totalRepaymentAmount = 0,
    additionalTransactions = []
}) => {
    const parsedAmount = parseFloat(amount);
    console.log(type)
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
            if (totalRepaymentAmount > 0) {
                if (account.balance < totalRepaymentAmount) throw new Error(`Insufficient balance. Need ₹${totalRepaymentAmount}`);
                account.balance -= totalRepaymentAmount;
                account.balance = Math.max(account.balance, 0);
            }
            break;
        case 'interestPayment':
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

    await Ledger.create({
        particulars: account.applicantName,
        transactionType: type,
        amount: parsedAmount,
        balance: account.balance,
        description,
        date,
        createdBy,
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

        await Ledger.create({
            particulars: account.applicantName,
            transactionType: txn.type,
            amount: extraAmount,
            balance: account.balance,
            description: txn.description,
            date,
            createdBy,
        });
    }

    return tx;
};
