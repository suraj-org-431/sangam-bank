import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Form } from 'react-bootstrap';
import { getAllLedgers } from '../../api/ledger';
import { adminRoute } from '../../utils/router';

const Ledger = () => {
    const [ledgerGroups, setLedgerGroups] = useState([]);
    const [summaryTotals, setSummaryTotals] = useState({});
    const [query, setQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;
    const hasWarnedRef = useRef(false);

    const [filters, setFilters] = useState({
        applicantName: '',
        type: '',
        accountType: ''
    });

    const navigate = useNavigate();

    useEffect(() => {
        loadSummary();
    }, [query, currentPage, filters]);

    const loadSummary = async () => {
        try {
            const res = await getAllLedgers({
                search: query,
                page: currentPage,
                limit,
                transactionType: filters.type,
                accountType: filters.accountType,
            });

            setLedgerGroups(res.entries || []);
            setSummaryTotals({
                overallCredit: res.summary?.overallCredit || 0,
                overallDebit: res.summary?.overallDebit || 0,
                overallInterest: res.summary?.overallInterest || 0,
                overallBalance: res.summary?.overallBalance || 0,
            });
            setTotalPages(res.totalPages || 1);
        } catch (err) {
            toast.error('Failed to load ledger summary');
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
        setFilters({ applicantName: '', type: '', accountType: '' });
        setQuery('');
        setCurrentPage(1);
    };

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <h4 className="theme-text">All Ledgers</h4>
                    <div className="d-flex gap-2 flex-wrap align-items-end">
                        <div>
                            <label className="form-label mb-1 text-black">Transaction Type</label>
                            <Form.Select
                                size="sm"
                                name="type"
                                value={filters.type}
                                onChange={handleFilterChange}
                            >
                                <option value="">All</option>
                                <option value="deposit">Deposited / जमा</option>
                                <option value="withdrawal">Withdrawn / निकासी</option>
                                <option value="interest">Interest / ब्याज</option>
                            </Form.Select>
                        </div>

                        <div>
                            <label className="form-label mb-1 text-black">Account Type</label>
                            <Form.Select
                                size="sm"
                                name="accountType"
                                value={filters.accountType}
                                onChange={handleFilterChange}
                            >
                                <option value="">All</option>
                                <option value="Recurring">RD / आवर्ती जमा</option>
                                <option value="Savings">Saving / बचत</option>
                                <option value="Fixed">Fixed / सावधि जमा</option>
                                <option value="Mis">MIS / मासिक आय योजना</option>
                                <option value="Loan">Loan / ऋण</option>
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

                {/* Search + Add */}
                <div className="d-flex justify-content-end gap-2 mb-3">
                    <div>
                        <input
                            type="text"
                            placeholder="Search Particular..."
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
                            onClick={() => navigate(adminRoute('/ledger/create'))}
                        >
                            + Create Ledger
                        </button>
                    </div>

                </div>

                {/* Ledger Table */}
                <div className="table-responsive mb-4">
                    <table className="table table-bordered theme-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Particular</th>
                                <th>Total Credit (₹)</th>
                                <th>Total Debit (₹)</th>
                                <th>Total Interest (₹)</th>
                                <th>Balance (₹)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgerGroups.length > 0 ? (
                                ledgerGroups.map((item, index) => (
                                    <tr
                                        key={index}
                                        className={item.isAutoCreated ? 'bg-warning-subtle' : ''}
                                        style={item.isAutoCreated ? { borderLeft: '4px solid #ffc107' } : {}}
                                    >
                                        <td>{index + 1}</td>
                                        <td>
                                            {item.particulars || item._id}
                                            {item.isAutoCreated && (
                                                <span className="badge bg-warning text-dark ms-2">
                                                    Auto-Created
                                                </span>
                                            )}
                                        </td>
                                        <td>{item.totalCredit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td>{item.totalDebit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td>{item.totalInterest?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td>{item.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() =>
                                                    navigate(
                                                        adminRoute(`/ledger/particular/${(item.particulars || item._id)?.replace(/\s+/g, '-')}`)
                                                    )
                                                }
                                            >
                                                View Summary
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center">
                                        No ledger entries found.
                                    </td>
                                </tr>
                            )}

                            <tr className="fw-bold bg-light">
                                <td></td>
                                <td>Total</td>
                                <td>{summaryTotals.overallCredit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td>{summaryTotals.overallDebit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td>{summaryTotals.overallInterest?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td>{summaryTotals.overallBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td></td>
                            </tr>
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

export default Ledger;
