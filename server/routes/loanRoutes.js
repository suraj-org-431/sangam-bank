import express from 'express';
import { addLoanAdjustment, approveLoan, approveLoanAdjustment, createLoan, disburseLoan, getAllLoans, getLoanById, rejectLoan, rejectLoanAdjustment, repayLoan } from '../controllers/loanController.js';

const router = express.Router();

router.post('/', createLoan);
router.get('/', getAllLoans);
router.get('/:loanId', getLoanById);
router.put('/:loanId/approve', approveLoan);
router.put('/:loanId/reject', rejectLoan);
router.post('/:loanId/disburse', disburseLoan);
router.post('/:loanId/adjust', addLoanAdjustment);
router.put('/:loanId/adjust/:adjustId/approve', approveLoanAdjustment); // ✅ already added
router.put('/:loanId/adjust/:adjustId/reject', rejectLoanAdjustment);
router.post('/:loanId/repay', repayLoan);

export default router;