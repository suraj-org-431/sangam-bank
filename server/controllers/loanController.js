// controllers/loanController.js
import Loan from '../models/Loan.js';
import Account from '../models/Account.js';
import Ledger from '../models/Ledger.js';
import Transaction from '../models/Transaction.js';
import { createTransactionAndLedger } from '../utils/accountLedger.js'; // adjust path if needed
import { successResponse, errorResponse, badRequestResponse } from '../utils/response.js';

// ✅ Create Loan Application
export const createLoan = async (req, res) => {
    try {
        const { borrowerId, loanAmount, loanType, interestRate, tenureMonths, remarks } = req.body;

        if (!borrowerId || !loanAmount || !loanType || !interestRate || !tenureMonths) {
            return badRequestResponse(res, 400, 'All loan fields are required');
        }

        const borrower = await Account.findById(borrowerId);
        if (!borrower) return badRequestResponse(res, 404, 'Borrower not found');

        const newLoan = await Loan.create({
            borrower: borrowerId,
            loanAmount,
            loanType,
            interestRate,
            tenureMonths,
            remarks
        });

        borrower.hasLoan = true;
        await borrower.save();

        return successResponse(res, 201, 'Loan application created', newLoan);
    } catch (err) {
        console.error('❌ Loan creation failed:', err);
        return errorResponse(res, 500, 'Failed to create loan', err.message);
    }
};

// ✅ Get All Loans with pagination, filter, and search
export const getAllLoans = async (req, res) => {
    try {
        const { search = '', status, page = 1, limit = 10 } = req.query;

        const query = {};

        if (status) {
            query.status = status;
        }

        // Optional: search borrower name or accountNumber
        if (search) {
            query.$or = [
                { 'borrowerName': { $regex: search, $options: 'i' } }, // from virtual/projected fields
            ];
        }

        // Populate borrower
        const loans = await Loan.find(query)
            .populate('borrower', 'applicantName accountNumber')
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await Loan.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        // Transform response
        const entries = loans.map((loan) => {
            const monthlyInterestRate = loan.interestRate / 100 / 12;
            const emi =
                loan.loanAmount && loan.tenureMonths
                    ? (
                        (loan.loanAmount * monthlyInterestRate *
                            Math.pow(1 + monthlyInterestRate, loan.tenureMonths)) /
                        (Math.pow(1 + monthlyInterestRate, loan.tenureMonths) - 1)
                    ).toFixed(2)
                    : null;

            return {
                _id: loan._id,
                borrowerName: loan.borrower?.applicantName || 'N/A',
                accountNumber: loan.borrower?.accountNumber || '',
                amount: loan.loanAmount,
                loanType: loan.loanType,
                status: loan.status,
                emiAmount: emi ? Number(emi) : null,
            };
        });

        return successResponse(res, 200, 'Loan list fetched', {
            entries,
            totalPages,
            totalCount: total,
        });
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch loans', err.message);
    }
};

export const getLoanById = async (req, res) => {
    try {
        const { loanId } = req.params;
        const loan = await Loan.findById(loanId).populate('borrower');

        if (!loan) return badRequestResponse(res, 404, 'Loan not found');

        const response = {
            _id: loan._id,
            borrowerName: loan.borrower.applicantName,
            loanAmount: loan.loanAmount,
            loanType: loan.loanType,
            interestRate: loan.interestRate,
            tenureMonths: loan.tenureMonths,
            status: loan.status,
            repaymentSchedule: loan.repaymentSchedule || []
        };

        return successResponse(res, 200, 'Loan fetched successfully', response);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch loan', err.message);
    }
};

export const approveLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const loan = await Loan.findById(loanId).populate('borrower');

        if (!loan) return badRequestResponse(res, 404, 'Loan not found');
        if (loan.status !== 'draft') return badRequestResponse(res, 400, 'Loan cannot be approved');

        loan.status = 'approved';
        await loan.save();

        // Update account.loanDetails.status
        if (loan.borrower) {
            loan.borrower.loanDetails = loan.borrower.loanDetails || {};
            loan.borrower.loanDetails.status = 'approved';
            await loan.borrower.save();
        }

        return successResponse(res, 200, 'Loan approved successfully', loan);
    } catch (err) {
        return errorResponse(res, 500, 'Loan approval failed', err.message);
    }
};

// ✅ Disburse Loan
export const disburseLoan = async (req, res) => {
    try {
        const { loanId } = req.params;

        const loan = await Loan.findById(loanId).populate('borrower');
        if (!loan) return badRequestResponse(res, 404, 'Loan not found');

        if (loan.status !== 'approved') {
            return badRequestResponse(res, 400, 'Loan must be approved before disbursement');
        }

        const disbursedDate = new Date();
        const borrower = loan.borrower;

        // 🧮 Update account balance
        borrower.balance += loan.loanAmount;

        // 📝 Update loan details in account
        borrower.loanDetails = {
            totalLoanAmount: loan.loanAmount,
            disbursedAmount: loan.loanAmount,
            interestRate: loan.interestRate,
            tenureMonths: loan.tenureMonths,
            disbursedDate: disbursedDate,
            status: 'disbursed'
        };
        borrower.hasLoan = true;
        await borrower.save();

        // 🏦 Update loan model
        loan.status = 'disbursed';
        loan.disbursedAmount = loan.loanAmount;
        loan.disbursedDate = disbursedDate;
        await loan.save();

        // 🧾 Create ledger + transaction entry
        await createTransactionAndLedger({
            account: borrower,
            type: 'loanDisbursed',
            amount: loan.loanAmount,
            description: `Loan Disbursed for ₹${loan.loanAmount}`,
            date: disbursedDate,
            loanId: loan._id,
            createdBy: req.user?.name || 'Loan Admin'
        });

        return successResponse(res, 200, 'Loan disbursed successfully', loan);
    } catch (err) {
        console.error('❌ Loan disbursement error:', err);
        return errorResponse(res, 500, 'Loan disbursement failed', err.message);
    }
};
// export const disburseLoan = async (req, res) => {
//     try {
//         const { loanId } = req.params;
//         const loan = await Loan.findById(loanId).populate('borrower');
//         if (!loan) return badRequestResponse(res, 404, 'Loan not found');
//         if (loan.status !== 'approved') return badRequestResponse(res, 400, 'Loan already disbursed or closed');

//         const disbursedDate = new Date();
//         const borrower = loan.borrower;

//         // Add disbursement to balance
//         borrower.balance += loan.loanAmount;
//         borrower.loanDetails = {
//             totalLoanAmount: loan.loanAmount,
//             disbursedAmount: loan.loanAmount,
//             interestRate: loan.interestRate,
//             tenureMonths: loan.tenureMonths,
//             disbursedDate,
//             status: 'disbursed'
//         };
//         await borrower.save();

//         loan.status = 'disbursed';
//         loan.disbursedAmount = loan.loanAmount;
//         loan.disbursedDate = disbursedDate;
//         await loan.save();

//         await createTransactionAndLedger({
//             account: borrower,
//             type: 'loanDisbursed',
//             amount: loan.loanAmount,
//             description: `Loan Disbursed for ₹${loan.loanAmount}`,
//             date: disbursedDate,
//             loanId: loan?._id,
//             createdBy: req.user?.name || 'Loan Admin'
//         });

//         return successResponse(res, 200, 'Loan disbursed successfully', loan);
//     } catch (err) {
//         return errorResponse(res, 500, 'Loan disbursement failed', err.message);
//     }
// };

// ✅ Repay Loan
export const repayLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) return badRequestResponse(res, 400, 'Invalid repayment amount');

        const loan = await Loan.findById(loanId).populate('borrower');
        if (!loan || loan.status !== 'disbursed') return badRequestResponse(res, 400, 'Invalid loan');

        const borrower = loan.borrower;
        console.log('Borrower:', borrower.balance);
        console.log('amount:', amount);
        if (borrower.balance < amount) return badRequestResponse(res, 400, 'Insufficient balance');

        loan.repaymentSchedule = loan.repaymentSchedule || [];
        loan.repaymentSchedule.push({
            dueDate: new Date(),
            amount,
            paid: true,
            paidOn: new Date()
        });

        const totalPaid = loan.repaymentSchedule.reduce((sum, r) => sum + (r.paid ? r.amount : 0), 0);
        if (totalPaid >= loan.loanAmount) loan.status = 'repaid';

        // ✅ Use helper
        await createTransactionAndLedger({
            account: borrower,
            type: 'loanRepayment',
            amount,
            description: 'Loan Repayment',
            date: new Date(),
            createdBy: req.user?.name || 'Repayment Clerk'
        });

        await loan.save();

        return successResponse(res, 200, 'Loan repayment recorded', loan);
    } catch (err) {
        return errorResponse(res, 500, 'Loan repayment failed', err.message);
    }
};

