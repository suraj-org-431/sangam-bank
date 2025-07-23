import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';

const API = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 🔐 Attach token to every request if available
API.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ❌ Global error handling (optional)
API.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            removeToken();
        }
        return Promise.reject(err);
    }
);

export default API;
