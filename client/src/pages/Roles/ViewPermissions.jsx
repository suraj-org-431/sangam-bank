import React, { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { formatPermissionLabel } from '../../utils/permissionUtils';

const getMethodColor = (method) => {
    switch (method) {
        case 'GET': return 'info';
        case 'POST': return 'success';
        case 'PUT': return 'warning';
        case 'PATCH': return 'secondary';
        case 'DELETE': return 'danger';
        default: return 'light';
    }
};

const ViewPermissions = () => {
    const { roleType } = useParams();
    const location = useLocation();
    const itemsPerPage = 10;

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const { permissions = [], roleName = roleType } = location.state || {};

    const filteredPermissions = permissions.filter((perm) =>
        formatPermissionLabel(perm).toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.route.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredPermissions.length / itemsPerPage);

    const paginatedPermissions = filteredPermissions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (pageNum) => {
        if (pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
        }
    };

    if (!roleName) return <div className="text-center mt-5 text-danger">No role data provided.</div>;

    return (
        <div className="roles-wrapper px-4 py-4 theme-bg">
            <div className="card theme-card border-0 shadow p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h4 className="mb-0 theme-text">Permissions for Role: {roleName}</h4>
                    </div>
                    <div>
                        <input
                            type="text"
                            className="form-control theme-input mb-3"
                            placeholder="Search by name or route..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>

                {permissions?.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table theme-table table-bordered table-hover align-middle">
                            <thead className="table-light text-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Method</th>
                                    <th>Route</th>
                                    <th>Complete Path</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedPermissions.length > 0 ? (
                                    paginatedPermissions.map((perm, index) => (
                                        <tr key={perm._id}>
                                            <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td>{formatPermissionLabel(perm)}</td>
                                            <td>
                                                <span className={`badge bg-${getMethodColor(perm.method)}`}>
                                                    {perm.method}
                                                </span>
                                            </td>
                                            <td>{perm.route}</td>
                                            <td>{perm.name}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted">No matching permissions found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <small className="text-muted">
                                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                                {Math.min(currentPage * itemsPerPage, filteredPermissions.length)} of {filteredPermissions.length} permissions
                            </small>
                            <div className="d-flex align-items-center">
                                <button
                                    className="btn btn-secondary btn-sm me-2"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    Prev
                                </button>
                                {[...Array(totalPages)].map((_, idx) => (
                                    <button
                                        key={idx}
                                        className={`btn btn-sm me-1 ${currentPage === idx + 1 ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => handlePageChange(idx + 1)}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                                <button
                                    className="btn btn-secondary btn-sm ms-2"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                    </div>
                ) : (
                    <p className="text-muted">No permissions assigned to this role.</p>
                )}
            </div>
        </div>
    );
};

export default ViewPermissions;
