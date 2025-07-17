import { createTransactionAndLedger } from './accountLedger.js';

/**
 * Applies a single approved adjustment to a loan and borrower.
 */
export const applyApprovedLoanAdjustment = async ({ loan, adjustment, userName = 'System' }) => {
    if (!loan || !adjustment || !loan.borrower) {
        throw new Error('Invalid loan or adjustment');
    }

    const borrower = loan.borrower;
    const now = new Date();
    const amount = parseFloat(adjustment.amount || 0);
    const description = `Loan Adjustment: ${adjustment.type} - ${adjustment.remarks || ''}`;

    // 🟡 WAIVE FINE
    if (adjustment.type === 'waiveFine') {
        let fineWaived = 0
        loan.repaymentSchedule = loan.repaymentSchedule.map(r => {
            if (!r.paid && r.fine > 0) {
                fineWaived += r.fine;
                r.fine = 0;
            }
            return r;
        });

        await createTransactionAndLedger({
            account: borrower,
            type: 'adjustment',
            amount: 0,
            description,
            date: now,
            loanId: loan._id,
            createdBy: userName,
            adjustmentType: 'waiveFine'
        });

        // 🔴 WRITE OFF
    } else if (adjustment.type === 'writeOff') {
        const oldAmount = loan.disbursedAmount || 0;
        loan.disbursedAmount = Math.max(0, oldAmount - amount);
        borrower.loanDetails.disbursedAmount = Math.max(0, (borrower.loanDetails.disbursedAmount || 0) - amount);

        await createTransactionAndLedger({
            account: borrower,
            type: 'adjustment',
            amount,
            description,
            date: now,
            loanId: loan._id,
            createdBy: userName,
            adjustmentType: 'writeOff'
        });

        // 🟢 CUSTOM ADJUSTMENT
    } else if (adjustment.type === 'customAdjustment') {
        orrower.loanDetails.adjustedAmount = (borrower.loanDetails.adjustedAmount || 0) + amount;
        borrower.loanDetails.disbursedAmount = Math.max(0, (borrower.loanDetails.disbursedAmount || 0) - amount);
        loan.disbursedAmount = Math.max(0, (loan.disbursedAmount || 0) - amount);

        await createTransactionAndLedger({
            account: borrower,
            type: 'adjustment',
            amount,
            description,
            date: now,
            loanId: loan._id,
            createdBy: userName,
            adjustmentType: 'customAdjustment'
        });
    }

    // ✅ Mark adjustment as approved
    adjustment.status = 'approved';
    adjustment.approvedBy = userName;
    adjustment.approvedAt = now;

    await borrower.save();
    await loan.save();

    return { borrower, loan };
};
