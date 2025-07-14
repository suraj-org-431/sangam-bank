import express from 'express';
import { applyMonthlyInterest, getConfig, updateConfig } from '../controllers/configController.js';

const router = express.Router();

router.get('/', getConfig);
router.put('/', updateConfig); // 🔐 Admin-only update
router.post('/apply-monthly-interest', applyMonthlyInterest); // ✅ Apply interest based on config

export default router;