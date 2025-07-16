import API from './axios';

// ✅ GET /config - fetch current system config
export const getConfig = async () => {
    try {
        const res = await API.get('/config');
        return res.data.data; // returns config object
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch configuration');
    }
};

// ✅ PUT /config - update system config
export const updateConfig = async (configData) => {
    try {
        const res = await API.put('/config', configData);
        return res.data.data; // returns updated config
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to update configuration');
    }
};

// ✅ Helper: Get interest rate by loan type
export const getInterestRateByLoanType = async (loanType) => {
    try {
        const config = await getConfig();
        const found = config?.loanInterestRates?.find(item => item.type === loanType);
        return found?.rate || null;
    } catch (err) {
        console.error('Error fetching interest rate:', err.message);
        return null;
    }
};

// ✅ Helper: Get initial deposit amount by account type
export const getInitialDepositByAccountType = async (accountType) => {
    try {
        const config = await getConfig();
        return config?.initialDeposits?.[accountType] ?? null;
    } catch (err) {
        console.error('Error fetching initial deposit:', err.message);
        return null;
    }
};

export const createInterest = async () => {
    try {
        const res = await API.post('/config/apply-monthly-interest');
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch messages');
    }
};
