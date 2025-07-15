import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getLedgerSummaryByParticular } from '../../api/ledger';
import { adminRoute } from '../../utils/router';

const LedgerSummary = () => {
    const { particular } = useParams();
    const originalParticular = particular?.replace(/-/g, ' ');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const res = await getLedgerSummaryByParticular(originalParticular, 1, 1000);
                const filtered = res.entries?.filter(
                    e => e.particulars?.toLowerCase() === originalParticular.toLowerCase()
                ) || [];
                setEntries(filtered);
            } catch (err) {
                console.error(err);
                toast.error('Failed to fetch ledger entries');
            } finally {
                setLoading(false);
            }
        };

        fetchEntries();
    }, [originalParticular]);

    const getTotal = (types = []) =>
        entries
            .filter(e => types.includes(e.transactionType))
            .reduce((sum, e) => sum + (e.amount || 0), 0);

    const formatAmount = (amount) =>
        `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const getBadgeClass = (type) => {
        switch (type) {
            case 'deposit': return 'bg-success';
            case 'rdInstallment': return 'bg-success';
            case 'loanDisbursed': return 'bg-primary';
            case 'loanRepayment': return 'bg-warning text-dark';
            case 'transfer': return 'bg-info text-dark';
            case 'interest': return 'bg-secondary';
            case 'withdrawal':
            case 'penalty': return 'bg-danger';
            default: return 'bg-dark';
        }
    };

    const getLabel = (type) => {
        switch (type) {
            case 'deposit': return 'Deposit / जमा';
            case 'withdrawal': return 'Withdrawal / निकासी';
            case 'transfer': return 'Transfer / ट्रांसफर';
            case 'loanDisbursed': return 'Loan Disbursed / ऋण वितरण';
            case 'loanRepayment': return 'Loan Repayment / ऋण भुगतान';
            case 'interest': return 'Interest / ब्याज';
            case 'rdInstallment': return 'RD Installment / आरडी जमा';
            case 'penalty': return 'Penalty / दंड';
            default: return type.charAt(0).toUpperCase() + type.slice(1);
        }
    };

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0">Ledger Summary - {originalParticular}</h4>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(adminRoute('/ledger'))}>
                        ← Back to Summary
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="table table-bordered theme-table table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Transaction Type</th>
                                <th>Amount (₹)</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center">Loading...</td></tr>
                            ) : entries.length === 0 ? (
                                <tr><td colSpan="5" className="text-center">No entries found.</td></tr>
                            ) : (
                                <>
                                    {entries.map((entry, idx) => (
                                        <tr key={entry._id}>
                                            <td>{idx + 1}</td>
                                            <td>{new Date(entry?.date).toLocaleDateString('en-IN')}</td>
                                            <td>
                                                <span className={`badge ${getBadgeClass(entry.transactionType)}`}>
                                                    {getLabel(entry.transactionType)}
                                                </span>
                                            </td>
                                            <td>{formatAmount(entry.amount || 0)}</td>
                                            <td>{entry.description || '-'}</td>
                                        </tr>
                                    ))}
                                    <tr className="fw-bold bg-light">
                                        <td colSpan="4" className="text-end">Total Credit (Deposit + RD)</td>
                                        <td colSpan="1">
                                            {formatAmount(getTotal(['deposit', 'rdInstallment']))}
                                        </td>
                                    </tr>
                                    <tr className="fw-bold bg-light">
                                        <td colSpan="4" className="text-end">Total Debit</td>
                                        <td colSpan="1">
                                            {formatAmount(getTotal(['withdrawal', 'penalty', 'loanRepayment']))}
                                        </td>
                                    </tr>
                                    <tr className="fw-bold bg-light">
                                        <td colSpan="4" className="text-end">Total Interest</td>
                                        <td colSpan="1">
                                            {formatAmount(getTotal(['interest']))}
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LedgerSummary;
