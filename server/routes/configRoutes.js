import express from 'express';
import { applyMonthlyInterest, getConfig, updateConfig } from '../controllers/configController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authorize, autoRegisterPermission } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', autoRegisterPermission, authorize(), getConfig);
router.put('/', autoRegisterPermission, authorize(), updateConfig); // 🔐 Admin-only update
router.post('/apply-monthly-interest', autoRegisterPermission, authorize(), applyMonthlyInterest); // ✅ Apply interest based on config

export default router;