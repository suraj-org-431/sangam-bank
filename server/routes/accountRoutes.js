import express from "express";
import {
    deleteAccount,
    generateAccountNumberAPI,
    getAccount,
    getAccountsCount,
    getAllAccounts,
    getTotalBalance,
    getTotalDepositAmount,
    importAccountsFromCSV,
    searchAccounts,
    upsertAccount,
    payRecurringInstallment // ✅ Add the new controller here
} from "../controllers/accountController.js";

import { upload } from "../middleware/upload.js";
import { uploadCSV } from "../middleware/uploadCSV.js";
// Optionally add auth middleware if needed
// import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// ✅ Create or update account
router.post("/", upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "signature", maxCount: 1 },
    { name: "verifierSignature", maxCount: 1 }
]), upsertAccount);

// ✅ Recurring Installment Payment Route
router.post("/:accountId/pay-installment", payRecurringInstallment);

// ✅ Other account routes
router.get('/search', searchAccounts);
router.get('/count', getAccountsCount);
router.get('/total-balance', getTotalBalance);
router.get('/total-amount', getTotalDepositAmount);
router.get("/generate-account-number", generateAccountNumberAPI);
router.post("/import", uploadCSV.single("file"), importAccountsFromCSV);
router.get("/", getAllAccounts);
router.get("/:accId", getAccount);
router.delete("/:accId", deleteAccount);

export default router;
