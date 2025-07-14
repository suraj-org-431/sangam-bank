import React, { useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getAllLoans } from '../../api/loan';
import { adminRoute } from '../../utils/router';

const Loans = () => {
    const [loans, setLoans] = useState([]);
    const [query, setQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        status: '',
    });

    const limit = 10;
    const navigate = useNavigate();

    useEffect(() => {
        fetchLoans();
    }, [query, currentPage, filters]);

    const fetchLoans = async () => {
        try {
            const res = await getAllLoans({
                search: query,
                page: currentPage,
                limit,
                status: filters.status,
            });

            setLoans(res.entries || []);
            setTotalPages(res.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch loans', err);
        }
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({ status: '' });
        setQuery('');
        setCurrentPage(1);
    };

    const getStatusChip = (status) => {
        const statusMap = {
            draft: { color: 'secondary', label: 'Draft' },
            approved: { color: 'info', label: 'Approved' },
            disbursed: { color: 'primary', label: 'Disbursed' },
            repaid: { color: 'success', label: 'Repaid' },
            defaulted: { color: 'danger', label: 'Defaulted' },
        };

        const { color, label } = statusMap[status] || { color: 'dark', label: status };
        return (
            <span className={`badge bg-${color} text-uppercase`} style={{ fontSize: '0.75rem' }}>
                {label}
            </span>
        );
    };

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <h4 className="theme-text">Loan List</h4>
                    <div className="d-flex gap-2 flex-wrap align-items-end">
                        <div>
                            <label className="form-label mb-1 text-black">Loan Status</label>
                            <Form.Select
                                size="sm"
                                name="status"
                                value={filters.status}
                                onChange={handleFilterChange}
                            >
                                <option value="">All</option>
                                <option value="draft">Draft</option>
                                <option value="approved">Approved</option>
                                <option value="disbursed">Disbursed</option>
                                <option value="prepaid">Prepaid</option>
                                <option value="closed">Closed</option>
                            </Form.Select>
                        </div>

                        <div className="align-self-end">
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={handleClearFilters}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="d-flex justify-content-end gap-2 mb-3">
                    <div>
                        <input
                            type="text"
                            placeholder="Search borrower..."
                            className="form-control form-control-sm"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <div>
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(adminRoute('/loan/create'))}
                        >
                            + Create Loan
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="table-responsive mb-4">
                    <table className="table table-bordered theme-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Borrower</th>
                                <th>Amount (₹)</th>
                                <th>Status</th>
                                <th>EMI (₹)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.length > 0 ? (
                                loans.map((loan, index) => (
                                    <tr key={loan._id}>
                                        <td>{(currentPage - 1) * limit + index + 1}</td>
                                        <td>{loan.borrowerName}</td>
                                        <td>{loan.amount?.toLocaleString('en-IN')}</td>
                                        <td>{getStatusChip(loan.status)}</td>
                                        <td>{loan.emiAmount?.toLocaleString('en-IN') || 'N/A'}</td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() =>
                                                    navigate(adminRoute(`/loan/view/${loan._id}`))
                                                }
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center">
                                        No loan entries found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="d-flex justify-content-end align-items-center gap-2">
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Prev
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Loans;
