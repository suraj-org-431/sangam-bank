import express from 'express';
import { approveLoan, createLoan, disburseLoan, getAllLoans, getLoanById, repayLoan } from '../controllers/loanController.js';

const router = express.Router();

router.post('/', createLoan);
router.get('/', getAllLoans);
router.get('/:loanId', getLoanById);
router.put('/:loanId/approve', approveLoan);
router.post('/:loanId/disburse', disburseLoan);
router.post('/:loanId/repay', repayLoan);

export default router;