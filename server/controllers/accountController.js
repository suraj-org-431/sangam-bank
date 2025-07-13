import fs from "fs";
import csv from "csv-parser";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import { notify } from "../utils/notify.js";
import {
    successResponse,
    errorResponse,
    badRequestResponse,
    notFoundResponse
} from "../utils/response.js";
import { createTransactionAndLedger } from "../utils/accountLedger.js";

const withFullUrl = (path, baseUrl) => {
    if (!path) return null;
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const generateNextAccountNumber = async () => {
    const last = await Account.findOne().sort({ accountNumber: -1 }).lean();
    return last?.accountNumber ? String(Number(last.accountNumber) + 1) : '10500801';
};

export const generateAccountNumberAPI = async (req, res) => {
    try {
        const next = await generateNextAccountNumber();
        return successResponse(res, 200, "Generated account number", { accountNumber: next });
    } catch (err) {
        console.error('❌ Error generating account number:', err);
        return errorResponse(res, 500, "Failed to generate account number", err.message);
    }
};

export const upsertAccount = async (req, res) => {
    try {
        const {
            accId,
            accountType, tenure, branch, applicantName, gender, dob,
            occupation, phone, fatherOrHusbandName, relation,
            address, aadhar, depositAmount, introducerName,
            membershipNumber, introducerKnownSince, accountNumber,
            nomineeName, nomineeRelation, nomineeAge, managerName,
            lekhpalOrRokapal, formDate, accountOpenDate,
        } = req.body;

        const formatPhone = (num) =>
            num?.replace(/\D/g, '').slice(0, 10).replace(/(\d{5})(\d{0,5})/, '$1 $2').trim();

        const payload = {
            accountType,
            tenure: isNaN(parseInt(row.tenure)) ? null : parseInt(row.tenure),
            branch,
            applicantName,
            gender,
            phone,
            dob,
            occupation,
            mobile: formatPhone(phone),
            fatherOrHusbandName,
            relation,
            address: typeof address === 'string' ? JSON.parse(address) : address,
            aadhar,
            depositAmount,
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
            accountOpenDate,
        };

        // Handle file uploads
        if (req.files) {
            if (req.files.signature?.[0]) {
                payload.signaturePath = `/uploads/signatures/${req.files.signature[0].filename}`;
            }
            if (req.files.verifierSignature?.[0]) {
                payload.verifierSignaturePath = `/uploads/verifierSignatures/${req.files.verifierSignature[0].filename}`;
            }
            if (req.files.profileImage?.[0]) {
                payload.profileImage = `/uploads/profileImages/${req.files.profileImage[0].filename}`;
            }
        }
        let account;
        if (accId) {
            account = await Account.findByIdAndUpdate(accId, payload, { new: true });
        } else {
            payload.balance = payload.depositAmount;
            account = await Account.create(payload);
            await Transaction.create({
                accountId: account._id,
                type: 'deposit',
                amount: payload.depositAmount,
                description: 'Initial deposit',
                date: payload.accountOpenDate || new Date(),
            });
            await createTransactionAndLedger({
                account,
                type: 'deposit',
                amount: payload.depositAmount,
                description: 'Initial deposit',
                date: payload.accountOpenDate || new Date(),
                createdBy: req.user?.name || 'System'
            });
            await notify(req.user || {}, "Account Created", `Account #${payload.accountNumber} created`);
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
                    depositAmount: parseFloat(row.depositAmount),
                    introducerName: row.introducerName,
                    membershipNumber: row.membershipNumber,
                    introducerKnownSince: row.introducerKnownSince,
                    accountNumber: row.accountNumber || await generateNextAccountNumber(),
                    nomineeName: row.nomineeName,
                    nomineeRelation: row.nomineeRelation,
                    nomineeAge: parseInt(row.nomineeAge),
                    managerName: row.managerName,
                    lekhpalOrRokapal: row.lekhpalOrRokapal,
                    formDate: row.formDate ? new Date(row.formDate) : null,
                    accountOpenDate: row.accountOpenDate ? new Date(row.accountOpenDate) : null,
                    signaturePath: row.signaturePath || null,
                    verifierSignaturePath: row.verifierSignaturePath || null,
                    profileImage: row.profileImage || null,
                };

                const account = await Account.create(payload);
                // ✅ Create initial deposit transaction
                await createTransactionAndLedger({
                    account,
                    type: 'deposit',
                    amount: payload.depositAmount,
                    description: 'Initial deposit',
                    date: payload.accountOpenDate || new Date(),
                    createdBy: req.user?.name || 'System'
                });
                imported.push(payload.accountNumber);
            } catch (err) {
                console.error(`❌ Row ${i + 2} failed:`, err.message);
                failedRows.push({ row: i + 2, reason: err.message });
            }
        }

        fs.unlinkSync(filePath); // Clean up temp file

        if (imported.length === 0 && failedRows.length === 0) {
            return successResponse(res, 200, "No accounts imported. All records were duplicates or invalid.", {
                importedCount: 0,
                skippedCount: skipped.length,
                failedCount: 0,
                imported: [],
                skipped,
                failedRows: [],
            });
        }

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
