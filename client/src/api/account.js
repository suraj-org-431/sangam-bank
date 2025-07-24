import { saveAs } from 'file-saver';
import API from './axios';

// 🔹 Fetch paginated account details
export const getAllAccounts = async ({
    page = 1,
    limit = 10,
    search = '',
    branch = '',
    accountType = '',
    gender = '',
    tenure = ''
}) => {
    try {
        const res = await API.get(`/accounts`, {
            params: {
                page,
                limit,
                search,
                branch,
                accountType,
                gender,
                tenure
            },
        });
        return res.data.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch account details');
    }
};

// 🔹 Get account details by user ID
export const getAccountDetailsByUser = async (userId) => {
    try {
        const res = await API.get(`/accounts/${userId}`);
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch account details');
    }
};

// 🔹 Create or update a single account (based on user)
export const upsertAccountDetails = async (details) => {
    try {
        const res = await API.post(`/accounts`, details, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to save account details');
    }
};

// 🔹 Delete account details by user ID
export const deleteAccountDetailsByUser = async (userId) => {
    try {
        const res = await API.delete(`/accounts/${userId}`);
        return res?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to delete account details');
    }
};

// 🔹 Import accounts from CSV
export const importAccountsFromCSV = async (formData) => {
    try {
        const res = await API.post(`/accounts/import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'CSV import failed');
    }
};

export const generateAccountNumber = async (accountType) => {
    try {
        const res = await API.get(`/accounts/generate-account-number/?accountType=${accountType}`);
        return res.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Error in generating account number');
    }
};


export const getAllAccountsCount = async () => {
    try {
        const res = await API.get('/accounts/count');
        return res.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Error in generating account number');
    }
};

// 🔹 Search accounts by applicant name or account number
export const searchAccounts = async (query) => {
    try {
        const res = await API.get('/accounts/search', {
            params: { query }
        });
        return res.data?.data?.results || [];
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to search accounts');
    }
};

// 🔹 Pay installment for RD account
export const payRecurringInstallment = async (accountId) => {
    try {
        const res = await API.post(`/accounts/${accountId}/pay-installment`);
        return res.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to pay installment');
    }
};

// 🔹 Get account details by user ID
export const getAccountTransactions = async ({
    accountId,
    page = 1,
    limit = 10,
    type,
    startDate,
    endDate
}) => {
    try {
        const res = await API.get(`/accounts/${accountId}/transactions`, {
            params: {
                page,
                limit,
                type,
                startDate,
                endDate
            },
        });
        return res?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch account details');
    }
};

// ✅ Export transactions to PDF or Excel
export const exportAccountTransactions = async ({
    accountId,
    page = 1,
    limit = 10,
    type,
    startDate,
    endDate,
    format,
}) => {
    try {
        const res = await API.get(`/accounts/${accountId}/export`, {
            responseType: 'blob',
            params: {
                page,        // Optional, depending on how you handle data in backend
                limit,       // Optional
                type,
                startDate,
                endDate,
                format
            }
        });

        const contentType = format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        const blob = new Blob([res.data], { type: contentType });
        const filename = `transactions.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        saveAs(blob, filename);
    } catch (err) {
        console.error(`❌ Failed to export ${format}:`, err);
        throw new Error(`Failed to export ${format}`);
    }
};