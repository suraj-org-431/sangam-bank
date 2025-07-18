import React, { useEffect, useState } from 'react';
import { exportMonthlyLedgerReport, getMonthlyLedgerReport } from '../../api/ledger';
import { toast } from 'react-toastify';
import { Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { adminRoute } from '../../utils/router';

const MonthlyLedgerReport = () => {
    const navigate = useNavigate();
    const [entries, setEntries] = useState([]);
    const [totalEntries, setTotalEntries] = useState(0);
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
            setTotalEntries(res?.totalEntries)
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

                <div className="d-flex gap-2 flex-wrap justify-content-between w-100">
                    <div>
                        <h4 className="theme-text">Monthly Ledger Report</h4>
                    </div>
                    <div className='d-flex gap-2'>
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
                            <Form.Select className='pe-5' size="sm" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
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
                        <div>
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => navigate(adminRoute('/ledger/create'))}
                            >
                                + Create Ledger
                            </button>
                        </div>
                    </div>
                </div>
                <div className='border my-4'></div>


                <div className='row'>
                    <div className='col-sm-4'>
                        <div class="alert alert-success bank_info px-4">
                            <label class="text-black border-bottom mb-2 text-muted">Opening Balance</label>
                            <div className='d-flex align-items-center'> <i class="fa-solid h3 fa-indian-rupee-sign me-2"></i>
                                <h1 className='text-primary'>{openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h1>
                            </div>
                        </div>
                    </div>

                    <div className='col-sm-4'>
                        <div class="alert alert-success bank_info px-4">
                            <label class="text-black border-bottom mb-2 text-muted">Closing Balance</label>
                            <div className='d-flex align-items-center'> <i class="fa-solid h3 fa-indian-rupee-sign me-2"></i>
                                <h1 className='text-success'>
                                    {closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h1>
                            </div>
                        </div>
                    </div>

                    <div className='col-sm-4'>
                        <div class="alert alert-success bank_info px-4">
                            <label class="text-black border-bottom mb-2 text-muted">Total Ledger</label>
                            <div className='d-flex align-items-center'>
                                <i class="fa-solid fa-layer-group me-2 h3"></i>
                                <h1 className='text-primary'>{totalEntries}</h1>
                            </div>
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
