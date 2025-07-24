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
export const upsertAccountCharge = async (req, res) => {
    try {
        const {
            chargeId,       // optional: for update
            applicantName,  // to find/create account
            type,           // 'processingFee', 'insurance', etc.
            label,          // short title
            amount,
            chargedDate,
            notes
        } = req.body;

        if (!type || !label || !amount || !chargedDate) {
            return badRequestResponse(res, 400, "Required fields missing");
        }

        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) {
            return badRequestResponse(res, 400, "Invalid amount");
        }

        // 🔍 Find or create account
        let account = await Account.findOne({ applicantName });

        // if (!account) {
        //     const newAccountNumber = await generateNextAccountNumber();
        //     account = await Account.create({
        //         applicantName,
        //         accountNumber: newAccountNumber,
        //         balance: 0,
        //         accountType: 'Auto-Created',
        //         branch: 'Auto',
        //         accountOpenDate: chargedDate || new Date()
        //     });
        // }

        // 💾 Create or update AccountCharge
        const payload = {
            accountId: account._id,
            type,
            label,
            amount: amt,
            chargedDate: chargedDate || new Date(),
            notes,
            createdBy: req.user?._id  // assumes req.user is populated (from auth middleware)
        };

        let charge;
        if (chargeId) {
            charge = await AccountCharge.findByIdAndUpdate(chargeId, payload, { new: true });
            if (!charge) return notFoundResponse(res, "Charge not found");
        } else {
            charge = await AccountCharge.create(payload);
        }

        return successResponse(res, 200, "Account charge saved successfully", charge);

    } catch (err) {
        console.error("❌ AccountCharge Save Error:", err);
        return errorResponse(res, 500, "Failed to save account charge", err.message);
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

        const creditTypes = ['deposit', 'rdinstallment', 'loanrepayment', 'interestpayment', 'loaninterest', 'processingfee', 'fine', 'servicecharge', 'insurance', 'principal', 'cashnnhand'];
        const debitTypes = ['withdrawal', 'loandisbursed', 'salarypayment', 'officeexpenses', 'interestpayout',];
        const accountTypes = ['deposit', 'withdrawal', 'rdinstallment', 'transfer'];
        const loanTypes = ['loanrepayment', 'loandisbursed', 'principal', 'interestpayment'];
        const chargeTypes = ['fine', 'processingfee', 'insurance', 'servicecharge', 'loaninterest', 'interestpayment', 'other', 'salarypayment', 'interestpayout', 'officeexpenses', 'cashnnhand',];

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
            const isCredit = creditTypes.includes(chargeType);
            const isDebit = debitTypes.includes(chargeType);
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
                debit: isDebit ? charge.amount : 0,
                credit: isCredit ? charge.amount : 0,
                accountNumber: charge.accountId?.accountNumber || '',
                accountHolderName: charge.accountId?.accountHolderName || '',
                accountType: charge.accountId?.accountType || 'Auto-Created'
            };

            chargeEntriesGrouped[chargeType].entries.push(entry);
            chargeEntriesGrouped[chargeType].totalDebit += entry.debit || 0;
            chargeEntriesGrouped[chargeType].totalCredit += entry.credit || 0;
            chargeEntriesGrouped[chargeType].total = chargeEntriesGrouped[chargeType].totalCredit - chargeEntriesGrouped[chargeType].totalDebit;

            chargeTotalDebitAll += entry.debit || 0;
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

        const openingBalance = pastCredits + pastDebits;

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
        console.log(error)
        return errorResponse(res, 500, "Failed to generate ledger report.");
    }
};

// ========== Export Monthly Ledger ==========
export const exportMonthlyLedgerReport = async (req, res) => {
    try {
        let { month, year, format = 'excel' } = req.query;

        if (!month || !year) {
            const now = new Date();
            month = now.getMonth() + 1;
            year = now.getFullYear();
        }

        const mockRes = {
            status: (code) => ({
                json: (obj) => ({ statusCode: code, data: obj })
            }),
            json: (obj) => ({ statusCode: 200, data: obj })
        };

        const result = await getMonthlyLedgerReport({ query: { month, year } }, mockRes);

        console.log(result)
        if (!result || result.statusCode !== 200) {
            return errorResponse(res, 500, "Failed to fetch ledger report");
        }

        const { opening, closing, categorized } = result.data?.data;
        const { accountEntries, loanEntries, chargeEntries } = categorized;

        const flattenGroupedEntries = (group) =>
            Object.entries(group)
                .filter(([key]) => !['totalDebitAll', 'totalCreditAll', 'totalAll'].includes(key))
                .flatMap(([head, section]) =>
                    section.entries.map(entry => ({
                        ...entry,
                        head,
                    }))
                );

        const accountRows = flattenGroupedEntries(accountEntries);
        const loanRows = flattenGroupedEntries(loanEntries);
        const chargeRows = flattenGroupedEntries(chargeEntries);

        // === Excel Export ===
        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();

            const createSheet = (title, rows) => {
                const sheet = workbook.addWorksheet(title);
                sheet.columns = [
                    { header: 'Date', key: 'date', width: 20 },
                    { header: 'Ledger Head', key: 'head', width: 20 },
                    { header: 'Account No.', key: 'accountNumber', width: 20 },
                    { header: 'Account Type', key: 'accountType', width: 20 },
                    { header: 'Description', key: 'description', width: 30 },
                    { header: 'Debit (₹)', key: 'debit', width: 15 },
                    { header: 'Credit (₹)', key: 'credit', width: 15 },
                ];

                rows.forEach(entry => {
                    sheet.addRow({
                        date: new Date(entry.date).toLocaleDateString('en-IN'),
                        head: entry.head,
                        accountNumber: entry.accountNumber,
                        accountType: entry.accountType,
                        description: entry.label || '',
                        debit: entry.debit || 0,
                        credit: entry.credit || 0,
                    });
                });
            };

            createSheet('Account Entries', accountRows);
            createSheet('Loan Entries', loanRows);
            createSheet('Charge Entries', chargeRows);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=ledger_categorized_${month}_${year}.xlsx`);
            await workbook.xlsx.write(res);
            return res.end();
        }

        // === PDF Export ===
        if (format === 'pdf') {
            const doc = new PDFDocument({ size: 'A4', margin: 30 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=ledger_categorized_${month}_${year}.pdf`);
            doc.pipe(res);

            doc.fontSize(16).text(`Categorized Monthly Ledger Report (${month}/${year})`, { align: 'center' });
            doc.moveDown().fontSize(12);
            doc.text(`Opening Balance: ₹${opening.amount?.toLocaleString('en-IN') || 0}`);
            doc.text(`Closing Balance: ₹${closing.amount?.toLocaleString('en-IN') || 0}`);
            doc.moveDown();

            const renderSection = (label, rows) => {
                doc.addPage();
                doc.fontSize(14).text(label, { underline: true }).moveDown();

                const data = {};

                for (const row of rows) {
                    const head = row.head || 'Unknown';
                    if (!data[head]) data[head] = { dr: 0, cr: 0 };
                    data[head].dr += row.debit || 0;
                    data[head].cr += row.credit || 0;
                }

                doc.font('Helvetica-Bold');
                ['Head', 'DR', 'CR', 'Total'].forEach(header => doc.text(header, { continued: true, width: 130 }));
                doc.moveDown();

                doc.font('Helvetica');
                Object.entries(data).forEach(([head, val]) => {
                    const total = val.cr - val.dr;
                    doc.text(head, { continued: true, width: 130 });
                    doc.text(val.dr.toLocaleString('en-IN'), { continued: true, width: 130 });
                    doc.text(val.cr.toLocaleString('en-IN'), { continued: true, width: 130 });
                    doc.text(total.toLocaleString('en-IN'), { width: 130 });
                });

                const totalDr = Object.values(data).reduce((sum, d) => sum + d.dr, 0);
                const totalCr = Object.values(data).reduce((sum, d) => sum + d.cr, 0);
                const totalNet = totalCr - totalDr;

                doc.moveDown(0.5).font('Helvetica-Bold').text("TOTAL", { continued: true, width: 130 });
                doc.text(totalDr.toLocaleString('en-IN'), { continued: true, width: 130 });
                doc.text(totalCr.toLocaleString('en-IN'), { continued: true, width: 130 });
                doc.text(totalNet.toLocaleString('en-IN'), { width: 130 });

                doc.moveDown(1);
                return totalNet;
            };

            const netAccount = renderSection("Account Transactions", accountRows);
            const netLoan = renderSection("Loan Transactions", loanRows);
            const netCharge = renderSection("Charges & Fees", chargeRows);

            const netTotal = netAccount + netLoan + netCharge;

            doc.addPage();
            doc.fontSize(14).text("Summary", { underline: true }).moveDown();
            doc.fontSize(12).text(`Opening Balance: ₹${opening.amount?.toLocaleString('en-IN')}`);
            doc.text(`Closing Balance: ₹${closing.amount?.toLocaleString('en-IN')}`);
            doc.moveDown();

            const summaryLine = (label, value) => {
                doc.text(`${label}: ₹${value.toLocaleString('en-IN')}`);
            };

            summaryLine("Account Transactions", netAccount);
            summaryLine("Loan Transactions", netLoan);
            summaryLine("Charges & Fees", netCharge);
            doc.moveDown();
            doc.fontSize(14).fillColor('blue').text(`Net Total: ₹${netTotal.toLocaleString('en-IN')}`);

            doc.end();
            return;
        }

        return badRequestResponse(res, 400, "Invalid format. Use ?format=excel or ?format=pdf");
    } catch (err) {
        console.error("❌ Monthly Ledger Export Error:", err);
        return errorResponse(res, 500, "Failed to export monthly ledger", err.message);
    }
};
