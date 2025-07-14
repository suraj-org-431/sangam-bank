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
                            { $in: ["$transactionType", ["deposit", "interest", "loanDisbursed", "openingBalance"]] },
                            "$amount",
                            0
                        ]
                    }
                },
                totalDebit: {
                    $sum: {
                        $cond: [
                            { $in: ["$transactionType", ["withdrawal", "penalty", "loanRepayment"]] },
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
                                    case: { $in: ["$transactionType", ["deposit", "interest", "loanDisbursed", "openingBalance"]] },
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
        const particular = rawParticular?.replace(/-/g, ' ').trim();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const match = { particulars: { $regex: new RegExp(`^${particular}$`, 'i') } };

        // Fetch all entries for this particular
        const allEntries = await Ledger.find(match).sort({ createdAt: -1 });

        let totalCredit = 0;
        let totalDebit = 0;
        let totalInterest = 0;
        let balance = 0;

        allEntries.forEach(entry => {
            const amt = entry.amount || 0;
            switch (entry.transactionType) {
                case 'deposit':
                case 'interest':
                case 'loanDisbursed':
                case 'openingBalance':
                    totalCredit += amt;
                    if (entry.transactionType === 'interest') totalInterest += amt;
                    balance += amt;
                    break;

                case 'withdrawal':
                case 'penalty':
                case 'loanRepayment':
                    totalDebit += amt;
                    balance -= amt;
                    break;

                case 'adjustment':
                case 'transfer':
                case 'autoCreated':
                case 'closingBalance':
                    // No effect or custom logic
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

        const deleted = await Ledger.findByIdAndDelete(ledgerId);
        if (!deleted) return notFoundResponse(res, 404, "Ledger not found");

        return successResponse(res, 200, "Ledger entry deleted successfully");
    } catch (err) {
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

        // 🔹 All ledgers (needed for opening and closing calculations)
        const allLedgers = await Ledger.find().sort({ date: 1 }).lean();

        // 🔹 Ledgers before the selected range (for opening balance)
        const openingLedgers = allLedgers.filter(l => startDate && new Date(l.date) < startDate);

        // 🔹 Ledgers within the selected range (for total ledger and closing balance)
        const periodLedgers = startDate && endDate
            ? allLedgers.filter(l => new Date(l.date) >= startDate && new Date(l.date) < endDate)
            : allLedgers;

        // ➕ Opening Balance Calculation
        let openingBalance = 0;
        for (const entry of openingLedgers) {
            const amt = entry.amount || 0;
            if (entry.transactionType === 'deposit' || entry.transactionType === 'interest') {
                openingBalance += amt;
            } else if (entry.transactionType === 'withdrawal') {
                openingBalance -= amt;
            }
        }

        // 📊 Calculate Total Ledger and Closing Balance
        let totalCredit = 0;
        let totalDebit = 0;
        let totalInterest = 0;
        let totalLedgerAmount = 0;
        let closingBalance = openingBalance;

        for (const entry of periodLedgers) {
            const amt = entry.amount || 0;
            totalLedgerAmount += amt;

            if (entry.transactionType === 'deposit') {
                totalDebit += amt;
                closingBalance += amt;
            } else if (entry.transactionType === 'interest') {
                totalInterest += amt;
                totalCredit += amt;
                closingBalance += amt;
            } else if (entry.transactionType === 'withdrawal') {
                totalCredit += amt;
                closingBalance -= amt;
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
                net: totalCredit - totalDebit
            }
        });
    } catch (err) {
        console.error("❌ Summary Error:", err);
        return errorResponse(res, 500, "Failed to calculate summary", err.message);
    }
};
