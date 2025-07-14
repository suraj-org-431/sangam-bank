import React, { useEffect, useState } from 'react';
import './Login.css';
import logo from '../../assets/images/logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../api/auth';
import { getToken, getUser, setToken, setUser } from '../../utils/auth';
import { adminRoute } from '../../utils/router';

const Login = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = getToken();
        const user = getUser;
        if (token && user) {
            navigate(adminRoute('/dashboard'));
        }
    }, [navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { email, password } = formData;

        if (!email || !password) {
            setError("Email and password are required.");
            return;
        }

        try {
            setLoading(true);
            const res = await login(email, password);

            if (!res?.token || !res?.user) {
                setError("Invalid login response.");
                return;
            }

            setToken(res.token);
            setUser(res.user);

            navigate(adminRoute('/dashboard'));
        } catch (err) {
            console.error("Login failed:", err); // ✅ Log the error
            setError(err.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="login-container d-flex align-items-center justify-content-center">
            <div className="login-box d-flex">
                {/* Left Side */}
                <div className="left-side d-flex align-items-center justify-content-center flex-column text-center">
                    <img src={logo} alt="Bailey and Co." className="logo mb-3" />
                    <h2 className="brand-text">संगम परिवार साख स्वावलंबी <br />सहकारी समिति</h2>
                </div>

                {/* Vertical Divider Line */}
                <div className="vertical-line"></div>

                {/* Right Side */}
                <div className="right-side d-flex align-items-center justify-content-center">
                    <div className="form-box">
                        <h3 className="welcome-text mb-2">Welcome</h3>
                        <p className="subtext mb-4">Please login to Admin Dashboard.</p>

                        {error && <div className="alert alert-danger py-2">{error}</div>}

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="mb-3">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="form-control custom-input"
                                />
                            </div>
                            <div className="mb-3">
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="form-control custom-input"
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn theme-btn w-100 mb-3"
                                disabled={loading}
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                            <div className="text-center">
                                <Link to={adminRoute('/forgot-password')} className="forgot-link">Forgotten your password?</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Login;
