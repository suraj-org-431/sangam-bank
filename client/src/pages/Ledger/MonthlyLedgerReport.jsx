import React, { useEffect, useState } from 'react';
import { exportMonthlyLedgerReport, getMonthlyLedgerReport } from '../../api/ledger';
import { toast } from 'react-toastify';
import { Form } from 'react-bootstrap';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MonthlyLedgerReport = () => {
    const [entries, setEntries] = useState([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [openingBalance, setOpeningBalance] = useState(0);
    const [closingBalance, setClosingBalance] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit] = useState(10); // Fixed rows per page

    useEffect(() => {
        fetchReport();
    }, [month, year, currentPage]);

    const fetchReport = async () => {
        try {
            const res = await getMonthlyLedgerReport({ month, year, page: currentPage, limit });
            setEntries(res.entries || []);
            setOpeningBalance(res.openingBalance || 0);
            setClosingBalance(res.closingBalance || 0);
            setTotalPages(res.totalPages || 1);
        } catch (err) {
            toast.error('Failed to load monthly ledger report');
        }
    };

    const formatAmount = (amount) => {
        if (amount === '-' || amount === undefined) return '-';
        const num = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
        return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    };

    const handleExport = async (format) => {
        try {
            await exportMonthlyLedgerReport({ month, year, format });
        } catch (err) {
            toast.error('Export failed');
        }
    };

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <div className="d-flex justify-content-between mb-3 flex-wrap">
                    <h4 className="theme-text">Monthly Ledger Report</h4>
                    <div className="d-flex gap-2 flex-wrap mt-3 mb-3 justify-content-end">
                        <div>
                            <Form.Select size="sm" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                    </option>
                                ))}
                            </Form.Select>
                        </div>
                        <div>
                            <Form.Select size="sm" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                                {[2023, 2024, 2025, 2026].map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </Form.Select>
                        </div>
                        <div>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => handleExport('excel')}>
                                📥 Export Excel
                            </button>
                        </div>
                        <div>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleExport('pdf')}>
                                📄 Export PDF
                            </button>
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-between mb-3">
                    <div>
                        <div className="text-muted small">Opening Balance</div>
                        <div className="fw-bold text-primary">
                            ₹{openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div>
                        <div className="text-muted small">Closing Balance</div>
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

                {/* Pagination */}
                <div className="d-flex justify-content-end align-items-center gap-2 mt-3">
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                        disabled={currentPage === 1}
                    >
                        Prev
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div >
    );
};

export default MonthlyLedgerReport;
