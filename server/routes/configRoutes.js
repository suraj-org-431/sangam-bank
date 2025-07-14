import express from 'express';
import { getConfig, updateConfig } from '../controllers/configController.js';

const router = express.Router();

router.get('/', getConfig);
router.put('/', updateConfig); // 🔐 Admin-only update

export default router;