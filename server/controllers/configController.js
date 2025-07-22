import Config from '../models/Config.js';
import { applyLoanFines, applyRecurringFines } from '../utils/fineService.js';
import { applyInterestToAllAccounts } from "../utils/interestService.js";
import { successResponse, errorResponse } from '../utils/response.js';

// 🔍 Get config
export const getConfig = async (req, res) => {
    try {
        const config = await Config.findOne() || await Config.create({});
        return successResponse(res, 200, 'Config fetched', config);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch config', err.message);
    }
};

// ✏️ Update config
export const updateConfig = async (req, res) => {
    try {
        const updates = req.body;
        let config = await Config.findOne();

        if (!config) {
            config = new Config();
        }

        Object.assign(config, updates);
        config.updatedAt = new Date();

        await config.save();

        return successResponse(res, 200, 'Config updated successfully', config);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to update config', err.message);
    }
};

// ✅ Apply Interest and Fines to All Accounts
export const applyMonthlyInterest = async (req, res) => {
    try {
        const interestResult = await applyInterestToAllAccounts();
        const rdFineResult = await applyRecurringFines();
        const loanFineResult = await applyLoanFines();

        return successResponse(res, 200, "Monthly interest and fines applied", {
            interestApplied: interestResult.updatedCount,
            rdFinesApplied: rdFineResult.finedAccounts,
            rdTotalFine: rdFineResult.totalFineAmount,
            loanFinesApplied: loanFineResult.finedLoans,
            loanTotalFine: loanFineResult.totalFineAmount
        });
    } catch (err) {
        return errorResponse(res, 500, "Interest and fine application failed", err.message);
    }
};
