import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLoanById, disburseLoan, repayLoan, approveLoan } from '../../api/loan';
import { adminRoute } from '../../utils/router';
import { toast } from 'react-toastify';
import EMICalculator from './EMICalculator';

const LoanView = () => {
    const { loanId } = useParams();
    const navigate = useNavigate();
    const [loan, setLoan] = useState(null);
    const [repayAmount, setRepayAmount] = useState('');
    const [repayMode, setRepayMode] = useState('emi');

    useEffect(() => {
        fetchLoan();
    }, [loanId]);

    const fetchLoan = async () => {
        try {
            const res = await getLoanById(loanId);
            setLoan(res);
        } catch (err) {
            toast.error('Failed to fetch loan');
        }
    };

    const handleApprove = async () => {
        try {
            await approveLoan(loanId);
            toast.success('Loan approved');
            fetchLoan();
        } catch (err) {
            toast.error(err?.message || 'Approval failed');
        }
    };

    const handleDisburse = async () => {
        try {
            await disburseLoan(loanId);
            toast.success('Loan disbursed');
            fetchLoan();
        } catch (err) {
            toast.error(err?.message || 'Disbursement failed');
        }
    };

    const calculateEMI = () => {
        if (!loan?.loanAmount || !loan?.interestRate || !loan?.tenureMonths) return null;
        const P = loan.loanAmount;
        const r = loan.interestRate / 100 / 12;
        const n = loan.tenureMonths;
        const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        return parseFloat(emi.toFixed(2));
    };

    const getTotalPaid = () =>
        loan?.repaymentSchedule?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

    const getRemainingBalance = () =>
        Math.max(loan?.loanAmount - getTotalPaid(), 0).toFixed(2);

    const handleRepayment = async () => {
        let amount = 0;

        if (repayMode === 'emi') {
            amount = calculateEMI();
        } else if (repayMode === 'full') {
            amount = parseFloat(getRemainingBalance());
        } else {
            amount = parseFloat(repayAmount);
        }

        if (!amount || amount <= 0) return toast.error('Enter valid amount');

        try {
            await repayLoan(loanId, { amount });
            toast.success('Repayment successful');
            setRepayAmount('');
            fetchLoan();
        } catch (err) {
            toast.error(err?.message || 'Repayment failed');
        }
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
        return <span className={`badge bg-${color} text-uppercase`}>{label}</span>;
    };

    const generateAmortizationSchedule = () => {
        const schedule = [];
        const P = loan.loanAmount;
        const r = loan.interestRate / 100 / 12;
        const n = loan.tenureMonths;
        const emi = calculateEMI();
        let balance = P;

        for (let i = 1; i <= n; i++) {
            const interest = parseFloat((balance * r).toFixed(2));
            const principal = parseFloat((emi - interest).toFixed(2));
            balance = parseFloat((balance - principal).toFixed(2));

            schedule.push({
                month: i,
                emi: `₹${emi.toLocaleString('en-IN')}`,
                interest: `₹${interest.toLocaleString('en-IN')}`,
                principal: `₹${principal.toLocaleString('en-IN')}`,
                balance: `₹${Math.max(balance, 0).toLocaleString('en-IN')}`
            });

            if (balance <= 0) break;
        }

        return schedule;
    };

    if (!loan) return <div className="p-4">Loading...</div>;

    return (
        <div className="px-4 py-4">
            <div className="card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0">Loan Details</h4>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(adminRoute('/loan'))}>
                        ← Back to List
                    </button>
                </div>

                <div className="row mb-3">
                    <div className="col-md-6">
                        <p><strong>Borrower:</strong> {loan.borrowerName}</p>
                        <p><strong>Amount:</strong> ₹{loan.loanAmount?.toLocaleString('en-IN')}</p>
                        <p><strong>Interest Rate:</strong> {loan.interestRate}%</p>
                        <p><strong>Tenure:</strong> {loan.tenureMonths} months</p>
                    </div>
                    <div className="col-md-6">
                        <p><strong>Status:</strong> {getStatusChip(loan.status)}</p>
                        <p><strong>Monthly EMI:</strong> ₹{calculateEMI()?.toLocaleString('en-IN')}</p>
                        <p><strong>Total Payable:</strong> ₹{(calculateEMI() * loan.tenureMonths).toLocaleString('en-IN')}</p>
                        <p><strong>Total Paid:</strong> ₹{getTotalPaid().toLocaleString('en-IN')}</p>
                        <p><strong>Balance Remaining:</strong> ₹{getRemainingBalance()}</p>
                    </div>
                </div>

                {/* Action buttons */}
                {loan.status === 'draft' && (
                    <button className="btn btn-warning me-2" onClick={handleApprove}>
                        Approve Loan
                    </button>
                )}
                {loan.status === 'approved' && (
                    <button className="btn btn-primary me-2" onClick={handleDisburse}>
                        Disburse Loan
                    </button>
                )}

                {/* Repayment */}
                {loan.status === 'disbursed' && (
                    <div className="mt-3 border-top pt-3">
                        <div className="mb-2">
                            <label className='fw-bold text-black'>Repayment Mode</label>
                            <select
                                className="form-select mb-2"
                                value={repayMode}
                                onChange={(e) => setRepayMode(e.target.value)}
                            >
                                <option value="emi">Monthly EMI</option>
                                <option value="full">Repay Full</option>
                                <option value="custom">Custom Amount</option>
                            </select>

                            {repayMode === 'custom' && (
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="Enter repayment amount"
                                    value={repayAmount}
                                    onChange={(e) => setRepayAmount(e.target.value)}
                                />
                            )}
                        </div>
                        <button className="btn btn-success" onClick={handleRepayment}>
                            Submit Repayment
                        </button>
                    </div>
                )}

                {/* Repayment History */}
                {loan.repaymentSchedule?.length > 0 && (
                    <div className="mt-5">
                        <h5>Repayment History</h5>
                        <table className="table table-bordered">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Amount (₹)</th>
                                    <th>Paid On</th>
                                    <th>Balance After</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    let balance = loan.loanAmount;
                                    return loan.repaymentSchedule.map((item, i) => {
                                        balance -= item.amount;
                                        return (
                                            <tr key={i}>
                                                <td>{i + 1}</td>
                                                <td>{item.amount.toLocaleString('en-IN')}</td>
                                                <td>{new Date(item.paidOn).toLocaleDateString()}</td>
                                                <td>₹{Math.max(balance, 0).toLocaleString('en-IN')}</td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
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
                                    {generateAmortizationSchedule().map((row, idx) => (
                                        <tr key={idx}>
                                            <td>{row.month}</td>
                                            <td>{row.emi}</td>
                                            <td>{row.interest}</td>
                                            <td>{row.principal}</td>
                                            <td>{row.balance}</td>
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
            <div className="mt-4">
                <EMICalculator />
            </div>
        </div>
    );
};

export default LoanView;
