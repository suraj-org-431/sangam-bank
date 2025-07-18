import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLoanById, disburseLoan, repayLoan, approveLoan, rejectLoan, adjustLoan, approveLoanAdjustment, rejectLoanAdjustment } from '../../api/loan';
import { adminRoute } from '../../utils/router';
import { toast } from 'react-toastify';
import EMICalculator from './EMICalculator';
import { getConfig } from '../../api/config';
import { calculateEMI } from '../../utils/loanUtils';
import CommonModal from '../../components/common/CommonModal';

const LoanView = () => {
    const { loanId } = useParams();
    const navigate = useNavigate();
    const [loan, setLoan] = useState(null);
    const [repayAmount, setRepayAmount] = useState('');
    const [repayMode, setRepayMode] = useState('emi');
    const [repaymentModes, setRepaymentModes] = useState([]);
    const [repaymentRef, setRepaymentRef] = useState('');
    const [showRepayPreview, setShowRepayPreview] = useState(false);
    const [previewAmount, setPreviewAmount] = useState(0);
    const [adjustmentFilter, setAdjustmentFilter] = useState('');
    const [activeTab, setActiveTab] = useState('repayments');
    const [modal, setModal] = useState({
        show: false,
        type: '', // 'approve', 'reject', 'disburse', 'repay'
    });
    const [rejectReason, setRejectReason] = useState('');
    const [adjustmentData, setAdjustmentData] = useState({
        type: '',
        amount: '',
        remarks: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const adjustmentsPerPage = 10;

    const filteredAdjustments = loan?.adjustments
        .filter(adj => adjustmentFilter === '' || adj.status === adjustmentFilter);

    const totalPages = Math.ceil(filteredAdjustments?.length / adjustmentsPerPage);
    const paginatedAdjustments = filteredAdjustments?.slice(
        (currentPage - 1) * adjustmentsPerPage,
        currentPage * adjustmentsPerPage
    );
    const upcomingEMI = loan?.repaymentSchedule?.find(r => !r.paid);
    const openModal = (type) => setModal({ show: true, type });
    const closeModal = () => setModal({ show: false, type: '' });

    useEffect(() => {
        fetchLoan();
        fetchConfig();
    }, [loanId]);

    const fetchConfig = async () => {
        try {
            const res = await getConfig();
            setRepaymentModes(res?.repaymentModes);
        } catch (err) {
            toast.error('Failed to fetch config');
        }
    };

    const fetchLoan = async () => {
        try {
            const res = await getLoanById(loanId);
            setLoan(res);
        } catch (err) {
            toast.error('Failed to fetch loan');
        }
    };

    const emiData = useMemo(() => {
        if (!loan) return { emi: 0, totalPayable: 0, totalInterest: 0, schedule: [] };
        return calculateEMI({
            loanAmount: loan.loanAmount,
            interestRate: loan.interestRate,
            tenureMonths: loan.tenureMonths
        });
    }, [loan]);


    const getTotalPaid = () =>
        loan?.repaymentSchedule?.reduce((sum, r) => sum + (r.amountPaid || 0), 0) || 0;

    const getRemainingBalance = () => {
        const totalPayable = emiData.totalPayable;
        const totalPaid = getTotalPaid();
        const remaining = Math.max(totalPayable - totalPaid, 0);
        return remaining.toFixed(2);
    };

    const getEMIPaymentSummary = () => {
        const totalEMIs = loan?.repaymentSchedule?.length || 0;
        const paidEMIs = loan?.repaymentSchedule?.filter(r => r.paid)?.length || 0;
        const remainingEMIs = totalEMIs - paidEMIs;

        return {
            totalEMIs,
            paidEMIs,
            remainingEMIs
        };
    };

    const getStatusChip = (status) => {
        const statusMap = {
            pending: { color: 'secondary', label: 'Pending' },
            approved: { color: 'info', label: 'Approved' },
            disbursed: { color: 'primary', label: 'Disbursed' },
            repaid: { color: 'success', label: 'Repaid' },
            defaulted: { color: 'danger', label: 'Defaulted' },
        };
        const { color, label } = statusMap[status] || { color: 'dark', label: status };
        return <span className={`badge bg-${color} text-uppercase`}>{label}</span>;
    };

    const handleAdjustment = async () => {
        if (!adjustmentData.type || !adjustmentData.amount) {
            return toast.error('Please fill all adjustment fields');
        }

        try {
            await adjustLoan(loanId, adjustmentData);
            toast.success('Adjustment submitted');
            setAdjustmentData({ type: '', amount: '', remarks: '' });
            fetchLoan();
            closeModal();
        } catch (err) {
            toast.error(err?.message || 'Adjustment failed');
        }
    };

    if (!loan) return <div className="p-4">Loading...</div>;

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0">Account Overview</h4>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(adminRoute('/accounts'))}>
                        ← Back to Summary
                    </button>
                </div>

                <div className="row mb-3">
                    <div className="col-md-6">
                        <p><strong>Borrower:</strong> {loan.borrowerName}</p>
                        <p><strong>Amount:</strong> ₹{loan.loanAmount?.toLocaleString('en-IN')}</p>
                        <p><strong>Interest Rate:</strong> {loan.interestRate}%</p>
                        <p><strong>Tenure:</strong> {loan.tenureMonths} months</p>
                        <p><strong>Status:</strong> {getStatusChip(loan.status)}</p>
                        <p><strong>Balance Remaining:</strong> ₹{getRemainingBalance()}</p>
                        <p><strong>EMIs Paid:</strong> {getEMIPaymentSummary().paidEMIs} / {getEMIPaymentSummary().totalEMIs}</p>
                        <p><strong>Next EMI Due:</strong> {
                            loan.repaymentSchedule.find(r => !r.paid)?.dueDate
                                ? <span className='text-danger'>{new Date(loan.repaymentSchedule.find(r => !r.paid).dueDate).toLocaleDateString()}</span>
                                : 'N/A'
                        }</p>
                    </div>
                    <div className="col-md-6">
                        <p><strong>Principal:</strong> ₹{loan.loanAmount.toLocaleString('en-IN')}</p>
                        <p><strong>Monthly EMI:</strong> ₹{emiData.emi.toLocaleString('en-IN')}</p>
                        <p><strong>Total Interest:</strong> ₹{emiData.totalInterest.toLocaleString('en-IN')}</p>
                        <p><strong>Total Payable:</strong> ₹{emiData.totalPayable.toLocaleString('en-IN')}</p>
                        <p><strong>EMIs Paid:</strong> {getEMIPaymentSummary().paidEMIs} / {getEMIPaymentSummary().totalEMIs}</p>
                        <p><strong>Total Paid:</strong> ₹{getTotalPaid().toLocaleString('en-IN')}</p>
                        <p><strong>Balance Remaining:</strong> ₹{getRemainingBalance()}</p>
                    </div>
                </div>

                <hr />

                {loan.status === 'pending' && (
                    <div className="d-flex gap-2 mb-4">
                        <button
                            className="btn btn-outline-success d-flex align-items-center"
                            onClick={() => openModal('approve')}
                            title="Approve this loan application"
                        >
                            <i className="bi bi-check-circle me-1"></i> Approve Loan
                        </button>
                        <button
                            className="btn btn-outline-danger d-flex align-items-center"
                            onClick={() => openModal('reject')}
                            title="Reject this loan application"
                        >
                            <i className="bi bi-x-circle me-1"></i> Reject Loan
                        </button>
                    </div>
                )}

                {loan.status === 'approved' && (
                    <div className="d-flex gap-2 mb-4">
                        <button className="btn btn-primary me-2" onClick={() => openModal('disburse')}>
                            Disburse Loan
                        </button>
                    </div>

                )}

                {loan?.status === 'disbursed' && (
                    <div className="d-flex gap-2 mb-4">
                        <button className="btn btn-outline-warning mt-3" onClick={() => openModal('adjust')}>
                            Adjustment
                        </button>
                    </div>

                )}

                {/* Repayment Section */}
                {loan.status === 'disbursed' && (
                    <div className="mt-4 mb-4 border rounded p-3 bg-light">
                        <h5 className="mb-3 text-dark">💳 Make a Repayment</h5>
                        <div className="row gy-2">
                            {loan.repaymentSchedule?.find(r => !r.paid) && (
                                <div className="alert alert-info py-2">
                                    <p>
                                        <strong>Upcoming EMI:</strong>{' '}
                                        ₹{((upcomingEMI?.amount || 0) - (upcomingEMI?.amountPaid || 0)).toLocaleString('en-IN')} due on{' '}
                                        {upcomingEMI?.dueDate ? new Date(upcomingEMI.dueDate).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            )}
                            <div className="col-md-4">
                                <label className="form-label fw-bold text-black">Repayment Mode</label>
                                <select
                                    className="form-select"
                                    value={repayMode}
                                    onChange={(e) => setRepayMode(e.target.value)}
                                >
                                    {repaymentModes.map((mode) => (
                                        <option key={mode} value={mode}>
                                            {mode?.toUpperCase()} {mode === 'emi' ? `(₹${emiData.emi.toLocaleString('en-IN')})` :
                                                mode === 'full' ? `(₹${getRemainingBalance()})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {repayMode === 'custom' && (
                                <div className="col-md-4">
                                    <label className="form-label fw-bold text-black">Enter Amount</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={repayAmount}
                                        onChange={(e) => setRepayAmount(e.target.value)}
                                        placeholder="Custom amount"
                                    />
                                </div>
                            )}

                            <div className="col-md-4">
                                <label className="form-label fw-bold text-black">Transaction Ref / Note</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={repaymentRef}
                                    onChange={(e) => setRepaymentRef(e.target.value)}
                                    placeholder="Optional reference"
                                />
                            </div>

                            <div className="col-md-4 mt-2 d-flex aligh-item-center">
                                <button className="btn btn-success w-100 btn-md" onClick={() => {
                                    let amt = 0;
                                    if (repayMode === 'emi') amt = emiData.emi;
                                    else if (repayMode === 'full') amt = parseFloat(getRemainingBalance());
                                    else amt = parseFloat(repayAmount);

                                    if (!amt || amt <= 0) return toast.error('Enter valid amount');
                                    setPreviewAmount(amt);
                                    setShowRepayPreview(true);
                                }}>
                                    💰 Preview & Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                <ul className="nav nav-tabs mb-3">

                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'repayments' ? 'active' : ''}`}
                            onClick={() => setActiveTab('repayments')}
                        >
                            Repayments
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'adjustments' ? 'active' : ''}`}
                            onClick={() => setActiveTab('adjustments')}
                        >
                            Adjustments
                            <span className="badge bg-warning ms-2">
                                {loan.adjustments?.filter(adj => adj.status === 'pending').length || 0}
                            </span>
                        </button>
                    </li>
                </ul>

                {activeTab === 'repayments' && (
                    <div>
                        {loan.repaymentSchedule?.length > 0 && (
                            <div className="mt-5">
                                <h5>Repayment History</h5>
                                <table className="table table-bordered table-sm">
                                    <thead className="table-light">
                                        <tr>
                                            <th>#</th>
                                            <th>Due Date</th>
                                            <th>Paid On</th>
                                            <th>EMI Amount</th>
                                            <th>Paid</th>
                                            <th>Fine</th>
                                            <th>Total Paid</th>
                                            <th>Ref ID</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loan.repaymentSchedule.map((item, i) => {
                                            const isOverdue = !item.paid && new Date(item.dueDate) < new Date();
                                            return (
                                                <tr key={i} className={isOverdue ? 'table-danger' : ''}>
                                                    <td>{item.month || i + 1}</td>
                                                    <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}</td>
                                                    <td>{item.paidOn ? new Date(item.paidOn).toLocaleDateString() : '-'}</td>
                                                    <td>₹{(item.amount)?.toLocaleString('en-IN')}</td>
                                                    <td>₹{(item.amountPaid || 0)?.toLocaleString('en-IN')}</td>
                                                    <td>
                                                        ₹{(item.fine || 0).toLocaleString('en-IN')}
                                                        {item.fine > 0 && (
                                                            <span className="ms-1 text-muted" title="Auto-applied for late EMI">⚠️</span>
                                                        )}
                                                    </td>
                                                    <td>₹{((item.amountPaid || 0) + (item.fine || 0))?.toLocaleString('en-IN')}</td>
                                                    <td>{item.paymentRef || '-'}</td>
                                                    <td>
                                                        {item.paid ? (
                                                            <span className="badge bg-success">Paid</span>
                                                        ) : isOverdue ? (
                                                            <span className="badge bg-danger" title="Overdue EMI - Fine applicable">
                                                                Overdue
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-warning text-dark">Upcoming</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                                <div className="mt-2">
                                    <strong>Total Fine Collected:</strong>{' '}
                                    ₹{loan.repaymentSchedule.reduce((sum, r) => sum + (r.fine || 0), 0).toLocaleString('en-IN')}
                                </div>
                                {loan.status === 'disbursed' && loan.repaymentSchedule.some(r => r.fine > 0 && !r.paid) && (
                                    <button
                                        className="btn btn-outline-danger mt-2"
                                        onClick={() => toast.info('Waive fine feature coming soon!')}
                                    >
                                        Waive Overdue Fines
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'adjustments' && (
                    <div>
                        {filteredAdjustments.length > 0 && (
                            <>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h5 className="mb-0">Loan Adjustments</h5>
                                    <select
                                        className="form-select form-select-sm w-auto"
                                        value={adjustmentFilter}
                                        onChange={(e) => {
                                            setAdjustmentFilter(e.target.value);
                                            setCurrentPage(1); // reset to first page
                                        }}
                                    >
                                        <option value="">All</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                                <table className="table table-bordered table-sm">
                                    <thead className="table-light">
                                        <tr>
                                            <th>#</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th>Remarks</th>
                                            <th>Status</th>
                                            <th>Requested By</th>
                                            <th>Approved By</th>
                                            <th>Approved At</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedAdjustments.map((adj, index) => (
                                            <tr key={index}>
                                                <td>{(currentPage - 1) * adjustmentsPerPage + index + 1}</td>
                                                <td className="text-capitalize">{adj.type}</td>
                                                <td>₹{adj.amount?.toLocaleString('en-IN')}</td>
                                                <td>{adj.remarks || '-'}</td>
                                                <td>
                                                    <span className={`badge bg-${adj.status === 'approved' ? 'success' : adj.status === 'rejected' ? 'danger' : 'warning'} text-uppercase`}>
                                                        {adj.status}
                                                    </span>
                                                </td>
                                                <td>{adj.createdBy || '-'}</td>
                                                <td>{adj.approvedBy || '-'}</td>
                                                <td>{adj.approvedAt ? new Date(adj.approvedAt).toLocaleDateString() : '-'}</td>
                                                <td>
                                                    {adj.status === 'pending' && (
                                                        <>
                                                            <button className="btn btn-sm btn-success me-2" onClick={async () => {
                                                                try {
                                                                    await approveLoanAdjustment(loan._id, adj._id);
                                                                    toast.success('Adjustment approved');
                                                                    fetchLoan();
                                                                } catch (err) {
                                                                    toast.error(err.message);
                                                                }
                                                            }}>Approve</button>
                                                            <button className="btn btn-sm btn-danger" onClick={async () => {
                                                                const reason = prompt('Enter reason for rejection');
                                                                if (!reason) return;
                                                                try {
                                                                    await rejectLoanAdjustment(loan._id, adj._id, reason);
                                                                    toast.success('Adjustment rejected');
                                                                    fetchLoan();
                                                                } catch (err) {
                                                                    toast.error(err.message);
                                                                }
                                                            }}>Reject</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {totalPages > 1 && (
                                    <nav className="mt-2">
                                        <ul className="pagination pagination-sm">
                                            {Array.from({ length: totalPages }).map((_, i) => (
                                                <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                                    <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                                                        {i + 1}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </nav>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Amortization Schedule */}
                {loan.status === 'disbursed' && (
                    <div className="mt-5">
                        <details>
                            <summary className="fw-bold">📅 View Amortization Schedule</summary>
                            <table className="table table-sm mt-2 table-striped">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>EMI</th>
                                        <th>Interest</th>
                                        <th>Principal</th>
                                        <th>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {emiData.schedule.map((row, idx) => (
                                        <tr key={idx}>
                                            <td>{row.month}</td>
                                            <td>₹{row.emi.toLocaleString('en-IN')}</td>
                                            <td>₹{row.interest.toLocaleString('en-IN')}</td>
                                            <td>₹{row.principal.toLocaleString('en-IN')}</td>
                                            <td>₹{row.balance.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </details>
                    </div>
                )}

                {loan.status === 'repaid' && (
                    <div className="alert alert-success mt-4">
                        🎉 This loan is fully repaid and closed.
                    </div>
                )}
            </div>

            {/* Optional EMI Tool */}
            <div className="mt-4">
                <EMICalculator />
            </div>
            <CommonModal
                show={modal.show}
                onHide={closeModal}
                title={
                    modal.type === 'approve' ? 'Approve Loan' :
                        modal.type === 'reject' ? 'Reject Loan' :
                            modal.type === 'disburse' ? 'Disburse Loan' :
                                modal.type === 'adjust' ? 'Loan Adjustment' :
                                    'Confirm Action'
                }
                body={
                    modal.type === 'reject' ? (
                        <>
                            <label className="form-label">Reason for rejection</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder="Enter reason..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                        </>
                    ) : modal.type === 'adjust' ? (
                        <>
                            <div className="mb-2">
                                <label className="form-label text-black">Adjustment Type</label>
                                <select
                                    className="form-select"
                                    value={adjustmentData.type}
                                    onChange={(e) =>
                                        setAdjustmentData({ ...adjustmentData, type: e.target.value })
                                    }
                                >
                                    <option value="">Select Type</option>
                                    <option value="waiveFine">Waive Fine</option>
                                    <option value="writeOff">Write-off</option>
                                    <option value="customAdjustment">Custom Adjustment</option>
                                </select>
                            </div>
                            <div className="mb-2">
                                <label className="form-label text-black">Amount</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={adjustmentData.amount}
                                    onChange={(e) =>
                                        setAdjustmentData({ ...adjustmentData, amount: e.target.value })
                                    }
                                    placeholder="Enter adjustment amount"
                                />
                            </div>
                            <div>
                                <label className="form-label text-black">Remarks</label>
                                <textarea
                                    className="form-control"
                                    rows={2}
                                    value={adjustmentData.remarks}
                                    onChange={(e) =>
                                        setAdjustmentData({ ...adjustmentData, remarks: e.target.value })
                                    }
                                    placeholder="Reason for adjustment"
                                />
                            </div>
                        </>
                    ) : (
                        `Are you sure you want to ${modal.type} this loan?`
                    )
                }
                onConfirm={async () => {
                    try {
                        if (modal.type === 'approve') {
                            await approveLoan(loanId);
                            toast.success('Loan approved');
                        } else if (modal.type === 'reject') {
                            if (!rejectReason.trim()) return toast.error('Please enter a rejection reason');
                            await rejectLoan(loanId, { reason: rejectReason });
                            toast.success('Loan rejected');
                            setRejectReason('');
                        } else if (modal.type === 'disburse') {
                            await disburseLoan(loanId);
                            toast.success('Loan disbursed');
                        } else if (modal.type === 'adjust') {
                            await handleAdjustment();
                            return;
                        }
                        fetchLoan();
                        closeModal();
                    } catch (err) {
                        toast.error(err?.message || 'Action failed');
                    }
                }}
                confirmText={
                    modal.type === 'approve' ? 'Approve' :
                        modal.type === 'reject' ? 'Reject' :
                            modal.type === 'disburse' ? 'Disburse' :
                                modal.type === 'adjust' ? 'Submit Adjustment' :
                                    'Confirm'
                }
                confirmVariant={
                    modal.type === 'reject' ? 'danger' :
                        modal.type === 'approve' ? 'warning' :
                            modal.type === 'disburse' ? 'primary' :
                                modal.type === 'adjust' ? 'info' :
                                    'primary'
                }
            />
            <CommonModal
                show={showRepayPreview}
                onHide={() => setShowRepayPreview(false)}
                title="Confirm Repayment"
                body={
                    <div>
                        <p><strong>Repayment Amount:</strong> ₹{previewAmount.toLocaleString('en-IN')}</p>
                        <p><strong>Mode:</strong> {repayMode?.toUpperCase()}</p>
                        <p><strong>Reference Note:</strong> {repaymentRef || 'N/A'}</p>
                    </div>
                }
                onConfirm={async () => {
                    try {
                        await repayLoan(loanId, {
                            amount: previewAmount,
                            paymentRef: repaymentRef || `TXN-${Date.now()}`,
                            mode: repayMode // 'emi', 'full', or 'custom'
                        });
                        toast.success('Repayment successful');
                        setRepayAmount('');
                        setRepaymentRef('');
                        fetchLoan();
                    } catch (err) {
                        toast.error(err?.message || 'Repayment failed');
                    } finally {
                        setShowRepayPreview(false);
                    }
                }}
                confirmText="Confirm & Pay"
                confirmVariant="success"
            />
        </div>
    );
};

export default LoanView;
