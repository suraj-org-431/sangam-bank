import fs from "fs";
import csv from "csv-parser";
import Ledger from "../models/Ledger.js";
import {
    successResponse,
    errorResponse,
    badRequestResponse,
    notFoundResponse
} from "../utils/response.js";
import Account from "../models/Account.js";
import { generateNextAccountNumber } from "./accountController.js";
import Transaction from "../models/Transaction.js";
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { generateMonthlyLedgerData } from '../utils/ledgerUtils.js';
import AccountCharge from "../models/AccountCharge.js";

// ✅ Create or Update (Upsert) Ledger
export const upsertLedger = async (req, res) => {
    try {
        const {
            ledgerId,
            particulars,
            transactionType,
            amount,
            description,
            date,
            createdBy,
        } = req.body;

        if (!particulars || !transactionType || !amount) {
            return badRequestResponse(res, 400, "Required fields missing");
        }

        const amt = parseFloat(amount);

        // 🔍 Try to find existing account
        let account = await Account.findOne({ applicantName: particulars });

        // 🔁 If no account, create one
        if (!account) {
            const newAccountNumber = await generateNextAccountNumber();
            const initBalance = transactionType === 'withdrawal' ? 0 : amt;

            account = await Account.create({
                applicantName: particulars,
                accountNumber: newAccountNumber,
                balance: initBalance,
                accountType: 'Auto-Created',
                branch: 'Auto',
                accountOpenDate: date || new Date(),
            });
        } else {
            // ✅ Update existing account balance
            if (["withdrawal", "penalty", "loanRepayment"].includes(transactionType)) {
                if (account.balance < amt) {
                    return badRequestResponse(res, 400, "Insufficient balance for debit transaction");
                }
                account.balance -= amt;
            } else if (["deposit", "interest", "loanDisbursed", "openingBalance"].includes(transactionType)) {
                account.balance += amt;
            }

            await account.save();
        }

        // 💾 Save ledger entry
        const payload = {
            particulars,
            transactionType,
            amount: amt,
            balance: account.balance,
            description,
            date: date || new Date(),
            createdBy: createdBy || req.user?.name || 'Manual Entry',
        };

        let entry;
        if (ledgerId) {
            entry = await Ledger.findByIdAndUpdate(ledgerId, payload, { new: true });
            if (!entry) return notFoundResponse(res, 404, "Ledger entry not found");
        } else {
            entry = await Ledger.create(payload);
        }

        return successResponse(res, 200, "Ledger entry saved and account handled", entry);
    } catch (err) {
        console.error("❌ Ledger Save Error:", err);
        return errorResponse(res, 500, "Failed to save ledger", err.message);
    }
};

// ✅ Get Ledger by ID
export const getLedger = async (req, res) => {
    try {
        const { ledgerId } = req.params;
        if (!ledgerId) return badRequestResponse(res, 400, "Ledger ID is required");

        const entry = await Ledger.findById(ledgerId);
        if (!entry) return notFoundResponse(res, 404, "Ledger entry not found");

        return successResponse(res, 200, "Ledger entry fetched successfully", entry);
    } catch (err) {
        return errorResponse(res, 500, "Failed to fetch ledger", err.message);
    }
};

// ✅ Get All Ledger Entries with Pagination, Search, Filter
export const getAllLedgers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const {
            search = '',
            applicantName = '',
            transactionType = '',
            accountType = ''
        } = req.query;

        const matchConditions = [];

        if (search) {
            matchConditions.push({
                $or: [
                    { particulars: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (applicantName) {
            matchConditions.push({ particulars: { $regex: applicantName, $options: 'i' } });
        }

        if (transactionType) {
            matchConditions.push({ transactionType });
        }

        // Build aggregation pipeline
        const pipeline = [
            {
                $match: matchConditions.length ? { $and: matchConditions } : {}
            },
            {
                $lookup: {
                    from: 'accounts',
                    localField: 'particulars',
                    foreignField: 'applicantName',
                    as: 'accountInfo'
                }
            },
            {
                $unwind: {
                    path: '$accountInfo',
                    preserveNullAndEmptyArrays: true
                }
            }
        ];

        // Optional filter by accountType
        if (accountType) {
            pipeline.push({
                $match: {
                    'accountInfo.accountType': accountType
                }
            });
        }

        // Group by user (particulars)
        pipeline.push({
            $group: {
                _id: "$particulars",
                totalCredit: {
                    $sum: {
                        $cond: [
                            { $in: ["$transactionType", ["deposit", "loanDisbursed", "openingBalance", "rdInstallment"]] },
                            "$amount",
                            0
                        ]
                    }
                },
                totalDebit: {
                    $sum: {
                        $cond: [
                            {
                                $in: ["$transactionType", ["withdrawal", "penalty", "loanRepayment", "fine", "principal", "interestPayment"]]
                            },
                            "$amount",
                            0
                        ]
                    }
                },
                totalInterest: {
                    $sum: {
                        $cond: [
                            { $eq: ["$transactionType", "interest"] },
                            "$amount",
                            0
                        ]
                    }
                },
                lastTransactionDate: { $max: "$createdAt" },
                accountType: { $first: "$accountInfo.accountType" },
                initialBalance: { $first: "$accountInfo.balance" },
                balance: {
                    $sum: {
                        $switch: {
                            branches: [
                                {
                                    case: { $in: ["$transactionType", ["deposit", "loanDisbursed", "openingBalance", "rdInstallment"]] },
                                    then: "$amount"
                                },
                                {
                                    case: { $in: ["$transactionType", ["withdrawal", "penalty", "loanRepayment"]] },
                                    then: { $multiply: ["$amount", -1] }
                                }
                            ],
                            default: 0
                        }
                    }
                }
                // balance: {
                //     $sum: {
                //         $cond: [
                //             { $in: ["$transactionType", ["deposit", "interest"]] },
                //             "$amount",
                //             {
                //                 $cond: [
                //                     { $eq: ["$transactionType", "withdrawal"] },
                //                     { $multiply: ["$amount", -1] },
                //                     0
                //                 ]
                //             }
                //         ]
                //     },
                // }
            }
        });

        // Sort latest first
        pipeline.push({ $sort: { lastTransactionDate: -1 } });

        // Count total before pagination
        const groupedAll = await Ledger.aggregate([...pipeline]);
        const totalCount = groupedAll.length;

        // Apply pagination
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });

        const paginatedGrouped = await Ledger.aggregate(pipeline);

        // Overall totals
        let overallCredit = 0;
        let overallDebit = 0;
        let overallInterest = 0;

        groupedAll.forEach(item => {
            overallCredit += item.totalCredit;
            overallDebit += item.totalDebit;
            overallInterest += item.totalInterest;
        });

        const accountTotal = await Account.aggregate([
            { $group: { _id: null, totalBalance: { $sum: "$balance" } } }
        ]);

        const totalBalance = accountTotal[0]?.totalBalance + overallInterest || 0;

        return successResponse(res, 200, "Grouped ledger entries and summary", {
            summary: {
                overallCredit,
                overallDebit,
                overallInterest,
                overallBalance: overallCredit - overallDebit,
            },
            entries: paginatedGrouped.map(item => {
                const initialBalance = item.initialBalance || 0;
                const totalCredit = item.totalCredit || 0;
                const totalDebit = item.totalDebit || 0;
                const totalInterest = item.totalInterest || 0;

                const balance = item?.accountType === 'Auto-Created' ? 0 : totalCredit + totalInterest - totalDebit;

                return {
                    particulars: item._id,
                    totalCredit,
                    totalDebit,
                    totalInterest: item.totalInterest || 0,
                    accountType: item.accountType,
                    balance,
                    isAutoCreated: item?.accountType === 'Auto-Created' ? true : false,
                    lastTransactionDate: item.lastTransactionDate,
                };
            }),
            totalBalance,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            totalCount
        });
    } catch (err) {
        console.error("❌ Fetch error:", err);
        return errorResponse(res, 500, "Failed to fetch ledgers", err.message);
    }
};

export const getLedgerSummaryByParticular = async (req, res) => {
    try {
        const rawParticular = req.params.particular || '-';
        const particular = rawParticular.replace(/-/g, ' ').trim();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const match = { particulars: { $regex: new RegExp(`^${particular}$`, 'i') } };

        // Fetch all matching ledger entries
        const allEntries = await Ledger.find(match).sort({ date: -1, createdAt: -1 });

        let totalCredit = 0;
        let totalDebit = 0;
        let totalInterest = 0;
        let balance = 0;

        allEntries.forEach(entry => {
            const amt = entry.amount || 0;

            switch (entry.transactionType) {
                // ✅ Credit transactions
                case 'deposit':
                case 'interest':
                case 'loanDisbursed':
                case 'openingBalance':
                case 'rdInstallment':
                    totalCredit += amt;
                    balance += amt;
                    if (entry.transactionType === 'interest') totalInterest += amt;
                    break;

                // ✅ Debit transactions
                case 'withdrawal':
                case 'penalty':
                case 'loanRepayment':
                case 'fine':
                case 'principal':
                case 'interestPayment':
                    totalDebit += amt;
                    balance -= amt;
                    break;

                // 🔄 Other types - optional handling
                case 'adjustment':
                case 'transfer':
                case 'autoCreated':
                case 'closingBalance':
                default:
                    break;
            }
        });

        const paginatedEntries = allEntries.slice(skip, skip + limit);

        return successResponse(res, 200, "Ledger summary fetched", {
            particular,
            summary: {
                totalCredit,
                totalDebit,
                totalInterest,
                balance
            },
            entries: paginatedEntries,
            totalCount: allEntries.length,
            totalPages: Math.ceil(allEntries.length / limit),
            currentPage: page
        });
    } catch (err) {
        console.error("❌ Ledger summary error:", err);
        return errorResponse(res, 500, "Failed to fetch ledger summary", err.message);
    }
};

// export const getAllLedgers = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 10;
//         const skip = (page - 1) * limit;

//         const {
//             search = '',
//             applicantName = '',
//             transactionType = '',
//             accountType = ''
//         } = req.query;

//         const matchConditions = [];

//         if (search) {
//             matchConditions.push({
//                 $or: [
//                     { particulars: { $regex: search, $options: 'i' } },
//                     { description: { $regex: search, $options: 'i' } }
//                 ]
//             });
//         }

//         if (applicantName) {
//             matchConditions.push({ particulars: { $regex: applicantName, $options: 'i' } });
//         }

//         if (transactionType) {
//             matchConditions.push({ transactionType });
//         }

//         const pipeline = [
//             {
//                 $match: matchConditions.length ? { $and: matchConditions } : {}
//             },
//             {
//                 $lookup: {
//                     from: 'accounts',
//                     localField: 'particulars',
//                     foreignField: 'applicantName',
//                     as: 'accountInfo'
//                 }
//             },
//             { $unwind: { path: '$accountInfo', preserveNullAndEmptyArrays: true } }
//         ];

//         if (accountType) {
//             pipeline.push({ $match: { 'accountInfo.accountType': accountType } });
//         }

//         const allEntries = await Ledger.aggregate([...pipeline]);

//         const paginatedEntries = await Ledger.aggregate([
//             ...pipeline,
//             { $sort: { createdAt: -1 } },
//             { $skip: skip },
//             { $limit: limit }
//         ]);

//         const particularSummary = {};
//         let overallCredit = 0;
//         let overallDebit = 0;

//         for (const entry of allEntries) {
//             const { particulars, transactionType, amount = 0 } = entry;

//             if (!particularSummary[particulars]) {
//                 particularSummary[particulars] = {
//                     particular: particulars,
//                     totalCredit: 0,
//                     totalDebit: 0,
//                     totalInterest: 0,
//                     balance: 0,
//                 };
//             }

//             if (transactionType === 'deposit') {
//                 particularSummary[particulars].totalCredit += amount;
//                 overallCredit += amount;
//                 particularSummary[particulars].balance += amount;
//             } else if (transactionType === 'interest') {
//                 particularSummary[particulars].totalCredit += amount;
//                 particularSummary[particulars].totalInterest += amount;
//                 overallCredit += amount;
//                 particularSummary[particulars].balance += amount;
//             } else if (transactionType === 'withdrawal') {
//                 if (particularSummary[particulars].balance >= amount) {
//                     particularSummary[particulars].totalDebit += amount;
//                     particularSummary[particulars].balance -= amount;
//                     overallDebit += amount;
//                 } else {
//                     particularSummary[particulars].invalidDebit = true;
//                 }
//             }
//         }

//         const summaryArray = Object.values(particularSummary);

//         const accountTotal = await Account.aggregate([
//             { $group: { _id: null, totalBalance: { $sum: "$balance" } } }
//         ]);
//         const totalBalance = accountTotal[0]?.totalBalance || 0;

//         return successResponse(res, 200, "Ledger entries and summary", {
//             summary: {
//                 overallCredit,
//                 overallDebit,
//                 overallBalance: overallCredit - overallDebit,
//                 particularSummary: summaryArray
//             },
//             entries: paginatedEntries,
//             totalBalance,
//             totalPages: Math.ceil(allEntries.length / limit),
//             currentPage: page,
//             totalCount: allEntries.length
//         });
//     } catch (err) {
//         console.error("❌ Fetch error:", err);
//         return errorResponse(res, 500, "Failed to fetch ledgers", err.message);
//     }
// };

// ✅ Delete Ledger Entry
export const deleteLedger = async (req, res) => {
    try {
        const { ledgerId } = req.params;
        if (!ledgerId) return badRequestResponse(res, 400, "Ledger ID is required");

        const entry = await Ledger.findById(ledgerId);
        if (!entry) return notFoundResponse(res, 404, "Ledger entry not found");

        const account = await Account.findOne({ applicantName: entry.particulars });
        if (!account) return notFoundResponse(res, 404, "Associated account not found");

        const amount = parseFloat(entry.amount || 0);
        const type = entry.transactionType;

        // 🔁 Revert balance
        const creditTypes = ['deposit', 'loanDisbursed', 'interest', 'openingBalance', 'rdInstallment'];
        const debitTypes = ['withdrawal', 'penalty', 'loanRepayment'];

        if (creditTypes.includes(type)) {
            account.balance -= amount;
        } else if (debitTypes.includes(type)) {
            account.balance += amount;
        }

        if (account.balance < 0) account.balance = 0;

        await account.save();

        // 🔎 Delete corresponding Transaction
        await Transaction.findOneAndDelete({
            accountId: account._id,
            type: entry.transactionType,
            amount: entry.amount,
            date: entry.date
        });

        // 🗑️ Delete Ledger Entry
        await entry.deleteOne();

        return successResponse(res, 200, "Ledger and matching transaction deleted, balance reverted", {
            updatedBalance: account.balance,
            deletedEntry: entry
        });

    } catch (err) {
        console.error("❌ Ledger Deletion Error:", err);
        return errorResponse(res, 500, "Failed to delete ledger", err.message);
    }
};

// ✅ (Optional) Import Ledgers from CSV
export const importLedgerFromCSV = async (req, res) => {
    try {
        const filePath = req.file?.path;
        if (!filePath) return badRequestResponse(res, 400, "CSV file is required");

        const results = [];
        const imported = [];
        const failed = [];

        const parseCSV = () =>
            new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on("data", (row) => results.push(row))
                    .on("end", () => resolve())
                    .on("error", (err) => reject(err));
            });

        await parseCSV();
        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            try {
                const payload = {
                    particulars: row.particulars,
                    transactionType: row.transactionType,
                    amount: parseFloat(row.amount),
                    balance: parseFloat(row.balance),
                    description: row.description,
                    date: row.date ? new Date(row.date) : undefined,
                    createdBy: row.createdBy,
                };
                await Ledger.create(payload);
                imported.push(payload.particulars);
            } catch (err) {
                failed.push({ row: i + 2, reason: err.message });
            }
        }

        fs.unlinkSync(filePath);

        return successResponse(res, 200, "CSV import completed", {
            importedCount: imported.length,
            failedCount: failed.length,
            failed,
        });
    } catch (err) {
        return errorResponse(res, 500, "CSV import failed", err.message);
    }
};

export const getOverallFinancialSummary = async (req, res) => {
    try {
        const { month, year } = req.query;

        let startDate = null;
        let endDate = null;

        if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 1);
        } else if (year) {
            startDate = new Date(year, 0, 1);
            endDate = new Date(parseInt(year) + 1, 0, 1);
        }

        // Fetch all ledgers sorted by date
        const allLedgers = await Ledger.find().sort({ date: 1 }).lean();

        // Ledgers before the selected range (for opening balance)
        const openingLedgers = allLedgers.filter(l => startDate && new Date(l.date) < startDate);

        // Ledgers within the selected range
        const periodLedgers = startDate && endDate
            ? allLedgers.filter(l => new Date(l.date) >= startDate && new Date(l.date) < endDate)
            : allLedgers;

        // ➕ Opening Balance Calculation
        let openingBalance = 0;
        for (const entry of openingLedgers) {
            const amt = entry.amount || 0;
            switch (entry.transactionType) {
                case 'deposit':
                case 'interest':
                case 'loanDisbursed':
                case 'rdInstallment':
                case 'openingBalance':
                    openingBalance += amt;
                    break;

                case 'withdrawal':
                case 'penalty':
                case 'loanRepayment':
                case 'fine':
                case 'principal':
                case 'interestPayment':
                    openingBalance -= amt;
                    break;

                default:
                    break;
            }
        }

        // 📊 Summary for Selected Period
        let totalCredit = 0;
        let totalDebit = 0;
        let totalInterest = 0;
        let totalLedgerAmount = 0;
        let closingBalance = openingBalance;

        for (const entry of periodLedgers) {
            const amt = entry.amount || 0;
            totalLedgerAmount += amt;

            switch (entry.transactionType) {
                case 'deposit':
                case 'loanDisbursed':
                case 'rdInstallment':
                case 'openingBalance':
                    totalDebit += amt;
                    closingBalance += amt;
                    break;

                case 'interest':
                    totalInterest += amt;
                    totalDebit += amt;
                    closingBalance += amt;
                    break;

                case 'withdrawal':
                case 'loanRepayment':
                case 'fine':
                case 'principal':
                case 'interestPayment':
                    totalCredit += amt;
                    closingBalance -= amt;
                    break;

                default:
                    break;
            }
        }

        return successResponse(res, 200, "Financial summary calculated", {
            filter: {
                month: month ? parseInt(month) : null,
                year: year ? parseInt(year) : null
            },
            openingBalance,
            closingBalance,
            totalLedgerAmount,
            ledger: {
                totalCredit,
                totalDebit,
                totalInterest,
                net: totalDebit - totalCredit
            }
        });
    } catch (err) {
        console.error("❌ Summary Error:", err);
        return errorResponse(res, 500, "Failed to calculate summary", err.message);
    }
};

export const getTodayLedgerEntryCount = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const count = await Ledger.countDocuments({
            createdAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        return successResponse(res, 200, "Today's ledger entry count", {
            date: startOfDay.toISOString().split('T')[0],
            count
        });
    } catch (err) {
        console.error("❌ Today's Count Error:", err);
        return errorResponse(res, 500, "Failed to fetch today's ledger count", err.message);
    }
};

// export const getMonthlyLedgerReport = async (req, res) => {
//     try {
//         let { month, year, page = 1, limit = 10 } = req.query;
//         page = parseInt(page);
//         limit = parseInt(limit);

//         if (!month || !year) {
//             const now = new Date();
//             month = now.getMonth() + 1;
//             year = now.getFullYear();
//         }

//         const startDate = new Date(year, month - 1, 1);
//         const endDate = new Date(year, month, 1);

//         const allLedgers = await Ledger.find().sort({ createdAt: 1 }).lean();

//         let openingBalance = 0;
//         for (const entry of allLedgers) {
//             if (new Date(entry.date) >= startDate) break;

//             const amt = entry.amount || 0;
//             if (["deposit", "interest", "openingBalance", "rdInstallment"].includes(entry.transactionType)) {
//                 openingBalance += amt;
//             } else if (["withdrawal", "loanDisbursed", "loanRepayment", "fine", "penalty", "principal", "interestPayment"].includes(entry.transactionType)) {
//                 openingBalance -= amt;
//             }
//         }

//         let balance = openingBalance;
//         let fullEntries = [];
//         let entryId = 1;

//         fullEntries.push({
//             entryId: entryId++,
//             date: startDate.toISOString().split('T')[0],
//             ledgerHead: "Opening Balance",
//             description: "Cash in hand",
//             debit: `₹${openingBalance.toLocaleString('en-IN')}`,
//             credit: "-",
//             balance: `₹${openingBalance.toLocaleString('en-IN')}`
//         });

//         for (const entry of allLedgers) {
//             const entryDate = new Date(entry.date);
//             if (entryDate < startDate || entryDate >= endDate) continue;

//             const isCredit = ["deposit", "interest", "openingBalance", "rdInstallment"].includes(entry.transactionType);
//             const isDebit = ["withdrawal", "loanDisbursed", "loanRepayment", "fine", "penalty", "principal", "interestPayment"].includes(entry.transactionType);
//             const amt = entry.amount || 0;

//             if (isCredit) balance += amt;
//             if (isDebit) balance -= amt;

//             fullEntries.push({
//                 entryId: entryId++,
//                 date: entryDate.toISOString().split('T')[0],
//                 ledgerHead: entry.transactionType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
//                 description: entry.description || '-',
//                 debit: isDebit ? `₹${amt.toLocaleString('en-IN')}` : '-',
//                 credit: isCredit ? `₹${amt.toLocaleString('en-IN')}` : '-',
//                 balance: `₹${balance.toLocaleString('en-IN')}`
//             });
//         }

//         fullEntries.push({
//             entryId: entryId,
//             date: new Date(endDate.getTime() - 1).toISOString().split('T')[0],
//             ledgerHead: "Closing Balance",
//             description: "End of period balance",
//             debit: "-",
//             credit: "-",
//             balance: `₹${balance.toLocaleString('en-IN')}`
//         });

//         const totalEntries = fullEntries.length;
//         const totalPages = Math.ceil(totalEntries / limit);
//         const paginatedEntries = fullEntries.slice((page - 1) * limit, page * limit);

//         return successResponse(res, 200, "Monthly ledger report generated", {
//             month,
//             year,
//             openingBalance,
//             closingBalance: balance,
//             currentPage: page,
//             totalPages,
//             totalEntries,
//             entries: paginatedEntries,
//         });
//     } catch (err) {
//         console.error("❌ Monthly Ledger Report Error:", err);
//         return errorResponse(res, 500, "Failed to generate report", err.message);
//     }
// };

export const exportMonthlyLedgerReport = async (req, res) => {
    try {
        let { month, year, format = 'excel' } = req.query;

        if (!month || !year) {
            const now = new Date();
            month = now.getMonth() + 1;
            year = now.getFullYear();
        }

        const { entries = [], openingBalance, closingBalance } = await generateMonthlyLedgerData(month, year);

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Monthly Ledger');

            sheet.columns = [
                { header: 'Entry ID', key: 'entryId', width: 10 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Ledger Head', key: 'ledgerHead', width: 20 },
                { header: 'Description', key: 'description', width: 30 },
                { header: 'Debit (₹)', key: 'debit', width: 15 },
                { header: 'Credit (₹)', key: 'credit', width: 15 },
                { header: 'Balance (₹)', key: 'balance', width: 20 },
            ];

            entries.forEach(entry => sheet.addRow(entry));

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=ledger_${month}_${year}.xlsx`);
            await workbook.xlsx.write(res);
            res.end();

        } else if (format === 'pdf') {
            const doc = new PDFDocument({ size: 'A4', margin: 30 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=ledger_${month}_${year}.pdf`);
            doc.pipe(res);

            doc.fontSize(16).text(`Monthly Ledger Report (${month}/${year})`, { align: 'center' });
            doc.moveDown().fontSize(12);
            doc.text(`Opening Balance: ₹${openingBalance.toLocaleString('en-IN')}`);
            doc.text(`Closing Balance: ₹${closingBalance.toLocaleString('en-IN')}`);
            doc.moveDown();

            entries.forEach(entry => {
                doc.text(`Date: ${entry.date}`);
                doc.text(`Ledger Head: ${entry.ledgerHead}`);
                doc.text(`Description: ${entry.description}`);
                doc.text(`Debit: ${entry.debit}   |   Credit: ${entry.credit}   |   Balance: ${entry.balance}`);
                doc.moveDown();
            });

            doc.end();

        } else {
            return badRequestResponse(res, 400, "Invalid format. Use ?format=excel or ?format=pdf");
        }

    } catch (err) {
        console.error("❌ Monthly Ledger Export Error:", err);
        return errorResponse(res, 500, "Failed to export monthly ledger report", err.message);
    }
};

export const getMonthlyLedgerReport = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) return badRequestResponse(res, "Month and Year are required.");

        const selectedMonth = parseInt(month);
        const selectedYear = parseInt(year);
        const startDate = new Date(selectedYear, selectedMonth - 1, 1);
        const endDate = new Date(selectedYear, selectedMonth, 1);

        const creditTypes = ['deposit', 'rdinstallment', 'loanrepayment', 'interestpayment'];
        const debitTypes = ['withdrawal', 'loandisbursed', 'processingfee', 'fine', 'servicecharge', 'insurance', 'principal', 'loaninterest'];
        const accountTypes = ['deposit', 'withdrawal', 'rdinstallment', 'transfer'];
        const loanTypes = ['loanrepayment', 'loandisbursed', 'principal', 'interestpayment'];
        const chargeTypes = ['fine', 'processingfee', 'insurance', 'servicecharge', 'loaninterest', 'other'];

        const accountEntriesGrouped = {};
        const loanEntriesGrouped = {};
        const chargeEntriesGrouped = {};
        const mergedEntries = [];

        let accountTotalDebitAll = 0, accountTotalCreditAll = 0;
        let loanTotalDebitAll = 0, loanTotalCreditAll = 0;
        let chargeTotalDebitAll = 0, chargeTotalCreditAll = 0;

        const transactions = await Transaction.find({ createdAt: { $gte: startDate, $lt: endDate } })
            .populate('accountId', 'accountType accountNumber')
            .lean();

        const charges = await AccountCharge.find({ createdAt: { $gte: startDate, $lt: endDate } })
            .populate('accountId', 'accountType accountNumber')
            .lean();

        for (const tx of transactions) {
            const type = tx.type?.toLowerCase();
            const isCredit = creditTypes.includes(type);
            const isDebit = debitTypes.includes(type);
            const amount = tx.amount || 0;

            mergedEntries.push({
                type: tx.type?.toLowerCase(),
                amount,
                debit: isDebit ? amount : 0,
                credit: isCredit ? amount : 0,
                description: tx.description || tx.note || '',
                date: tx.createdAt,
                source: 'Transaction',
                accountType: tx.accountId?.accountType || 'Unknown',
                accountNumber: tx.accountId?.accountNumber || '',
            });
        }

        for (const charge of charges) {
            const chargeType = charge.type?.toLowerCase() || 'unknown';
            if (!chargeTypes.includes(chargeType)) continue;

            if (!chargeEntriesGrouped[chargeType]) {
                chargeEntriesGrouped[chargeType] = {
                    entries: [],
                    totalDebit: 0,
                    totalCredit: 0,
                    total: 0
                };
            }

            const entry = {
                date: charge.chargedDate || charge.createdAt,
                particulars: charge.label || charge.notes || 'Charge',
                type: chargeType,
                debit: 0,
                credit: charge.amount || 0,
                accountNumber: charge.accountId?.accountNumber || '',
                accountHolderName: charge.accountId?.accountHolderName || '',
                accountType: charge.accountId?.accountType || 'Unknown'
            };

            chargeEntriesGrouped[chargeType].entries.push(entry);
            chargeEntriesGrouped[chargeType].totalCredit += entry.credit || 0;
            chargeEntriesGrouped[chargeType].total =
                chargeEntriesGrouped[chargeType].totalCredit - chargeEntriesGrouped[chargeType].totalDebit;

            chargeTotalCreditAll += entry.credit || 0;

            mergedEntries.push({
                ...entry,
                amount: entry.credit,
                description: entry.particulars,
                source: 'AccountCharge',
            });
        }

        mergedEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

        // === Opening Balance ===
        const pastTransactions = await Transaction.find({ createdAt: { $lt: startDate } }).lean();
        const pastCharges = await AccountCharge.find({ createdAt: { $lt: startDate } }).lean();

        const pastCredits = pastTransactions
            .filter(tx => creditTypes.includes(tx.type?.toLowerCase()))
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const pastDebits = [
            ...pastTransactions.filter(tx => debitTypes.includes(tx.type?.toLowerCase())),
            ...pastCharges
        ].reduce((sum, entry) => sum + (entry.amount || 0), 0);

        const openingBalance = pastCredits - pastDebits;

        const openingEntry = {
            type: "Opening Balance",
            amount: openingBalance,
            debit: 0,
            credit: openingBalance,
            description: "Opening Balance",
            date: startDate,
            source: "System",
            accountType: "All"
        };

        // === Closing Balance ===
        const tillTransactions = await Transaction.find({ createdAt: { $lt: endDate } }).lean();
        const tillCharges = await AccountCharge.find({ createdAt: { $lt: endDate } }).lean();

        const tillCredits = tillTransactions
            .filter(tx => creditTypes.includes(tx.type?.toLowerCase()))
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const tillDebits = [
            ...tillTransactions.filter(tx => debitTypes.includes(tx.type?.toLowerCase())),
            ...tillCharges
        ].reduce((sum, entry) => sum + (entry.amount || 0), 0);

        const closingBalance = tillCredits - tillDebits;

        const closingEntry = {
            type: "Closing Balance",
            amount: closingBalance,
            debit: 0,
            credit: closingBalance,
            description: "Closing Balance",
            date: new Date(endDate.getTime() - 1),
            source: "System",
            accountType: "All"
        };

        mergedEntries.unshift(openingEntry);
        mergedEntries.push(closingEntry);

        // === Categorization ===
        for (const entry of mergedEntries.slice(1, -1)) {
            const type = entry.type?.toLowerCase();
            const accType = entry.accountType || 'Unknown';

            if (accountTypes.includes(type)) {
                if (!accountEntriesGrouped[accType]) {
                    accountEntriesGrouped[accType] = { entries: [], totalDebit: 0, totalCredit: 0, total: 0 };
                }
                accountEntriesGrouped[accType].entries.push(entry);
                accountEntriesGrouped[accType].totalDebit += entry.debit || 0;
                accountEntriesGrouped[accType].totalCredit += entry.credit || 0;
                accountEntriesGrouped[accType].total =
                    accountEntriesGrouped[accType].totalCredit - accountEntriesGrouped[accType].totalDebit;

                accountTotalDebitAll += entry.debit || 0;
                accountTotalCreditAll += entry.credit || 0;

            } else if (loanTypes.includes(type)) {
                if (!loanEntriesGrouped[accType]) {
                    loanEntriesGrouped[accType] = { entries: [], totalDebit: 0, totalCredit: 0, total: 0 };
                }
                loanEntriesGrouped[accType].entries.push(entry);
                loanEntriesGrouped[accType].totalDebit += entry.debit || 0;
                loanEntriesGrouped[accType].totalCredit += entry.credit || 0;
                loanEntriesGrouped[accType].total =
                    loanEntriesGrouped[accType].totalCredit - loanEntriesGrouped[accType].totalDebit;

                loanTotalDebitAll += entry.debit || 0;
                loanTotalCreditAll += entry.credit || 0;
            }
        }

        return successResponse(res, 200, "Monthly Ledger Report", {
            opening: openingEntry,
            closing: closingEntry,
            fullEntries: mergedEntries,
            categorized: {
                accountEntries: {
                    ...accountEntriesGrouped,
                    totalDebitAll: accountTotalDebitAll,
                    totalCreditAll: accountTotalCreditAll,
                    totalAll: accountTotalCreditAll - accountTotalDebitAll
                },
                loanEntries: {
                    ...loanEntriesGrouped,
                    totalDebitAll: loanTotalDebitAll,
                    totalCreditAll: loanTotalCreditAll,
                    totalAll: loanTotalCreditAll - loanTotalDebitAll
                },
                chargeEntries: {
                    ...chargeEntriesGrouped,
                    totalDebitAll: chargeTotalDebitAll,
                    totalCreditAll: chargeTotalCreditAll,
                    totalAll: chargeTotalCreditAll - chargeTotalDebitAll
                }
            }
        });

    } catch (error) {
        console.error(error);
        return errorResponse(res, 500, "Failed to generate ledger report.");
    }
};





