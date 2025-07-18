import API from './axios';

// 🔹 Create or Update a Ledger Entry
export const upsertLedgerEntry = async (entry) => {
    try {
        const res = await API.post('/ledger', entry); // Updated to match correct route
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to save ledger entry');
    }
};

// 🔹 Get ledger entry by ID (for editing or viewing a single entry)
export const getLedgerById = async (ledgerId) => {
    try {
        const res = await API.get(`/ledger/${ledgerId}`);
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch ledger entry');
    }
};

// 🔹 Admin: Get all ledger entries (paginated + optional filters)
export const getAllLedgers = async (params) => {
    try {
        const res = await API.get('/ledger', { params });
        return res.data.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch ledger entries');
    }
};

// 🔹 Get Ledger Summary for a particular user (grouped)
export const getLedgerSummaryByParticular = async (particular, page = 1, limit = 50) => {
    try {
        const res = await API.get(`/ledger/summary/${particular}`, {
            params: { page, limit }
        });
        return res.data.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch ledger summary');
    }
};

// 🔹 Get Ledger Summary for a particular user (grouped)
export const getOveralllSummary = async (particular, page = 1, limit = 50) => {
    try {
        const res = await API.get(`/ledger/financial-summary`, {
            params: { page, limit }
        });
        return res.data.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch ledger summary');
    }
};
// 🔹 Delete a ledger entry by ID
export const deleteLedgerEntry = async (ledgerId) => {
    try {
        const res = await API.delete(`/ledger/${ledgerId}`);
        return res?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to delete ledger entry');
    }
};

// 🔹 Import CSV (optional, for admin panel bulk uploads)
export const importLedgerCSV = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await API.post('/ledger/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to import ledger CSV');
    }
};

export const getTodayLedgerEntryCount = async (file) => {
    try {
        const res = await API.get('/ledger/today-count');
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to import ledger CSV');
    }
};

export const getMonthlyLedgerReport = async ({ month, year, page = 1, limit = 10 }) => {
    try {
        const res = await API.get('/ledger/monthly-report', {
            params: {
                month,
                year,
                page,
                limit
            }
        });
        return res?.data?.data;
    } catch (err) {
        console.log(err)
        throw new Error(err?.response?.data?.message || 'Failed to fetch ledger report');
    }
};

// 🔹 Export Monthly Ledger Report (Excel / PDF)
export const exportMonthlyLedgerReport = async ({ month, year, format = 'excel' }) => {

    console.log(format)
    try {
        const response = await API.get('/ledger/monthly-report/export', {
            params: { month, year, format },
            responseType: format === 'excel' ? 'blob' : 'arraybuffer', // important for binary download
        });

        const blob = new Blob([response.data], {
            type:
                format === 'excel'
                    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    : 'application/pdf',
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ledger_${month}_${year}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return true;
    } catch (err) {
        console.error('❌ Export Error:', err);
        throw new Error(err?.response?.data?.message || 'Failed to export monthly ledger report');
    }
};

