import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import Dashboard from "../pages/Dashboard/Dashboard";
import Login from "../pages/Login/Login";
import ProtectedRoute from "../components/ProtectedRoute";
import Unauthorized from "../pages/Unauthorized/Unauthorized";
import { adminRoute } from "../utils/router";
import ResetPassword from "../pages/Password/ResetPassword";
import Profile from "../pages/Profile/Profile";
import UserList from "../pages/Users/UserList";
import Setting from "../pages/Settings/Settings";
import EditUser from "../pages/Users/EditUser";
import ViewUser from "../pages/Users/ViewUser";
import ForgotPassword from "../pages/Password/ForgotPassword";
import NotFound from "../pages/NotFound";
import NotificationList from "../pages/Notifications/NotificationList";
import Accounts from "../pages/Account/Accounts";
import ViewAccount from "../pages/Account/ViewAccount";
import CreateAccounts from "../pages/Account/CreateOrEditAccounts";
import Ledger from "../pages/Ledger/Ledger";
import CreateOrEditLedger from "../pages/Ledger/CreateOrEditLedger";
import LedgerSummary from "../pages/Ledger/LadgerSummary";
import CreateTransaction from "../pages/Transaction/CreateTransaction";
import InterestTrigger from "../pages/InterestRate/InterestRate";
import Transactions from "../pages/Transaction/Transactions";
import Loans from "../pages/Loans/Loans";
import EMICalculator from "../pages/Loans/EMICalculator";
import CreateLoan from "../pages/Loans/CreateLoan";
import LoanView from "../pages/Loans/LoanView";
import ConfigSettings from "../pages/Settings/ConfigSettings";
import TransactionReceipt from "../pages/Transaction/TransactionReceipt";

const AdminRoutes = () => {
    return (
        <Routes>
            {/* Redirect root path to dashboard */}
            <Route path="*" element={<NotFound />} />
            <Route path="/" element={<Navigate to={adminRoute("/dashboard")} />} />
            <Route path={adminRoute("/login")} element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path={adminRoute("/reset-password")} element={<ResetPassword />} />
            <Route path={adminRoute("/forgot-password")} element={<ForgotPassword />} />
            {/* Protected Routes with Layout */}
            <Route
                path="/admin/*"
                element={
                    <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
                        <AdminLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="*" element={<NotFound />} />

                <Route path="dashboard" element={<Dashboard />} />
                <Route path="user-profile" element={<Profile />} />

                <Route path="users" element={<UserList />} />
                <Route path="users/create" element={<EditUser />} />
                <Route path="users/edit/:id" element={<EditUser />} />
                <Route path="users/view/:id" element={<ViewUser />} />

                <Route path="accounts" element={<Accounts />} />
                <Route path="account/create" element={<CreateAccounts />} />
                <Route path="account/edit/:id" element={<CreateAccounts />} />
                <Route path="account/view/:id" element={<ViewAccount />} />

                <Route path="ledger" element={<Ledger />} />
                <Route path="ledger/create" element={<CreateOrEditLedger />} />
                <Route path="ledger/edit/:id" element={<CreateOrEditLedger />} />
                <Route path="ledger/particular/:particular" element={<LedgerSummary />} />

                <Route path="transactions" element={<Transactions />} />
                <Route path="transaction/create" element={<CreateTransaction />} />
                <Route path="transaction/view/:txnId" element={<TransactionReceipt />} />

                <Route path="loans" element={<Loans />} />
                <Route path="loan/create" element={<CreateLoan />} />
                <Route path="loan/view/:loanId" element={<LoanView />} />
                <Route path="loan/emi-calculator" element={<EMICalculator />} />


                <Route path="system-settings" element={<ConfigSettings />} />
                <Route path="interest-management" element={<InterestTrigger />} />

                <Route path="user-settings" element={<Setting />} />
                <Route path="notifications" element={<NotificationList />} />
            </Route>
        </Routes>
    );
};

export default AdminRoutes;
