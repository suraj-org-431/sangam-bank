import express from "express";
import multer from "multer";
import {
    upsertLedger,
    getLedger,
    getAllLedgers,
    deleteLedger,
    importLedgerFromCSV,
    getLedgerSummaryByParticular,
    getOverallFinancialSummary,
    getTodayLedgerEntryCount,
    getMonthlyLedgerReport,
    exportMonthlyLedgerReport,
} from "../controllers/ledgerController.js";
import { authenticateToken } from "../middleware/auth.js";
import { authorize, autoRegisterPermission } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticateToken);

const upload = multer({ dest: "uploads/" });

router.post("/", autoRegisterPermission, authorize(), upsertLedger);
router.get('/monthly-report/export', autoRegisterPermission, authorize(), exportMonthlyLedgerReport);
router.get('/monthly-report', autoRegisterPermission, authorize(), getMonthlyLedgerReport)
router.get('/today-count', autoRegisterPermission, authorize(), getTodayLedgerEntryCount);
router.get('/financial-summary', autoRegisterPermission, authorize(), getOverallFinancialSummary);
router.get('/summary/:particular', autoRegisterPermission, authorize(), getLedgerSummaryByParticular);
router.get("/:ledgerId", autoRegisterPermission, authorize(), getLedger);
router.get("/", autoRegisterPermission, authorize(), getAllLedgers);
router.delete("/:ledgerId", autoRegisterPermission, authorize(), deleteLedger);
router.post("/import", autoRegisterPermission, authorize(), upload.single("file"), importLedgerFromCSV); // Optional CSV import

export default router;
