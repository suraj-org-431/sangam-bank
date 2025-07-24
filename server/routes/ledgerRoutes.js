import express from "express";
import multer from "multer";
import {
    getMonthlyLedgerReport,
    exportMonthlyLedgerReport,
    upsertAccountCharge,
} from "../controllers/ledgerController.js";
import { authenticateToken } from "../middleware/auth.js";
import { authorize, autoRegisterPermission } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticateToken);

const upload = multer({ dest: "uploads/" });

router.post("/", autoRegisterPermission, authorize(), upsertAccountCharge);
router.get('/export', autoRegisterPermission, authorize(), exportMonthlyLedgerReport);
router.get('/monthly-report', autoRegisterPermission, authorize(), getMonthlyLedgerReport)

export default router;
