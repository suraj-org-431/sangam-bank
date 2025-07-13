import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getLedgerSummaryByParticular } from '../../api/ledger';
import { adminRoute } from '../../utils/router';

const LedgerSummary = () => {
    const { particular } = useParams();
    const originalParticular = particular.replace(/-/g, '-');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const res = await getLedgerSummaryByParticular(originalParticular, 1, 1000); // Fetch all entries for this particular

                const filtered = res.entries?.filter(
                    e => e.particulars?.toLowerCase() === originalParticular.toLowerCase()?.replace(/-/g, ' ')
                ) || [];
                setEntries(filtered);
            } catch (err) {
                console.log(err);
                toast.error('Failed to fetch ledger entries');
            } finally {
                setLoading(false);
            }
        };

        fetchEntries();
    }, [originalParticular]);

    const getTotal = (type) =>
        entries
            .filter(e => e.transactionType === type)
            .reduce((sum, e) => sum + (e.amount || 0), 0);

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
                                    {entries.map((entry, idx) =>
                                    (
                                        <tr key={entry._id}>
                                            <td>{idx + 1}</td>
                                            <td>{new Date(entry?.date).toLocaleDateString('en-IN')}</td>
                                            <td>{entry.transactionType}</td>
                                            <td>₹ {entry.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td>{entry.description || '-'}</td>
                                        </tr>
                                    )
                                    )}
                                    <tr className="fw-bold bg-light">
                                        <td colSpan="3" className="text-end">Total Credit</td>
                                        <td colSpan="2">
                                            ₹ {getTotal('deposit').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr className="fw-bold bg-light">
                                        <td colSpan="3" className="text-end">Total Debit</td>
                                        <td colSpan="2">
                                            ₹ {getTotal('withdrawal').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr className="fw-bold bg-light">
                                        <td colSpan="3" className="text-end">Total Interest</td>
                                        <td colSpan="2">
                                            ₹ {getTotal('interest').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
