// Modified AllTransactions.jsx - similar in structure and style to Accounts.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { fetchUserPermissions, hasPermission } from '../../utils/permissionUtils';
import CommonModal from '../../components/common/CommonModal';
import { exportAccountTransactions, getAccountTransactions } from '../../api/account';

const Transactions = () => {
    const [accountDetails, setAccountDetails] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [userPermissions, setUserPermissions] = useState([]);
    const [show403Modal, setShow403Modal] = useState(false);
    const [filters, setFilters] = useState({ type: '', startDate: '', endDate: '' });
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const params = useParams();
    const location = useLocation();
    const { id } = params;

    useEffect(() => {
        (async () => {
            try {
                const permissions = await fetchUserPermissions();
                setUserPermissions(permissions || []);
            } catch (err) {
                console.error('Failed to load permissions', err);
            }
        })();
    }, []);

    useEffect(() => {
        setAccountDetails(location?.state?.accountData)
    }, [location]);

    useEffect(() => {
        fetchTransactions();
    }, [page, JSON.stringify(filters)]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await getAccountTransactions({ accountId: id, page, limit: 10, ...filters });
            setTransactions(res.data || []);
            setTotalPages(res.totalCount || 1);
        } catch (err) {
            toast.error('Failed to fetch transactions');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleExport = async (format) => {
        try {
            await exportAccountTransactions({ accountId: id, page, limit: 10, ...filters, format });
        } catch (err) {
            toast.error('Export failed');
        }
    };

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <h4 className="theme-text">Transaction History</h4>
                    <div className="d-flex flex-wrap gap-2 align-items-end">
                        <div>
                            <label className="form-label mb-1 text-black">Transaction Type</label>
                            <select
                                className="form-select form-select-sm"
                                value={filters.type}
                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            >
                                <option value="">All</option>
                                <option value="deposit">Deposit</option>
                                <option value="withdrawal">Withdrawal</option>
                                <option value="transfer">Transfer</option>
                                <option value="loanRepayment">Loan Repayment</option>
                                <option value="loanDisbursed">Loan Disbursed</option>
                                <option value="loanInterest">Loan Interest</option>
                                <option value="rdInstallment">RD Installment</option>
                                <option value="adjustment">Adjustment</option>
                                <option value="principal">Principal</option>
                                <option value="fine">Fine</option>
                                <option value="interestPayment">Interest Payment</option>
                                <option value="processingFee">Processing Fee</option>
                                <option value="insurance">Insurance</option>
                                <option value="serviceCharge">Service Charge</option>
                                <option value="interest">Interest</option>
                                <option value="other">Other</option>
                            </select>

                        </div>
                        <div>
                            <label className="form-label mb-1 text-black">Start Date</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={filters.startDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="form-label mb-1 text-black">End Date</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={filters.endDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                        <div className="align-self-end">
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => {
                                    setFilters({ type: '', startDate: '', endDate: '' });
                                }}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                <div className="d-flex gap-2 flex-wrap mt-3 mb-3 justify-content-end">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => {
                        if (!hasPermission(userPermissions, `GET:/accounts/${id}/export`)) {
                            setShow403Modal(true);
                            return;
                        }
                        handleExport('excel')
                    }}>
                        📥 Export Excel
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => {
                        if (!hasPermission(userPermissions, `GET:/accounts/${id}/export`)) {
                            setShow403Modal(true);
                            return;
                        }
                        handleExport('pdf')
                    }}>
                        📄 Export PDF
                    </button>
                </div>

                <hr />
                <div className='row'>
                    <div className='col-md-3'>
                        <div className='alert alert-warning bank_info'>
                            <label className='text-black border-bottom mb-2 text-muted'>Customer Name</label>
                            <div> <i className="fa-solid fa-user me-2"></i>
                                <b>{accountDetails.applicantName}</b></div>
                        </div>
                    </div>
                    <div className='col-md-3'>
                        <div className='alert alert-warning bank_info'>
                            <label className='text-black border-bottom mb-2 text-muted'>Account Number</label>
                            <div> <i className="fa-solid fa-building-columns me-2"></i>
                                <b>{accountDetails.accountNumber}</b></div>
                        </div>
                    </div>
                    <div className='col-md-3'>
                        <div className='alert alert-warning bank_info'>
                            <label className='text-black border-bottom mb-2 text-muted'>Account Type</label>
                            <div><i className="fa-solid fa-layer-group me-2"></i>
                                <b>{accountDetails?.accountType?.toUpperCase()}</b></div>
                        </div>
                    </div>

                    <div className='col-md-3'>
                        <div className='alert alert-warning bank_info'>
                            <label className='text-black border-bottom mb-2 text-muted'>Balance</label>
                            <div><i className="fa-solid fa-indian-rupee-sign me-2"></i>
                                <b>{accountDetails.balance}</b></div>
                        </div>

                    </div>

                </div>

                {loading ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" />
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table theme-table table-bordered table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Source</th>
                                    <th>Transaction Type</th>
                                    <th>Amount</th>
                                    <th>Description</th>
                                    {/* <th>Receipt</th> */}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center text-muted">No transactions found.</td>
                                    </tr>
                                ) : (
                                    transactions.map((tx, idx) => (
                                        <tr key={idx}>
                                            <td>{idx + 1}</td>
                                            <td>{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                                            <td>{tx?.source || '-'}</td>
                                            <td>
                                                <span className={`badge ${tx.type === 'deposit' ? 'bg-success' :
                                                    tx.type === 'loanDisbursed' ? 'bg-primary' :
                                                        tx.type === 'rdInstallment' ? 'bg-primary text-dark' :
                                                            tx.type === 'loanRepayment' ? 'bg-warning text-dark' :
                                                                tx.type === 'transfer' ? 'bg-info text-dark' :
                                                                    'bg-danger'
                                                    }`}>
                                                    {(() => {
                                                        switch (tx.type) {
                                                            case 'deposit':
                                                                return 'Deposit / जमा';
                                                            case 'withdrawal':
                                                                return 'Withdrawal / निकासी';
                                                            case 'transfer':
                                                                return 'Transfer / ट्रांसफर';
                                                            case 'loanDisbursed':
                                                                return 'Loan Disbursed / ऋण वितरण';
                                                            case 'rdInstallment':
                                                                return 'Recurring Installment / आवर्ती किस्त';
                                                            case 'loanRepayment':
                                                                return 'Loan Repayment / ऋण भुगतान';
                                                            case 'fine': return 'Penalty / दंड';
                                                            case 'interestPayment': return 'Interest Paid / ब्याज भुगतान';
                                                            case 'principle': return 'Principal Paid / मूलधन भुगतान';
                                                            case '': return 'Principal Paid / मूलधन भुगतान';
                                                            default:
                                                                return tx.type
                                                                    .replace(/([A-Z])/g, ' $1')         // Add space before capital letters
                                                                    .replace(/^./, str => str.toUpperCase());
                                                        }
                                                    })()}
                                                </span>
                                            </td>

                                            <td>{tx.amount?.toFixed(2)}</td>
                                            <td>{tx.label || '-'}</td>
                                            {/* <td>
                                                <button className="btn btn-sm btn-outline-info me-2" onClick={() => {
                                                    if (!hasPermission(userPermissions, 'GET:/transactions')) {
                                                        setShow403Modal(true);
                                                        return;
                                                    }
                                                    navigate(adminRoute(`/transaction/view/${tx?._id}`), { state: { transaction: tx } });
                                                }}>Receipt</button>
                                            </td> */}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="d-flex justify-content-end mt-3">
                        <button
                            className="btn btn-sm btn-secondary me-2"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                        >
                            Prev
                        </button>
                        <span className="align-self-center">Page {page} of {totalPages}</span>
                        <button
                            className="btn btn-sm btn-secondary ms-2"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
            <CommonModal
                show={show403Modal}
                onHide={() => setShow403Modal(false)}
                title="Access Denied"
                type="access-denied"
                emoji="🚫"
            />
        </div>
    );
};

export default Transactions;
