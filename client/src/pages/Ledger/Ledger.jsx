import React, { useEffect, useRef, useState } from "react";
import MonthlyLedgerTable from "./MonthlyLedgerReport";
import { useNavigate } from "react-router-dom";
import { fetchUserPermissions, hasPermission } from "../../utils/permissionUtils";
import { toast } from "react-toastify";
import { exportMonthlyLedgerReport, getMonthlyLedgerReport } from "../../api/ledger";
import { adminRoute } from "../../utils/router";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const Ledger = () => {
    const printRef = useRef();
    const navigate = useNavigate();
    const [userPermissions, setUserPermissions] = useState([]);
    const [categorizedEntry, setCategorizedEntry] = useState([]);
    const [show403Modal, setShow403Modal] = useState(false);
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
        fetchReport();
    }, [month, year, currentPage]);

    const fetchReport = async () => {
        try {
            const res = await getMonthlyLedgerReport({ month, year, page: currentPage, limit });
            console.log(res)
            setCategorizedEntry(res?.categorized)
            setTotalEntries(res?.totalEntries)
            setEntries(res.entries || []);
            setOpeningBalance(res?.opening?.amount || 0);
            setClosingBalance(res?.closing?.amount || 0);
            setTotalPages(res.totalPages || 1);

        } catch (err) {
            toast.error('Failed to load monthly ledger report');
        }
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
                            <select
                                className="form-select form-select-sm"
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                            >
                                <option value="">Select Month</option>
                                {monthNames.map((name, index) => (
                                    <option key={index} value={index + 1}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <input
                                type="number"
                                min="2023"
                                max="2100"
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                                className="form-control form-control-sm pe-5"
                                placeholder="Year (e.g. 2025)"
                            />
                        </div>

                        <div>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => {
                                if (!hasPermission(userPermissions, 'GET:/ledger/export')) {
                                    setShow403Modal(true);
                                    return;
                                }
                                handleExport('excel')
                            }}>
                                📥 Export Excel
                            </button>
                        </div>
                        {/* <div>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => {
                                if (!hasPermission(userPermissions, 'GET:/ledger/export')) {
                                    setShow403Modal(true);
                                    return;
                                }
                                handleExport('pdf')
                            }}>
                                📄 Export PDF
                            </button>
                        </div> */}
                        <div>
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => {
                                    if (!hasPermission(userPermissions, 'POST:/ledger')) {
                                        setShow403Modal(true);
                                        return;
                                    }
                                    navigate(adminRoute('/ledger/create'))
                                }}
                            >
                                + Create Ledger
                            </button>
                        </div>
                    </div>
                </div>
                <div className='border my-4'></div>
                <MonthlyLedgerTable
                    ref={printRef}
                    categorizedEntry={categorizedEntry}
                    entries={entries}
                    openingBalance={openingBalance}
                    closingBalance={closingBalance}
                    totalEntries={entries.length}
                    month={7}
                    year={2025}
                />
            </div>
        </div>

    )

}
export default Ledger;