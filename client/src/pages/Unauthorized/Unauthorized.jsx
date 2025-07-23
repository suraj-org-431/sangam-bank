import React from 'react';
import './Unauthorized.css';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/images/logo.png';
import { adminRoute } from '../../utils/router';
import { useAuth } from '../../context/AuthContext';

const Unauthorized = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate(adminRoute('/login'));
        window.location.reload();
    };
    return (
        <div className="unauth-container d-flex align-items-center justify-content-center">
            <div className="unauth-box text-center">
                <img src={logo} alt="Bailey and Co." className="logo mb-4" />
                <h1 className="unauth-title">403 - Unauthorized</h1>
                <p className="unauth-message">You do not have permission to access this page.</p>
                <Link type="components" className="btn btn-login mt-4 px-4" onClick={handleLogout}>
                    Logout
                </Link>
            </div>
        </div>
    );
};

export default Unauthorized;
