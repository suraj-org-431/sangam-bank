import fs from "fs";
import csv from "csv-parser";
import Account from "../models/Account.js";
import { notify } from "../utils/notify.js";
import {
    successResponse,
    errorResponse,
    badRequestResponse,
    notFoundResponse
} from "../utils/response.js";
import { createTransactionAndLedger } from "../utils/accountLedger.js";
import Config from '../models/Config.js';
import Loan from "../models/Loan.js";
import { calculateMaturity } from "../utils/calculateMaturity.js";
import { accountNumberStartFrom } from "../utils/constants.js";
import { calculateLoanDetails } from "../utils/calculateLoanDetails.js";
import AccountCharge from "../models/AccountCharge.js";
import { generateRepaymentSchedule } from "../utils/loanUtils.js";
import Transaction from "../models/Transaction.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const withFullUrl = (path, baseUrl) => {
    if (!path) return null;
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const generateNextAccountNumber = async (accountType) => {
    const last = await Account.findOne({ accountType }).sort({ accountNumber: -1 }).lean();
    let startFrom;
    if (accountType === 's/f') {
        startFrom = accountNumberStartFrom["s/f"];
    }
    else if (accountType === 'recurring') {
        startFrom = accountNumberStartFrom.recurring;
    }
    else if (accountType === 'fixed') {
        startFrom = accountNumberStartFrom.fixed;
    }
    else if (accountType === 'mis') {
        startFrom = accountNumberStartFrom.mis;
    }
    else if (accountType === 'loan') {
        startFrom = accountNumberStartFrom.loan;
    }
    else {
        startFrom = 1;
    }
    return last?.accountNumber ? String(Number(last.accountNumber) + 1) : startFrom;
};

export const generateAccountNumberAPI = async (req, res) => {
    try {
        const { accountType } = req.query;
        if (!accountType) {
            return badRequestResponse(res, 400, `Account type is required`);
        }
        const next = await generateNextAccountNumber(accountType);
        return successResponse(res, 200, "Generated account number", { accountNumber: next });
    } catch (err) {
        console.error('❌ Error generating account number:', err);
        return errorResponse(res, 500, "Failed to generate account number", err.message);
    }
};

// ✅ Account Creation + Initial Deposit
export const upsertAccount = async (req, res) => {
    try {
        const {
            accId,
            accountType, tenure, branch, applicantName, gender, dob,
            occupation, phone, fatherOrHusbandName, relation,
            address, aadhar, depositAmount, introducerName,
            membershipNumber, introducerKnownSince, accountNumber,
            nomineeName, nomineeRelation, nomineeAge, managerName,
            lekhpalOrRokapal, formDate, accountOpenDate, loanCategory, interestAccType, paymentType, hasInsurance
        } = req.body;


        const config = await Config.findOne();

        const processingFee = config?.charges?.processingFee ?? 50;
        const lowerType = accountType?.toLowerCase();
        const normalizedInitialDeposits = Object.fromEntries(
            Object.entries(config?.initialDeposits || {}).map(([key, val]) => [key.toLowerCase(), val])
        );
        const defaultDeposit = normalizedInitialDeposits[lowerType];
        const actualDeposit = depositAmount;
        const openDate = new Date(accountOpenDate || new Date());

        const payload = {
            accountType,
            tenure: isNaN(parseInt(tenure)) ? null : parseInt(tenure),
            branch,
            applicantName,
            gender,
            dob,
            occupation,
            phone,
            fatherOrHusbandName,
            relation,
            address: typeof address === 'string' ? JSON.parse(address) : address,
            aadhar,
            depositAmount: lowerType === 'loan' ? 0 : actualDeposit,
            introducerName,
            membershipNumber,
            introducerKnownSince,
            accountNumber,
            nomineeName,
            nomineeRelation,
            nomineeAge,
            managerName,
            lekhpalOrRokapal,
            formDate,
            accountOpenDate: openDate,
        };

        if (depositAmount < defaultDeposit) {
            return badRequestResponse(res, 400, `Minimum amount is ${defaultDeposit}`);
        }

        if (req.files) {
            if (req.files.signature?.[0])
                payload.signaturePath = `/uploads/signatures/${req.files.signature[0].filename}`;
            if (req.files.verifierSignature?.[0])
                payload.verifierSignaturePath = `/uploads/verifierSignatures/${req.files.verifierSignature[0].filename}`;
            if (req.files.profileImage?.[0])
                payload.profileImage = `/uploads/profileImages/${req.files.profileImage[0].filename}`;
        }

        if (!accountNumber) {
            payload.accountNumber = await generateNextAccountNumber(accountType);
        }

        let account;

        if (accId) {
            account = await Account.findByIdAndUpdate(accId, payload, { new: true });
        } else {
            let interestRate = 0;

            if (lowerType === 'loan') {
                interestRate = config?.loanInterestRates?.find(
                    r => r.type?.toLowerCase() === loanCategory
                )?.rate;

            } else {
                interestRate = config?.monthlyInterestRates?.find(
                    r => r.type?.toLowerCase() === lowerType
                )?.rate || 0;
            }

            const { maturityAmount, totalInterest } = calculateMaturity(accountType, actualDeposit, interestRate, parseInt(tenure));
            const maturityDate = new Date(openDate);
            maturityDate.setMonth(maturityDate.getMonth() + parseInt(tenure));

            if (lowerType === 'recurring') {
                const schedule = [];
                for (let i = 0; i < tenure; i++) {
                    const dueDate = new Date(openDate);
                    dueDate.setMonth(dueDate.getMonth() + i);
                    schedule.push({
                        month: i + 1,
                        dueDate,
                        paid: i === 0,
                        fine: 0,
                        paidDate: i === 0 ? new Date() : null
                    });
                }

                payload.recurringDetails = {
                    installmentAmount: actualDeposit,
                    schedule,
                    fineTotal: 0,
                    completedInstallments: 1,
                    isMatured: false,
                    maturityDate,
                    maturityAmount,
                    totalInterest
                };

                account = await Account.create(payload);

                await createTransactionAndLedger({
                    account,
                    type: 'rdInstallment',
                    amount: actualDeposit,
                    description: 'First RD installment on account opening',
                    date: openDate,
                    createdBy: req.user?.name || 'System',
                });
            } else if (lowerType === 'loan') {

                const interestRate = config?.loanInterestRates?.find(
                    r => r.type?.toLowerCase() === loanCategory
                )?.rate || 0;

                const result = calculateLoanDetails({
                    amount: actualDeposit,
                    interestRate,
                    tenure: parseInt(tenure),
                    paymentType
                });

                if (!result) {
                    return badRequestResponse(res, 400, "Invalid loan calculation");
                }

                const schedule = generateRepaymentSchedule({
                    amount: Number(actualDeposit),
                    interestRate,
                    tenure: parseInt(tenure),
                    paymentType,
                    openDate,
                    result
                });

                const processingFee = 50;
                const emiAmount = result.monthlyPayment || 0;
                const totalInterest = result.totalInterest || 0;
                const maturityAmount = result.totalPayable || 0;
                const tenureMonths = parseInt(tenure) || null;

                payload.depositAmount = 0;
                payload.balance = 0;
                payload.hasLoan = true;
                payload.processingFee = processingFee;
                payload.loanDetails = {
                    totalLoanAmount: actualDeposit,
                    disbursedAmount: 0,
                    interestRate,
                    tenureMonths,
                    emiAmount,
                    disbursedDate: null,
                    status: 'pending',
                    nextDueDate: null,
                    lastEMIPaidOn: null,
                    totalPaidAmount: 0,
                    defaultedOn: null,
                    maturityAmount,
                    totalInterest,
                    loanCategory,
                    paymentType,
                    processingFee,
                    repaymentSchedule: schedule
                };

                account = await Account.create(payload);

                await Loan.create({
                    borrower: account._id,
                    loanAmount: actualDeposit,
                    loanCategory,
                    paymentType,
                    interestRate,
                    tenureMonths,
                    status: 'pending',
                    remarks: 'Loan created during account creation',
                    processingFee,
                    repaymentSchedule: schedule
                });
            } else if (lowerType === 'fixed') {
                payload[`${lowerType}Details`] = {
                    depositAmount: actualDeposit,
                    interestRate: 100 / 7,
                    maturityAmount,
                    maturityDate,
                    totalInterest
                };

                account = await Account.create(payload);

                if (actualDeposit > 0) {
                    await createTransactionAndLedger({
                        account,
                        type: 'deposit',
                        amount: actualDeposit,
                        description: 'Initial deposit on account opening',
                        date: openDate,
                        createdBy: req.user?.name || 'System',
                    });
                }
            } else if (lowerType === 'mis') {
                if (['recurring', 's/f'].includes(interestAccType?.toLowerCase())) {
                    const secondType = interestAccType.toLowerCase();

                    const secondaryPayload = {
                        ...payload,
                        accountType: secondType,
                        depositAmount: 0,
                        balance: 0,
                        accountOpenDate: openDate,
                        accountNumber: await generateNextAccountNumber(secondType),
                    };

                    delete secondaryPayload._id; // prevent accidental reuse
                    delete secondaryPayload.misDetails; // remove unrelated field

                    const interestRateSecondary = config?.monthlyInterestRates?.find(
                        r => r.type?.toLowerCase() === secondType
                    )?.rate || 0;

                    const secondaryMaturityDate = new Date(openDate);
                    secondaryMaturityDate.setMonth(secondaryMaturityDate.getMonth() + parseInt(tenure));

                    secondaryPayload[`${secondType === 's/f' ? 's/f' : secondType}Details`] = {
                        depositAmount: 0,
                        interestRate: interestRateSecondary,
                        maturityAmount: 0,
                        maturityDate: secondaryMaturityDate,
                        totalInterest: 0
                    };

                    const secondaryAccount = await Account.create(secondaryPayload);

                    payload[`${lowerType}Details`] = {
                        interestAccount: secondaryAccount?._id,
                        depositAmount: actualDeposit,
                        interestRate: 100 / 7,
                        maturityAmount,
                        maturityDate,
                        totalInterest
                    };

                    await notify(
                        'account',
                        secondaryAccount?._id,
                        null,
                        `Auto-Created ${interestAccType.toUpperCase()} Account`,
                        `Account #${secondaryPayload.accountNumber} created for interest payout from MIS`
                    );
                }

                account = await Account.create(payload);

                if (actualDeposit > 0) {
                    await createTransactionAndLedger({
                        account,
                        type: 'deposit',
                        amount: actualDeposit,
                        description: 'Initial deposit on account opening',
                        date: openDate,
                        createdBy: req.user?.name || 'System',
                    });
                }
            } else if (['s/f', 'current', 'auto-created'].includes(lowerType)) {
                const key = lowerType === 'auto-created' ? 'savingsDetails' : `${lowerType}Details`;
                payload[key] = {
                    depositAmount: actualDeposit,
                    interestRate,
                    maturityAmount,
                    maturityDate,
                    totalInterest
                };

                account = await Account.create(payload);

                if (actualDeposit > 0) {
                    await createTransactionAndLedger({
                        account,
                        type: 'deposit',
                        amount: actualDeposit,
                        description: 'Initial deposit on account opening',
                        date: openDate,
                        createdBy: req.user?.name || 'System',
                    });
                }
            }

            // ---- Prevent Duplicate Insurance Charge ----
            if (hasInsurance?.toLowerCase() === 'yes' && account && lowerType !== 'mis') {
                const existingInsuranceCharge = await AccountCharge.findOne({
                    accountId: account._id,
                    type: 'insurance'
                });

                if (!existingInsuranceCharge) {
                    const insuranceAmount = actualDeposit * 0.02;

                    await AccountCharge.create({
                        accountId: account._id,
                        type: 'insurance',
                        label: `2% Insurance charge on ${accountType}`,
                        amount: parseFloat(insuranceAmount.toFixed(2)),
                        notes: 'Auto-charged during account creation',
                        createdBy: req.user?._id || null
                    });
                }
            }

            // ---- Add ₹50 Processing Fee (one-time only) ----
            if (account && lowerType !== 'mis') {
                const existingProcessingFee = await AccountCharge.findOne({
                    accountId: account._id,
                    type: 'processingFee'
                });

                if (!existingProcessingFee) {
                    await AccountCharge.create({
                        accountId: account._id,
                        type: 'processingFee',
                        label: `₹50 Processing fee for ${accountType}`,
                        amount: processingFee,
                        notes: 'One-time processing fee charged during account creation',
                        createdBy: req.user?._id || null
                    });
                }
            }


            await notify('account', account?._id || null, null, "Account Created", `Account #${payload.accountNumber} created`);
        }

        return successResponse(res, 200, "Account saved successfully", account);
    } catch (err) {
        console.error('❌ Save error:', err);
        return errorResponse(res, 500, "Failed to save account", err.message);
    }
};

// ✅ Get Account Details by User ID
export const getAccount = async (req, res) => {
    try {
        const { accId } = req.params;
        if (!accId) return badRequestResponse(res, 400, "User ID is required");

        const details = await Account.findById(accId).lean();
        if (!details) return notFoundResponse(res, 404, "Account details not found");

        const baseUrl = process.env.BASE_URL || req.protocol + '://' + req.get('host');

        // Append full URL for image fields
        details.signaturePath = withFullUrl(details.signaturePath, baseUrl);
        details.verifierSignaturePath = withFullUrl(details.verifierSignaturePath, baseUrl);
        details.profileImage = withFullUrl(details.profileImage, baseUrl);

        return successResponse(res, 200, "Account details fetched successfully", details);
    } catch (err) {
        return errorResponse(res, 500, "Failed to fetch account details", err.message);
    }
};

// ✅ DELETE Account Details by User ID
export const deleteAccount = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return badRequestResponse(res, 400, "User ID is required");

        const deleted = await Account.findOneAndDelete({ user: userId });
        if (!deleted) return notFoundResponse(res, 404, "Account not found");

        return successResponse(res, 200, "Account details deleted successfully");
    } catch (err) {
        return errorResponse(res, 500, "Failed to delete account", err.message);
    }
};

// ✅ GET /accounts
export const getAllAccounts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        // Extract filters
        const { branch, accountType, gender, tenure } = req.query;

        const query = {
            $or: [
                { applicantName: { $regex: search, $options: 'i' } },
                { accountNumber: { $regex: search, $options: 'i' } },
            ]
        };

        // Apply filters if provided
        if (branch) query.branch = branch;
        if (accountType) query.accountType = accountType;
        if (gender) query.gender = gender;
        if (tenure) query.tenure = tenure;

        const total = await Account.countDocuments(query);

        const accounts = await Account.find(query)
            .sort({ updatedAt: -1 }) // 🔄 updated here
            .skip((page - 1) * limit)
            .limit(limit);

        return successResponse(res, 200, "Accounts fetched successfully", {
            accounts,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalAccounts: total,
        });
    } catch (err) {
        return errorResponse(res, 500, "Failed to fetch accounts", err.message);
    }
};

// ✅ Import Accounts from CSV
export const importAccountsFromCSV = async (req, res) => {
    try {
        const filePath = req.file?.path;
        if (!filePath) return badRequestResponse(res, 400, "CSV file is required");

        const results = [], imported = [], skipped = [], failedRows = [];

        const formatPhone = (num) =>
            num?.replace(/\D/g, '').slice(0, 10).replace(/(\d{5})(\d{0,5})/, '$1 $2').trim();

        const parseCSV = () =>
            new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on("data", (row) => results.push(row))
                    .on("end", resolve)
                    .on("error", reject);
            });

        await parseCSV();

        const config = await Config.findOne();

        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            try {
                if (row.accountNumber) {
                    const exists = await Account.findOne({ accountNumber: row.accountNumber });
                    if (exists) {
                        skipped.push({ row: i + 2, reason: "Duplicate account number" });
                        continue;
                    }
                }

                const lowerType = row.accountType?.toLowerCase();
                const defaultDeposit = config?.initialDeposits?.[lowerType] || 0;
                const actualDeposit = parseFloat(row.depositAmount) || defaultDeposit;
                const openDate = row.accountOpenDate ? new Date(row.accountOpenDate) : new Date();

                const payload = {
                    accountType: row.accountType,
                    tenure: parseInt(row.tenure),
                    branch: row.branch,
                    applicantName: row.applicantName,
                    gender: row.gender,
                    dob: row.dob ? new Date(row.dob) : null,
                    occupation: row.occupation,
                    phone: formatPhone(row.phone),
                    mobile: formatPhone(row.phone),
                    fatherOrHusbandName: row.fatherOrHusbandName,
                    relation: row.relation,
                    address: {
                        village: row.village,
                        post: row.post,
                        block: row.block,
                        district: row.district,
                        state: row.state,
                        pincode: row.pincode,
                    },
                    aadhar: row.aadhar,
                    depositAmount: lowerType === 'loan' ? 0 : actualDeposit,
                    introducerName: row.introducerName,
                    membershipNumber: row.membershipNumber,
                    introducerKnownSince: row.introducerKnownSince,
                    accountNumber: row.accountNumber || await generateNextAccountNumber(row.accountType),
                    nomineeName: row.nomineeName,
                    nomineeRelation: row.nomineeRelation,
                    nomineeAge: parseInt(row.nomineeAge),
                    managerName: row.managerName,
                    lekhpalOrRokapal: row.lekhpalOrRokapal,
                    formDate: row.formDate ? new Date(row.formDate) : null,
                    accountOpenDate: openDate,
                    signaturePath: row.signaturePath || null,
                    verifierSignaturePath: row.verifierSignaturePath || null,
                    profileImage: row.profileImage || null,
                };

                let account;

                if (lowerType === 'recurring') {
                    const installmentAmount = actualDeposit;
                    const schedule = [];

                    for (let j = 0; j < payload.tenure; j++) {
                        const dueDate = new Date(openDate);
                        dueDate.setMonth(dueDate.getMonth() + j);

                        schedule.push({
                            month: j + 1,
                            dueDate,
                            paid: j === 0, // ✅ First marked as paid
                            fine: 0,
                            paidDate: j === 0 ? new Date() : null
                        });
                    }

                    payload.recurringDetails = {
                        installmentAmount,
                        schedule,
                        fineTotal: 0,
                        completedInstallments: 1,
                        isMatured: false,
                        maturityDate: new Date(openDate.setMonth(openDate.getMonth() + payload.tenure))
                    };

                    payload.balance = installmentAmount;

                    account = await Account.create(payload);

                    await createTransactionAndLedger({
                        account,
                        type: 'rdInstallment',
                        amount: installmentAmount,
                        description: 'First RD installment (CSV Import)',
                        date: payload.accountOpenDate,
                        createdBy: req.user?.name || 'System'
                    });
                } else if (lowerType === 'loan') {
                    const loanType = row.loanType || 'General';
                    const interestRate = config?.loanInterestRates?.find(r => r.type?.toLowerCase() === loanType?.toLowerCase())?.rate;

                    payload.hasLoan = true;
                    payload.loanDetails = {
                        totalLoanAmount: actualDeposit,
                        disbursedAmount: 0,
                        interestRate,
                        tenureMonths: parseInt(payload.tenure) || Infinity,
                        emiAmount: 0,
                        disbursedDate: null,
                        status: 'pending',
                        nextDueDate: null
                    };

                    payload.depositAmount = 0;
                    payload.balance = 0;

                    account = await Account.create(payload);

                    await Loan.create({
                        borrower: account._id,
                        loanAmount: actualDeposit,
                        loanType,
                        interestRate,
                        tenureMonths: parseInt(payload.tenure),
                        status: 'pending',
                        remarks: 'Loan created during CSV import',
                        repaymentSchedule: []
                    });
                } else {
                    payload.balance = actualDeposit;
                    account = await Account.create(payload);

                    if (actualDeposit > 0) {
                        await createTransactionAndLedger({
                            account,
                            type: 'deposit',
                            amount: actualDeposit,
                            description: 'Initial deposit on account opening (CSV Import)',
                            date: payload.accountOpenDate,
                            createdBy: req.user?.name || 'System'
                        });
                    }
                }

                imported.push(payload.accountNumber);
            } catch (err) {
                console.error(`❌ Row ${i + 2} failed:`, err.message);
                failedRows.push({ row: i + 2, reason: err.message });
            }
        }

        fs.unlinkSync(filePath); // Clean up temp file

        return successResponse(res, 200, "CSV import completed", {
            importedCount: imported.length,
            skippedCount: skipped.length,
            failedCount: failedRows.length,
            imported,
            skipped,
            failedRows,
        });
    } catch (err) {
        console.error('❌ CSV Import Error:', err);
        return errorResponse(res, 500, "CSV import failed", err.message);
    }
};

// ✅ GET /accounts/total-amount
export const getTotalDepositAmount = async (req, res) => {
    try {
        const result = await Account.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$depositAmount" }
                }
            }
        ]);

        const totalAmount = result[0]?.totalAmount || 0;

        return successResponse(res, 200, "Total deposit amount calculated", { totalAmount });
    } catch (err) {
        console.error('❌ Error calculating total amount:', err);
        return errorResponse(res, 500, "Failed to calculate total amount", err.message);
    }
};

// ✅ GET /accounts/total-balance
export const getTotalBalance = async (req, res) => {
    try {
        const result = await Account.aggregate([
            {
                $group: {
                    _id: null,
                    totalBalance: { $sum: "$balance" }
                }
            }
        ]);

        const totalBalance = result[0]?.totalBalance || 0;

        return successResponse(res, 200, "Total balance calculated", { totalBalance });
    } catch (err) {
        console.error('❌ Error calculating total balance:', err);
        return errorResponse(res, 500, "Failed to calculate total balance", err.message);
    }
};

export const getAccountsCount = async (req, res) => {
    try {
        const count = await Account.countDocuments();
        return successResponse(res, 200, "Total Account fetched sucessfully", { count });
    } catch (err) {
        return errorResponse(res, 500, "Failed to count accounts", err.message);
    }
};

// ✅ GET /accounts/search?query=abc
export const searchAccounts = async (req, res) => {
    try {
        const { query = '' } = req.query;

        if (!query.trim()) {
            return badRequestResponse(res, 400, "Search query is required");
        }

        const regex = new RegExp(query, 'i'); // case-insensitive search

        // Step 1: Get matching accounts
        const accounts = await Account.find({
            $or: [
                { applicantName: { $regex: regex } },
                { accountNumber: { $regex: regex } }
            ]
        })
            .limit(20)
            .lean();

        // Step 2: Get list of all interestAccount references from MIS accounts
        const misAccounts = await Account.find({
            accountType: 'mis',
            'misDetails.interestAccount': { $ne: null }
        }).select('misDetails.interestAccount').lean();

        const misInterestAccountIds = new Set(
            misAccounts.map(acc => String(acc.misDetails?.interestAccount))
        );

        // Step 3: Add misSource flag to each account
        const results = accounts.map(acc => ({
            ...acc,
            misSource: misInterestAccountIds.has(String(acc._id))
        }));

        return successResponse(res, 200, "Search results fetched", { results });
    } catch (err) {
        console.error('❌ Account search error:', err);
        return errorResponse(res, 500, "Failed to search accounts", err.message);
    }
};

export const payRecurringInstallment = async (req, res) => {
    try {
        const { accountId } = req.params;
        const { paymentRef } = req.body;

        const account = await Account.findById(accountId);
        if (!account || account.accountType !== 'Recurring') {
            return notFoundResponse(res, 404, "Recurring account not found");
        }

        const nextInstallment = account.recurringDetails.schedule.find(inst => !inst.paid);
        if (!nextInstallment) {
            return badRequestResponse(res, 400, "All installments are already paid");
        }

        const today = new Date();

        // ✅ Mark as paid
        nextInstallment.paid = true;
        nextInstallment.paidDate = today;
        nextInstallment.paymentRef = paymentRef || `TXN-${Date.now()}`;

        // ✅ Fine if past due date
        if (today > nextInstallment.dueDate) {
            const fine = 10; // or calculate based on rules
            nextInstallment.fine = fine;
            account.recurringDetails.fineTotal += fine;
        }

        // ✅ Update completed count and balance
        account.recurringDetails.completedInstallments += 1;

        await account.save();

        // ✅ Ledger + Transaction Entry
        await createTransactionAndLedger({
            account,
            type: 'rdInstallment',
            amount: account.recurringDetails.installmentAmount,
            description: `RD Installment (Month ${nextInstallment.month})`,
            date: today,
            createdBy: req.user?.name || 'System',
        });

        return successResponse(res, 200, "Installment paid successfully", account);
    } catch (err) {
        console.error("❌ RD Payment Error:", err);
        return errorResponse(res, 500, "Installment payment failed", err.message);
    }
};

export const getAllTransaction = async (req, res) => {
    try {
        const { accId } = req.params;
        const {
            page = 1,
            limit = 10,
            type,
            startDate,
            endDate
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        // ✅ Check if account exists
        const account = await Account.findById(accId);
        if (!account) {
            return res.status(404).json({ success: false, message: "Account not found" });
        }

        // ✅ Build date filter
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        // ✅ Build filter for Transaction model
        const transactionQuery = { accountId: accId };
        if (type) transactionQuery.type = type;
        if (startDate || endDate) transactionQuery.date = dateFilter;

        const transactions = await Transaction.find(transactionQuery).sort({ date: -1 });

        // ✅ Build filter for AccountCharge
        const chargeQuery = { accountId: accId };
        if (type && type !== 'loanRepayment') chargeQuery.type = type;
        if (startDate || endDate) chargeQuery.chargedDate = dateFilter;

        const charges = await AccountCharge.find(chargeQuery).sort({ chargedDate: -1 });

        // ✅ Merge and format both sources
        const merged = [
            ...transactions.map(tx => ({
                source: "Transaction",
                type: tx.type,
                label: tx.description || tx.type,
                amount: tx.amount,
                paymentType: tx.paymentType,
                date: tx.date,
                createdAt: tx.createdAt,
                transactionNo: tx.transactionNo,
                transactionId: tx.transactionId,
                noteBreakdown: tx.noteBreakdown
            })),
            ...charges.map(charge => ({
                source: "Charge",
                type: charge.type,
                label: charge.label,
                amount: charge.amount,
                date: charge.chargedDate,
                createdAt: charge.createdAt,
                notes: charge.notes
            }))
        ];

        // ✅ Sort by createdAt or date
        const sorted = merged.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

        // ✅ Paginate
        const paginated = sorted.slice(skip, skip + Number(limit));

        return res.status(200).json({
            success: true,
            message: "Transactions fetched successfully",
            data: paginated,
            totalCount: sorted.length,
            page: Number(page),
            limit: Number(limit)
        });

    } catch (error) {
        console.error("Error fetching transactions:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch transactions",
            error: error.message
        });
    }
};

export const exportAccountTransactions = async (req, res) => {
    try {
        const { accId } = req.params;
        const { type, startDate, endDate, format = 'pdf' } = req.query;

        // ✅ Validate account
        const account = await Account.findById(accId);
        if (!account) {
            return res.status(404).json({ success: false, message: "Account not found" });
        }

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        const transactionQuery = { accountId: accId };
        if (type) transactionQuery.type = type;
        if (startDate || endDate) transactionQuery.date = dateFilter;

        const chargeQuery = { accountId: accId };
        if (type && type !== 'loanRepayment') chargeQuery.type = type;
        if (startDate || endDate) chargeQuery.chargedDate = dateFilter;

        const transactions = await Transaction.find(transactionQuery).sort({ date: -1 });
        const charges = await AccountCharge.find(chargeQuery).sort({ chargedDate: -1 });

        const merged = [
            ...transactions.map(tx => ({
                source: "Transaction",
                type: tx.type,
                label: tx.description || tx.type,
                amount: tx.amount,
                date: tx.date,
                paymentType: tx.paymentType || ""
            })),
            ...charges.map(charge => ({
                source: "Charge",
                type: charge.type,
                label: charge.label,
                amount: charge.amount,
                date: charge.chargedDate,
                paymentType: ""
            }))
        ];

        const sorted = merged.sort((a, b) => new Date(b.date) - new Date(a.date));

        // ✅ Handle PDF Export
        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=account_${accId}_transactions.pdf`);

            doc.pipe(res);

            doc.fontSize(18).text(`Account Transactions Report`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Account ID: ${accId}`);
            doc.text(`Generated on: ${new Date().toLocaleString()}`);
            doc.moveDown();

            sorted.forEach((entry, index) => {
                doc.text(`${index + 1}. [${entry.source}] ${entry.label}`);
                doc.text(`   Type: ${entry.type}`);
                doc.text(`   Amount: ₹${entry.amount}`);
                doc.text(`   Date: ${new Date(entry.date).toLocaleString()}`);
                if (entry.paymentType) doc.text(`   Payment Type: ${entry.paymentType}`);
                doc.moveDown();
            });

            doc.end();
        }

        // ✅ Handle Excel Export
        else if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Account Transactions");

            worksheet.columns = [
                { header: "S.No", key: "sno", width: 8 },
                { header: "Source", key: "source", width: 15 },
                { header: "Label", key: "label", width: 30 },
                { header: "Type", key: "type", width: 15 },
                { header: "Amount", key: "amount", width: 15 },
                { header: "Date", key: "date", width: 25 },
                { header: "Payment Type", key: "paymentType", width: 20 }
            ];

            sorted.forEach((entry, index) => {
                worksheet.addRow({
                    sno: index + 1,
                    ...entry,
                    date: new Date(entry.date).toLocaleString()
                });
            });

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=account_${accId}_transactions.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        }

        // ❌ Unsupported format
        else {
            return res.status(400).json({
                success: false,
                message: "Invalid format. Only 'pdf' and 'excel' are supported."
            });
        }

    } catch (error) {
        console.error("Export Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to export transactions",
            error: error.message
        });
    }
};
