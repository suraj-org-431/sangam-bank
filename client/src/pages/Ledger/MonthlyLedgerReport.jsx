import React, { useEffect, useState } from 'react';
import { getMonthlyLedgerReport } from '../../api/ledger'; // adjust path if needed
import { toast } from 'react-toastify';

const MonthlyLedgerReport = () => {
    const [entries, setEntries] = useState([]);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [closingBalance, setClosingBalance] = useState(0);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const now = new Date();
                const res = await getMonthlyLedgerReport({
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                });

                setEntries(res.entries || []);
                setOpeningBalance(res.openingBalance || 0);
                setClosingBalance(res.closingBalance || 0);
            } catch (err) {
                toast.error('Failed to load monthly ledger report');
            }
        };

        fetchReport();
    }, []);

    const formatAmount = (amount) => {
        if (amount === '-' || amount === undefined) return '-';
        const num = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
        return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    };

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <div className="d-flex justify-content-between mb-4">
                    <h4 className="theme-text">Monthly Ledger Report</h4>
                    <div>
                        <div className="text-muted small">Opening Balance</div>
                        <div className="fw-bold text-primary">
                            ₹{openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-muted small mt-2">Closing Balance</div>
                        <div className="fw-bold text-success">
                            ₹{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-bordered theme-table">
                        <thead className="table-light">
                            <tr>
                                <th>Entry ID</th>
                                <th>Date</th>
                                <th>Ledger Head</th>
                                <th>Description</th>
                                <th>Debit (₹)</th>
                                <th>Credit (₹)</th>
                                <th>Balance (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length > 0 ? (
                                entries.map((entry, index) => (
                                    <tr
                                        key={index}
                                        className={
                                            entry.ledgerHead === 'Opening Balance'
                                                ? 'bg-light'
                                                : entry.ledgerHead === 'Closing Balance'
                                                    ? 'bg-light fw-bold'
                                                    : ''
                                        }
                                    >
                                        <td>{entry.entryId}</td>
                                        <td>{entry.date}</td>
                                        <td>{entry.ledgerHead}</td>
                                        <td>{entry.description}</td>
                                        <td>{formatAmount(entry.debit)}</td>
                                        <td>{formatAmount(entry.credit)}</td>
                                        <td>{formatAmount(entry.balance)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center">
                                        No records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MonthlyLedgerReport;
