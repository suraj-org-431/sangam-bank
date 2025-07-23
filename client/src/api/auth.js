import API from './axios';

// Login
export const authLogin = async (email, password) => {
    try {
        const res = await API.post('/auth/login', { email, password });
        return res.data.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Login failed');
    }
};

// Register
export const register = async (payload) => {
    try {
        const res = await API.post('/auth/register', payload);
        return res.data.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Registration failed');
    }
};

// Forgot Password
export const forgotPassword = async ({ email }) => {
    try {
        const res = await API.post('/auth/forgot-password', { email });
        return res.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to send reset link');
    }
};

// Reset Password
export const resetPassword = async ({ email, token, newPassword }) => {
    try {
        const res = await API.post('/auth/reset-password', { email, token, newPassword });
        return res.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to reset password');
    }
};
