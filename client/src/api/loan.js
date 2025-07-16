import API from './axios';

// 🔹 Create a new loan
export const createLoan = async (loanData) => {
    try {
        const res = await API.post('/loans', loanData);
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to create loan');
    }
};

// 🔹 Get all loans (with filters, pagination, etc.)
export const getAllLoans = async (params = {}) => {
    try {
        const res = await API.get('/loans', { params });
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch loan list');
    }
};

// 🔹 Get a single loan by ID
export const getLoanById = async (loanId) => {
    try {
        const res = await API.get(`/loans/${loanId}`);
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch loan');
    }
};

// 🔹 Disburse a loan
export const approveLoan = async (loanId) => {
    try {
        const res = await API.put(`/loans/${loanId}/approve`);
        return res.data.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Loan approved failed');

    }
};

// 🔹 Reject a loan
export const rejectLoan = async (loanId, { reason }) => {
    try {
        const res = await API.put(`/loans/${loanId}/reject`, { reason });
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Loan rejection failed');
    }
};

// 🔹 Disburse a loan
export const disburseLoan = async (loanId, disbursementPayload) => {
    try {
        const res = await API.post(`/loans/${loanId}/disburse`, disbursementPayload);
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Loan disbursement failed');
    }
};

// 🔹 Repay a loan
export const repayLoan = async (loanId, repaymentPayload) => {
    try {
        const res = await API.post(`/loans/${loanId}/repay`, repaymentPayload);
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Loan repayment failed');
    }
};

export const adjustLoan = async (loanId, adjustmentPayload) => {
    try {
        const res = await API.post(`/loans/${loanId}/adjust`, adjustmentPayload);
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Loan adjustment failed');
    }
};

// 🔹 Approve a loan adjustment
export const approveLoanAdjustment = async (loanId, adjustId) => {
    try {
        const res = await API.put(`/loans/${loanId}/adjust/${adjustId}/approve`);
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Adjustment approval failed');
    }
};

// 🔹 Reject a loan adjustment
export const rejectLoanAdjustment = async (loanId, adjustId, reason = '') => {
    try {
        const res = await API.put(`/loans/${loanId}/adjust/${adjustId}/reject`, { reason });
        return res?.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Adjustment rejection failed');
    }
};

// 🔹 Fetch all adjustments for a loan
export const getLoanAdjustments = async (loanId) => {
    try {
        const res = await API.get(`/loans/${loanId}`);
        return res?.data?.data?.adjustments || [];
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch adjustments');
    }
};
