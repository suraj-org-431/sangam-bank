import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading, isAuthorized } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!user || !isAuthorized(allowedRoles)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;
