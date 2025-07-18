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

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upsertLedger);
router.get('/monthly-report/export', exportMonthlyLedgerReport);
router.get('/monthly-report', getMonthlyLedgerReport)
router.get('/today-count', getTodayLedgerEntryCount);
router.get('/financial-summary', getOverallFinancialSummary);
router.get('/summary/:particular', getLedgerSummaryByParticular);
router.get("/:ledgerId", getLedger);
router.get("/", getAllLedgers);
router.delete("/:ledgerId", deleteLedger);
router.post("/import", upload.single("file"), importLedgerFromCSV); // Optional CSV import
export default router;
