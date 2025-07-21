import React, { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import axiosInstance from '../api/axios';
import { authLogin } from '../api/auth';
import { getToken, getUser, removeToken, setToken, setUser } from '../utils/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({ token: null, user: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = () => {
            const token = getToken();
            if (token) {
                try {
                    const user = getUser();
                    const isExpired = user.exp * 1000 < Date.now();
                    if (!isExpired) {
                        setAuth({ token, user });
                    } else {
                        logout();
                    }
                } catch (err) {
                    logout();
                }
            }
            setLoading(false);
        };

        initializeAuth();
    }, []);


    const login = async ({ email, password }) => {
        const res = await authLogin(email, password);
        const { token, user } = res;
        setAuth({ token, user });
        setUser(user);
        setToken(token)
        return user;
    };

    const logout = () => {
        setAuth({ token: null, user: null });
        removeToken();
    };

    const refreshToken = async () => {
        try {
            const res = await axiosInstance.post('/auth/refresh-token');
            const { token } = res.data;
            const user = jwtDecode(token);
            setAuth({ token, user });
            setUser(user);
            setToken(token)
        } catch (error) {
            logout();
        }
    };

    const isAuthorized = (allowedRoles = []) => {
        const role = auth?.user?.roleType?.toLowerCase();
        return allowedRoles.length === 0 || allowedRoles.includes(role);
    };

    return (
        <AuthContext.Provider value={{ ...auth, login, logout, refreshToken, isAuthorized, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

