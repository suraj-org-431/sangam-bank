import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import path from "path";
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from "../utils/response.js";
import { createTransactionAndLedger } from "../utils/accountLedger.js";

export const createTransaction = async (req, res) => {
    try {
        const { accountId, type, amount, description, date, noteBreakdown, paymentType, transactionId } = req.body;

        if (!accountId || !type || !amount)
            return badRequestResponse(res, 400, "Missing required fields");

        const account = await Account.findById(accountId);
        if (!account) return notFoundResponse(res, 404, "Account not found");

        const accountType = account?.accountType?.toLowerCase();

        // ⛔ Block MIS accounts
        if (accountType === "mis") {
            return badRequestResponse(
                res,
                400,
                "Transaction Blocked: No transactions are allowed on MIS (Monthly Income Scheme) accounts before maturity."
            );
        }

        // 💡 Validate withdrawal balance
        if (type === 'withdrawal' && account.balance < parseFloat(amount)) {
            return badRequestResponse(
                res,
                400,
                `Insufficient balance. Current balance is ₹${account.balance}`
            );
        }

        // ✅ Ensure exact match for Fixed and Recurring accounts
        if (['recurring'].includes(accountType) && type === 'deposit' &&
            parseFloat(amount) !== parseFloat(account?.recurringDetails?.installmentAmount)
        ) {
            return badRequestResponse(
                res,
                400,
                `Transaction amount must be exactly ₹${account?.recurringDetails?.installmentAmount} for ${account.accountType} account`
            );
        }

        const tx = await createTransactionAndLedger({
            account,
            type,
            amount,
            description,
            date: date || new Date(),
            paymentType,
            transactionId,
            noteBreakdown,
            createdBy: req.user?.name || "System",
        });

        return successResponse(res, 200, "Transaction created", tx);
    } catch (err) {
        console.error("❌ Error:", err);
        return errorResponse(res, 500, "Transaction failed", err.message);
    }
};


export const getTransactions = async (req, res) => {
    try {
        const {
            accountId,
            applicantName,
            type,
            accountType,
            page = 1,
            limit = 10
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const pageLimit = Math.max(1, parseInt(limit));
        const skip = (pageNum - 1) * pageLimit;

        const matchQuery = {};

        if (accountId) {
            matchQuery.accountId = accountId;
        }

        // 🧠 Find accountIds based on filters
        if (applicantName || accountType) {
            const accountFilter = {};
            if (applicantName) {
                accountFilter.applicantName = { $regex: applicantName, $options: 'i' };
            }
            if (accountType) {
                accountFilter.accountType = accountType;
            }

            const accounts = await Account.find(accountFilter, "_id");
            const accountIds = accounts.map(acc => acc._id);

            if (!accountIds.length) {
                return successResponse(res, 200, "No transactions found", {
                    transactions: [],
                    totalCount: 0,
                    totalPages: 1,
                    currentPage: pageNum,
                });
            }

            matchQuery.accountId = { $in: accountIds };
        }

        if (type) {
            matchQuery.type = type;
        }

        const totalCount = await Transaction.countDocuments(matchQuery);

        const transactions = await Transaction.find(matchQuery)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .populate('accountId', 'applicantName accountNumber accountType status, balance');

        const totalPages = Math.ceil(totalCount / pageLimit);

        return successResponse(res, 200, "Transactions fetched", {
            transactions,
            totalCount,
            totalPages: totalPages || 1,
            currentPage: pageNum,
        });

    } catch (err) {
        console.error("❌ Error in getTransactions:", err);
        return errorResponse(res, 500, "Failed to fetch transactions", err.message);
    }
};
// ✅ PUT /transactions/:id
export const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, amount, description, date } = req.body;

        const transaction = await Transaction.findById(id);
        if (!transaction) return notFoundResponse(res, 404, "Transaction not found");

        const account = await Account.findById(transaction.accountId);
        if (!account) return notFoundResponse(res, 404, "Associated account not found");

        const oldAmount = transaction.amount;
        const oldType = transaction.type;
        const newAmount = parseFloat(amount);

        // 🧮 Reverse old balance impact
        if (oldType === 'deposit') account.balance -= oldAmount;
        if (oldType === 'withdrawal') account.balance += oldAmount;

        // 🚫 Check for insufficient balance
        if (type === 'withdrawal' && account.balance < newAmount) {
            return badRequestResponse(res, 400, "Insufficient balance for update");
        }

        // ✅ Apply new balance impact
        if (type === 'deposit') account.balance += newAmount;
        if (type === 'withdrawal') account.balance -= newAmount;

        // Update transaction
        transaction.type = type;
        transaction.amount = newAmount;
        transaction.description = description || transaction.description;
        transaction.date = date || transaction.date;

        await transaction.save();
        await account.save();

        return successResponse(res, 200, "Transaction updated", transaction);
    } catch (err) {
        console.error("❌ Update error:", err);
        return errorResponse(res, 500, "Failed to update transaction", err.message);
    }
};

// ✅ DELETE /transactions/:id
export const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findById(id);
        if (!transaction) return notFoundResponse(res, 404, "Transaction not found");

        const account = await Account.findById(transaction.accountId);
        if (!account) return notFoundResponse(res, 404, "Associated account not found");

        const amt = transaction.amount;

        // Reverse balance effect
        if (transaction.type === 'deposit') account.balance -= amt;
        if (transaction.type === 'withdrawal') account.balance += amt;

        await account.save();
        await transaction.deleteOne();

        return successResponse(res, 200, "Transaction deleted and balance updated");
    } catch (err) {
        console.error("❌ Deletion error:", err);
        return errorResponse(res, 500, "Failed to delete transaction", err.message);
    }
};

export const exportTransactions = async (req, res) => {
    try {
        const { format = 'excel', accountId } = req.query;

        const query = {};
        if (accountId) query.accountId = accountId;

        const transactions = await Transaction.find(query)
            .populate('accountId', 'accountNumber applicantName')
            .sort({ date: -1 });

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Transactions');

            sheet.columns = [
                { header: 'Sr No', key: 'srNo', width: 15 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Type', key: 'type', width: 15 },
                { header: 'Amount', key: 'amount', width: 15 },
                { header: 'Account Number', key: 'accountNumber', width: 20 },
                { header: 'Applicant Name', key: 'applicantName', width: 25 },
                { header: 'Description', key: 'description', width: 30 },
            ];

            transactions.forEach((txn, idx) => {
                sheet.addRow({
                    srNo: idx + 1,
                    date: txn.date.toISOString().split('T')[0],
                    type: txn.type,
                    amount: txn.amount,
                    accountNumber: txn.accountId?.accountNumber,
                    applicantName: txn.accountId?.applicantName,
                    description: txn.description || '',
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');
            await workbook.xlsx.write(res);
            res.end();
        } else if (format === 'pdf') {
            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=transactions.pdf');
            doc.pipe(res);

            doc.fontSize(16).text('Transaction Report', { align: 'center' });
            doc.moveDown();

            transactions.forEach(txn => {
                doc.fontSize(12).text(`Date: ${txn.date.toISOString().split('T')[0]}`);
                doc.text(`Type: ${txn.type}`);
                doc.text(`Amount: ₹${txn.amount}`);
                doc.text(`Account #: ${txn.accountId?.accountNumber} - ${txn.accountId?.applicantName}`);
                doc.text(`Description: ${txn.description || 'N/A'}`);
                doc.moveDown();
            });

            doc.end();
        } else {
            return badRequestResponse(res, 400, "Invalid format. Use ?format=excel or ?format=pdf");
        }

    } catch (err) {
        console.error("❌ Export error:", err);
        return errorResponse(res, 500, "Failed to export transactions", err.message);
    }
};