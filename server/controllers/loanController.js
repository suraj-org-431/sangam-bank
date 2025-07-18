import Loan from '../models/Loan.js';
import Account from '../models/Account.js';
import { createTransactionAndLedger } from '../utils/accountLedger.js';
import { successResponse, errorResponse, badRequestResponse } from '../utils/response.js';
import Config from '../models/Config.js';
import { generateRepaymentSchedule } from '../utils/loanUtils.js';
import { applyApprovedLoanAdjustment } from '../utils/adjustmentUtils.js';
import { notify } from '../utils/notify.js';

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
            remarks,
            adjustments: []
        });

        borrower.hasLoan = true;
        await borrower.save();
        await notify('loan', {}, newLoan?._id || {}, "Loan Created", `Loan #${newLoan?._id} created`);

        return successResponse(res, 201, 'Loan application created', newLoan);
    } catch (err) {
        console.error('❌ Loan creation failed:', err);
        return errorResponse(res, 500, 'Failed to create loan', err.message);
    }
};

// ✅ Add Adjustment (POST /loans/:loanId/adjust)
export const addLoanAdjustment = async (req, res) => {
    try {
        const { loanId } = req.params;
        const { type, amount, remarks } = req.body;

        if (!type || !amount) {
            return badRequestResponse(res, 400, 'Adjustment type and amount are required');
        }

        const loan = await Loan.findById(loanId).populate('borrower');
        if (!loan) return badRequestResponse(res, 404, 'Loan not found');

        const adjustment = {
            type,
            amount: parseFloat(amount),
            remarks,
            status: 'pending',
            createdAt: new Date(),
            createdBy: req.user?.name || 'Admin'
        };

        loan.adjustments.push(adjustment);
        await loan.save();

        return successResponse(res, 200, 'Loan adjustment created (pending)', adjustment);
    } catch (err) {
        console.error('❌ Loan adjustment creation failed:', err);
        return errorResponse(res, 500, 'Adjustment creation failed', err.message);
    }
};

// ✅ Approve Adjustment (PUT /loans/:loanId/adjust/:adjustId/approve)
export const approveLoanAdjustment = async (req, res) => {
    try {
        const { loanId, adjustId } = req.params;
        const userName = req.user?.name || 'Admin';

        const loan = await Loan.findById(loanId).populate('borrower');
        if (!loan) return badRequestResponse(res, 404, 'Loan not found');

        const adjustment = loan.adjustments.id(adjustId);
        if (!adjustment) return badRequestResponse(res, 404, 'Adjustment not found');
        if (adjustment.status !== 'pending') return badRequestResponse(res, 400, 'Already processed');

        await applyApprovedLoanAdjustment({ loan, adjustment, userName });

        return successResponse(res, 200, 'Adjustment approved and applied', adjustment);
    } catch (err) {
        console.error('❌ Adjustment approval failed:', err?.message);
        return errorResponse(res, 500, 'Adjustment approval failed', err.message);
    }
};

// ✅ Reject Adjustment
export const rejectLoanAdjustment = async (req, res) => {
    try {
        const { loanId, adjustId } = req.params;
        const { reason } = req.body;

        const loan = await Loan.findById(loanId);
        if (!loan) return badRequestResponse(res, 404, 'Loan not found');

        const adjustment = loan.adjustments.id(adjustId);
        if (!adjustment) return badRequestResponse(res, 404, 'Adjustment not found');
        if (adjustment.status !== 'pending') return badRequestResponse(res, 400, 'Already processed');

        adjustment.status = 'rejected';
        adjustment.approvedBy = req.user?.name || 'Admin';
        adjustment.approvedAt = new Date();
        adjustment.remarks = reason || adjustment.remarks;

        await loan.save();
        return successResponse(res, 200, 'Adjustment rejected', adjustment);
    } catch (err) {
        return errorResponse(res, 500, 'Adjustment rejection failed', err.message);
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
                    )
                    : null;

            return {
                _id: loan._id,
                borrowerName: loan.borrower?.applicantName || 'N/A',
                accountNumber: loan.borrower?.accountNumber || '',
                amount: loan.loanAmount,
                loanType: loan.loanType,
                status: loan.status,
                emiAmount: emi ? Number(emi) : null,
                remainingPrincipal: loan.borrower?.loanDetails?.disbursedAmount || 0
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
            repaymentSchedule: loan.repaymentSchedule || [],
            adjustments: loan.adjustments || []
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
        if (loan.status !== 'pending') return badRequestResponse(res, 400, 'Loan cannot be approved');

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
        if (loan.status !== 'approved') return badRequestResponse(res, 400, 'Loan must be approved before disbursement');

        const disbursedDate = new Date();
        const borrower = loan.borrower;

        const config = await Config.findOne();
        const configRate = config?.loanInterestRates?.find(r =>
            r.type?.toLowerCase() === loan.loanType?.toLowerCase()
        )?.rate;

        const interestRate = configRate || loan.interestRate || 12;
        const { schedule, emiAmount } = generateRepaymentSchedule({
            loanAmount: loan.loanAmount,
            interestRate,
            tenureMonths: loan.tenureMonths,
            disbursementDate: disbursedDate
        });

        // Update Account
        borrower.balance += loan.loanAmount;
        borrower.hasLoan = true;
        borrower.loanDetails = {
            totalLoanAmount: loan.loanAmount,
            disbursedAmount: loan.loanAmount,
            interestRate,
            tenureMonths: loan.tenureMonths,
            emiAmount,
            disbursedDate,
            status: 'disbursed',
            nextDueDate: schedule[0]?.dueDate,
            repaymentSchedule: schedule
        };
        await borrower.save();

        // Update Loan
        loan.status = 'disbursed';
        loan.disbursedAmount = loan.loanAmount;
        loan.disbursedDate = disbursedDate;
        loan.repaymentSchedule = schedule;
        loan.emiAmount = emiAmount;
        loan.nextDueDate = schedule[0]?.dueDate;
        await loan.save();

        // Ledger entry
        await createTransactionAndLedger({
            account: borrower,
            type: 'loanDisbursed',
            amount: loan.loanAmount,
            description: `Loan Disbursed for ₹${loan.loanAmount}`,
            date: disbursedDate,
            loanId: loan._id,
            createdBy: req.user?.name || 'Loan Admin'
        });

        return successResponse(res, 200, 'Loan disbursed and schedule generated', loan);
    } catch (err) {
        console.error('❌ Loan disbursement error:', err);
        return errorResponse(res, 500, 'Loan disbursement failed', err.message);
    }
};

export const repayLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const { amount, paymentRef, mode = 'emi' } = req.body;

        const loan = await Loan.findById(loanId).populate('borrower');
        if (!loan || loan.status !== 'disbursed') {
            return badRequestResponse(res, 400, 'Loan not disbursed or not found');
        }

        const borrower = loan.borrower;
        const schedule = loan.repaymentSchedule || [];
        const today = new Date();

        const config = await Config.findOne();
        const affectsBalance = config?.fineAffectsBalance ?? true;
        const loanFineRule = config?.fineRules?.find(r => r.accountType === 'Loan');
        const graceDays = loanFineRule?.appliesAfterDays ?? config?.fineConfig?.graceDays ?? 0;
        const fixedFineAmount = loanFineRule?.fineAmount ?? 0;
        const ledgerDescription = loanFineRule?.ledgerDescription || 'Loan Fine';

        let remainingAmount = amount;
        const repayments = [];

        for (let i = 0; i < schedule.length; i++) {
            const installment = schedule[i];
            if (installment.paid) continue;

            let fine = 0;
            const dueWithGrace = new Date(installment.dueDate);
            dueWithGrace.setDate(dueWithGrace.getDate() + graceDays);
            if (today > dueWithGrace) {
                fine = fixedFineAmount;
            }

            if (mode === 'full') {
                while (i < schedule.length) {
                    const installment = schedule[i];
                    if (installment.paid) {
                        i++;
                        continue;
                    }

                    let fine = 0;
                    const dueWithGrace = new Date(installment.dueDate);
                    dueWithGrace.setDate(dueWithGrace.getDate() + graceDays);
                    if (today > dueWithGrace) {
                        fine = fixedFineAmount;
                    }

                    const principal = installment.principal || 0;
                    const interest = installment.interest || 0;
                    const totalDue = principal + interest;
                    const totalWithFine = totalDue + (affectsBalance ? fine : 0);

                    if (remainingAmount >= totalWithFine) {
                        installment.amountPaid = totalDue;
                        installment.paid = true;
                        installment.paidOn = today;
                        installment.fine = fine;
                        installment.paymentRef = paymentRef || `TXN-${Date.now()}`;

                        repayments.push({ installment, amount: totalWithFine, fine });
                        remainingAmount -= totalWithFine;
                        i++;
                    } else {
                        break;
                    }
                }
            } else {
                // Find next unpaid installment
                const installment = schedule.find(i => !i.paid);
                if (installment) {
                    let fine = 0;
                    const dueWithGrace = new Date(installment.dueDate);
                    dueWithGrace.setDate(dueWithGrace.getDate() + graceDays);
                    if (today > dueWithGrace) {
                        fine = fixedFineAmount;
                    }

                    const principal = installment.principal || 0;
                    const interest = installment.interest || 0;
                    const totalDue = principal + interest;
                    const totalWithFine = totalDue + (affectsBalance ? fine : 0);

                    if (mode === 'emi' && remainingAmount >= totalWithFine) {
                        installment.amountPaid = totalDue;
                        installment.paid = true;
                        installment.paidOn = today;
                        installment.fine = fine;
                        installment.paymentRef = paymentRef || `TXN-${Date.now()}`;

                        repayments.push({ installment, amount: totalWithFine, fine });
                        remainingAmount -= totalWithFine;
                    } else if (mode === 'custom' && remainingAmount > 0) {
                        for (let j = i; j < schedule.length; j++) {
                            const installment = schedule[j];
                            if (installment.paid) continue;

                            let fine = 0;
                            const dueWithGrace = new Date(installment.dueDate);
                            dueWithGrace.setDate(dueWithGrace.getDate() + graceDays);
                            if (today > dueWithGrace) {
                                fine = fixedFineAmount;
                            }

                            const principal = installment.principal || 0;
                            const interest = installment.interest || 0;
                            const totalDue = principal + interest;
                            const totalWithFine = totalDue + (affectsBalance ? fine : 0);
                            const alreadyPaid = installment.amountPaid || 0;
                            const dueRemaining = totalDue - alreadyPaid;

                            const paymentNow = Math.min(dueRemaining, remainingAmount);

                            if (paymentNow > 0) {
                                installment.amountPaid = alreadyPaid + paymentNow;
                                installment.fine = fine;
                                installment.paidOn = today;
                                installment.paymentRef = paymentRef || `TXN-${Date.now()}`;

                                if (installment.amountPaid >= totalDue) {
                                    installment.paid = true;
                                }

                                repayments.push({
                                    installment,
                                    amount: paymentNow + (affectsBalance ? fine : 0),
                                    fine
                                });

                                remainingAmount -= paymentNow;

                                if (remainingAmount <= 0) break;
                            }
                        }

                    }
                }
            }
        }

        const totalPaid = amount - remainingAmount;

        // Update Account.loanDetails
        borrower.loanDetails.totalPaidAmount = (borrower.loanDetails.totalPaidAmount || 0) + totalPaid;
        borrower.loanDetails.disbursedAmount = Math.max(loan.loanAmount - borrower.loanDetails.totalPaidAmount, 0);
        borrower.loanDetails.lastEMIPaidOn = today;
        borrower.loanDetails.nextDueDate = schedule.find(i => !i.paid)?.dueDate || null;
        borrower.loanDetails.repaymentSchedule = schedule;

        if (!schedule.find(i => !i.paid)) {
            borrower.loanDetails.status = 'repaid';
            borrower.loanDetails.defaultedOn = null;
        }

        // Update Loan
        loan.repaymentSchedule = schedule;
        loan.lastEMIPaidOn = today;
        loan.nextDueDate = borrower.loanDetails.nextDueDate;

        if (!schedule.find(i => !i.paid)) {
            loan.status = 'repaid';
        }

        await borrower.save();
        await loan.save();

        // Ledger entries
        for (const rep of repayments) {
            const index = schedule.indexOf(rep.installment);
            const emiLabel = `${index + 1}${getOrdinal(index + 1)} EMI`;

            await createTransactionAndLedger({
                account: borrower,
                type: 'loanRepayment',
                amount: rep.installment.principal,
                description: `${emiLabel} Principal Paid`,
                date: today,
                loanId: loan._id,
                createdBy: req.user?.name || 'Clerk',
                additionalTransactions: [
                    {
                        type: 'interestPayment',
                        amount: rep.installment.interest,
                        description: `${emiLabel} Interest Paid`
                    },
                    ...(rep.fine > 0 ? [{
                        type: 'fine',
                        amount: rep.fine,
                        description: `${ledgerDescription} - ${emiLabel}`,
                        affectsBalance
                    }] : [])
                ],
            });
        }

        return successResponse(res, 200, 'Loan repayment successful', {
            paidInstallments: repayments.length,
            totalPaid,
            remainingAmount,
            status: loan.status
        });

    } catch (err) {
        console.error('❌ Repayment failed:', err);
        return errorResponse(res, 500, 'Loan repayment failed', err.message);
    }
};


// export const repayLoan = async (req, res) => {
//     try {
//         const { loanId } = req.params;
//         const { amount, paymentRef, mode = 'emi' } = req.body;

//         const loan = await Loan.findById(loanId).populate('borrower');
//         if (!loan || loan.status !== 'disbursed') {
//             return badRequestResponse(res, 400, 'Loan not disbursed or not found');
//         }

//         const borrower = loan.borrower;
//         const schedule = loan.repaymentSchedule || [];
//         const today = new Date();

//         const config = await Config.findOne();
//         const affectsBalance = config?.fineAffectsBalance ?? true;
//         const loanFineRule = config?.fineRules?.find(r => r.accountType === 'Loan');
//         const graceDays = loanFineRule?.appliesAfterDays ?? config?.fineConfig?.graceDays ?? 0;
//         const fixedFineAmount = loanFineRule?.fineAmount ?? 0;
//         const ledgerDescription = loanFineRule?.ledgerDescription || 'Loan Fine';

//         let remainingAmount = amount;
//         const repayments = [];

//         for (let i = 0; i < schedule.length; i++) {
//             const installment = schedule[i];
//             if (installment.paid) continue;

//             let fine = 0;
//             const dueWithGrace = new Date(installment.dueDate);
//             dueWithGrace.setDate(dueWithGrace.getDate() + graceDays);
//             if (today > dueWithGrace) {
//                 fine = fixedFineAmount;
//             }

//             const principal = installment.principal || 0;
//             const interest = installment.interest || 0;
//             const totalDue = principal + interest;
//             const totalWithFine = totalDue + (affectsBalance ? fine : 0);


//             if (mode === 'full' && remainingAmount >= totalDueAmount) {
//                 // FULL REPAYMENT MODE: pay off all remaining installments
//                 for (const rep of estimatedRepayments) {
//                     const { installment, principal, interest, fine, total } = rep;

//                     installment.amountPaid = principal + interest;
//                     installment.paid = true;
//                     installment.paidOn = today;
//                     installment.fine = fine;
//                     installment.paymentRef = paymentRef || `TXN-${Date.now()}`;

//                     repayments.push({ installment, amount: total, fine });
//                     remainingAmount -= total;
//                 }

//                 loan.status = 'repaid';
//                 borrower.loanDetails.status = 'repaid';
//                 borrower.loanDetails.defaultedOn = null;
//             } else if (remainingAmount >= totalWithFine) {
//                 installment.amountPaid = totalDue;
//                 installment.paid = true;
//                 installment.paidOn = today;
//                 installment.fine = fine;
//                 installment.paymentRef = paymentRef || `TXN-${Date.now()}`;

//                 repayments.push({ installment, amount: totalDue, fine });
//                 remainingAmount -= totalDue;
//             } else if (mode === 'custom' && remainingAmount > 0) {
//                 // Partial payment
//                 installment.amountPaid = (installment.amountPaid || 0) + remainingAmount;
//                 installment.fine = fine;
//                 installment.paidOn = today;
//                 installment.paymentRef = paymentRef || `TXN-${Date.now()}`;

//                 if (installment.amountPaid >= totalDue) {
//                     installment.paid = true;
//                 }

//                 repayments.push({ installment, amount: remainingAmount, fine });
//                 remainingAmount = 0;
//                 break;
//             } else {
//                 break;
//             }

//             if (mode === 'emi') break;
//         }

//         const totalPaid = amount - remainingAmount;

//         // Update Account.loanDetails
//         borrower.loanDetails.totalPaidAmount = (borrower.loanDetails.totalPaidAmount || 0) + totalPaid;
//         borrower.loanDetails.disbursedAmount = Math.max(loan.loanAmount - borrower.loanDetails.totalPaidAmount, 0);
//         borrower.loanDetails.lastEMIPaidOn = today;
//         borrower.loanDetails.nextDueDate = schedule.find(i => !i.paid)?.dueDate || null;
//         borrower.loanDetails.repaymentSchedule = schedule;

//         if (!schedule.find(i => !i.paid)) {
//             borrower.loanDetails.status = 'repaid';
//             borrower.loanDetails.defaultedOn = null;
//         }

//         // Update Loan
//         loan.repaymentSchedule = schedule;
//         loan.lastEMIPaidOn = today;
//         loan.nextDueDate = borrower.loanDetails.nextDueDate;

//         if (!schedule.find(i => !i.paid)) {
//             loan.status = 'repaid';
//         }

//         await borrower.save();
//         await loan.save();

//         // Ledger entries
//         for (const rep of repayments) {
//             const index = schedule.indexOf(rep.installment);
//             const emiLabel = `${index + 1}${getOrdinal(index + 1)} EMI`;

//             await createTransactionAndLedger({
//                 account: borrower,
//                 type: 'loanRepayment',
//                 amount: rep.installment.principal,
//                 description: `${emiLabel} Principal Paid`,
//                 date: today,
//                 loanId: loan._id,
//                 createdBy: req.user?.name || 'Clerk',
//                 additionalTransactions: [
//                     {
//                         type: 'interestPayment',
//                         amount: rep.installment.interest,
//                         description: `${emiLabel} Interest Paid`
//                     },
//                     ...(rep.fine > 0 ? [{
//                         type: 'fine',
//                         amount: rep.fine,
//                         description: `${ledgerDescription} - ${emiLabel}`,
//                         affectsBalance
//                     }] : [])
//                 ],
//                 totalRepaymentAmount: rep.amount,
//                 loan,
//                 installment: rep.installment
//             });
//         }

//         return successResponse(res, 200, 'Loan repayment successful', {
//             paidInstallments: repayments.length,
//             totalPaid,
//             remainingAmount,
//             status: loan.status
//         });

//     } catch (err) {
//         console.error('❌ Repayment failed:', err);
//         return errorResponse(res, 500, 'Loan repayment failed', err.message);
//     }
// };

// PUT /loans/:loanId/reject
export const rejectLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const { reason } = req.body;

        const loan = await Loan.findById(loanId).populate('borrower');
        if (!loan) return badRequestResponse(res, 404, 'Loan not found');
        if (loan.status !== 'pending') return badRequestResponse(res, 400, 'Only draft loans can be rejected');

        loan.status = 'rejected';
        loan.remarks = reason || 'Rejected without reason';
        await loan.save();

        if (loan.borrower) {
            loan.borrower.loanDetails.status = 'rejected';
            loan.borrower.loanDetails.remarks = reason;
            await loan.borrower.save();
        }

        return successResponse(res, 200, 'Loan rejected', loan);
    } catch (err) {
        return errorResponse(res, 500, 'Loan rejection failed', err.message);
    }
};

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"],
        v = n % 100;
    return (s[(v - 20) % 10] || s[v] || s[0]);
}

