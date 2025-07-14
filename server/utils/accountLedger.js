import Transaction from "../models/Transaction.js";
import Ledger from "../models/Ledger.js";

export const createTransactionAndLedger = async ({ account, type, amount, description, date, loanId, createdBy }) => {
    const parsedAmount = parseFloat(amount);
    // ✅ Create transaction
    const tx = await Transaction.create({
        accountId: account._id,
        type,
        amount: parsedAmount,
        description,
        date,
        loanId, // Optional, for loan-related transactions
    });
    // 🧮 Update account balance
    if (type === 'deposit') {
        account.balance = parsedAmount;

    } else if (type === 'withdrawal' || type === 'loanRepayment') {
        if (account.balance < parsedAmount) {
            throw new Error('Insufficient balance for this transaction');
        }
        account.balance -= parsedAmount;
    }

    await account.save();

    // 🧾 Create corresponding ledger entry
    await Ledger.create({
        particulars: account.applicantName,
        transactionType: type, // reverse
        amount: parsedAmount,
        balance: account.balance,
        description,
        date,
        createdBy,
    });

    return tx;
};
