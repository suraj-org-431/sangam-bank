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
import { authorize, autoRegisterPermission } from "../middleware/rbac.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

// ✅ Create or update account
router.post("/", upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "signature", maxCount: 1 },
    { name: "verifierSignature", maxCount: 1 }
]), autoRegisterPermission, authorize(), upsertAccount);

// ✅ Recurring Installment Payment Route
router.post("/:accountId/pay-installment", autoRegisterPermission, authorize(), payRecurringInstallment);

// ✅ Other account routes
router.get('/search', autoRegisterPermission, authorize(), searchAccounts);
router.get('/count', autoRegisterPermission, authorize(), getAccountsCount);
router.get('/total-balance', autoRegisterPermission, authorize(), getTotalBalance);
router.get('/total-amount', autoRegisterPermission, authorize(), getTotalDepositAmount);
router.get("/generate-account-number", autoRegisterPermission, authorize(), generateAccountNumberAPI);
router.post("/import", uploadCSV.single("file"), autoRegisterPermission, authorize(), importAccountsFromCSV);
router.get("/", autoRegisterPermission, authorize(), getAllAccounts);
router.get("/:accId", autoRegisterPermission, authorize(), getAccount);
router.delete("/:accId", autoRegisterPermission, authorize(), deleteAccount);

export default router;
