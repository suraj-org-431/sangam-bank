import express from 'express';
import { createTransaction, exportTransactions, getTransactions } from '../controllers/transactionController.js';

const router = express.Router();

router.post('/', createTransaction);
router.get('/', getTransactions);
router.get('/export', exportTransactions);

export default router;
