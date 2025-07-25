import express from 'express';
import { approveLoan, createLoan, disburseLoan, getAllLoans, getLoanById, rejectLoan, repayLoan, simpleinterestPayLoan } from '../controllers/loanController.js';
import { authorize, autoRegisterPermission } from '../middleware/rbac.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', autoRegisterPermission, authorize(), createLoan);
router.get('/', autoRegisterPermission, authorize(), getAllLoans);
router.get('/:loanId', autoRegisterPermission, authorize(), getLoanById);
router.put('/:loanId/approve', autoRegisterPermission, authorize(), approveLoan);
router.put('/:loanId/reject', autoRegisterPermission, authorize(), rejectLoan);
router.post('/:loanId/disburse', autoRegisterPermission, authorize(), disburseLoan);
router.post('/:loanId/repay', autoRegisterPermission, authorize(), repayLoan);
router.post('/:loanId/repaySimpleInterest', autoRegisterPermission, authorize(), simpleinterestPayLoan);

export default router;