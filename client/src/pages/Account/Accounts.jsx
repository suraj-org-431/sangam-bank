import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import { adminRoute } from '../../utils/router';
import { sortByField, renderSortIcon } from '../../utils/sortUtils';
import { fetchUserPermissions, hasPermission } from '../../utils/permissionUtils';
import CommonModal from '../../components/common/CommonModal';
import { getAllAccounts, importAccountsFromCSV } from '../../api/account';
import { format } from 'date-fns';

const REQUIRED_HEADERS = [
    "accountType",
    "tenure",
    "branch",
    "applicantName",
    "gender",
    "dob",
    "occupation",
    "phone",
    "fatherOrHusbandName",
    "relation",
    "village",
    "post",
    "block",
    "district",
    "state",
    "pincode",
    "aadhar",
    "depositAmount",
    "introducerName",
    "membershipNumber",
    "introducerKnownSince",
    "accountNumber",
    "nomineeName",
    "nomineeRelation",
    "nomineeAge",
    "managerName",
    "lekhpalOrRokapal",
    "formDate",
    "accountOpenDate"
];

const Accounts = () => {
    const [accountsList, setAccountsList] = useState([]);
    const [query, setQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [userPermissions, setUserPermissions] = useState([]);
    const [show403Modal, setShow403Modal] = useState(false);
    const [sortField, setSortField] = useState('applicantName');
    const [sortOrder, setSortOrder] = useState('asc');
    const [csvFile, setCsvFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [csvErrors, setCsvErrors] = useState([]);
    const [uploadSummary, setUploadSummary] = useState(null);
    const accountsPerPage = 10;
    const [filters, setFilters] = useState({
        accountType: '',
        gender: '',
        tenure: ''
    });

    const navigate = useNavigate();

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
        fetchAccounts();
    }, [currentPage, query, filters]);

    const fetchAccounts = async () => {
        try {
            const res = await getAllAccounts({ page: currentPage, limit: accountsPerPage, search: query, ...filters });
            setAccountsList(res.accounts || []);
            setTotalPages(res.totalPages);
        } catch (err) {
            toast.error(err?.message || 'Failed to fetch accounts');
        }
    };

    const handleSort = (field) => {
        setSortField(field);
        setSortOrder(sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const handleCSVFile = (file) => {
        setCsvFile(file);
        setCsvErrors([]);
        setUploadSummary(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields;
                const invalidHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
                if (invalidHeaders.length > 0) {
                    toast.error(`Missing headers: ${invalidHeaders.join(', ')}`);
                }
            },
            error: (err) => {
                toast.error('Failed to parse CSV: ' + err.message);
            }
        });
    };

    const handleCSVImport = async () => {
        if (!csvFile) {
            toast.warn('Please select a CSV file');
            return;
        }

        const formData = new FormData();
        formData.append('file', csvFile);

        setImporting(true);
        try {
            const res = await importAccountsFromCSV(formData);
            setUploadSummary({
                successCount: res?.imported?.length || 0,
                failedCount: res?.failedRows?.length || 0
            });
            setCsvErrors(res?.failedRows || []);
            toast.success(`Imported ${res?.imported?.length} record(s)`);
            fetchAccounts();
        } catch (err) {
            toast.error(err.message || 'CSV import failed');
        } finally {
            setImporting(false);
        }
    };

    const sortedAccounts = sortByField(accountsList, sortField, sortOrder);

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <h4 className="mb-3 theme-text">Account Details</h4>

                    <div className="d-flex flex-wrap gap-2 align-items-end">
                        {/* Search */}
                        <div>
                            <label className="form-label mb-1 text-black">Search</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Name or Account No."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>

                        {/* Account Type */}
                        <div>
                            <label className="form-label mb-1 text-black">Account Type</label>
                            <select
                                className="form-select form-select-sm"
                                value={filters.accountType}
                                onChange={(e) => setFilters(prev => ({ ...prev, accountType: e.target.value }))}
                            >
                                <option value="">All</option>
                                <option value="s/f">Saving Fund / बचत कोष</option>
                                <option value="Current">Current / चालू खाता</option>
                                <option value="Fixed">Fixed / सावधि जमा</option>
                                <option value="Recurring">Recurring / आवर्ती जमा</option>
                                <option value="MIS">MIS / मासिक आय योजना</option>
                                <option value="Loan">Loan / ऋण</option>
                            </select>
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="form-label mb-1 text-black">Gender</label>
                            <select
                                className="form-select form-select-sm"
                                value={filters.gender}
                                onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                            >
                                <option value="">All</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Tenure */}
                        <div>
                            <label className="form-label mb-1 text-black">Tenure</label>
                            <select
                                className="form-select form-select-sm"
                                value={filters.tenure}
                                onChange={(e) => setFilters(prev => ({ ...prev, tenure: e.target.value }))}
                            >
                                <option value="">All</option>
                                <option value="6">6 Months</option>
                                <option value="12">1 Year</option>
                                <option value="18">3 Years</option>
                                <option value="30">5 Years</option>
                            </select>
                        </div>

                        {/* Clear Filters */}
                        <div className="align-self-end">
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => {
                                    setFilters({ accountType: '', gender: '', tenure: '' });
                                    setQuery('');
                                }}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>


                </div>
                {/* Action Buttons */}
                <div className="d-flex gap-2 flex-wrap mt-3 mb-3 float-right justify-content-end">
                    <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = `${process.env.PUBLIC_URL}/accounts_sample.csv`;
                            link.setAttribute('download', 'accounts_sample.csv');
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                    >
                        📥 Download Template
                    </button>

                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                            if (!hasPermission(userPermissions, 'POST:/accounts/import')) {
                                setShow403Modal(true);
                                return;
                            }
                            setShowImportModal(true);
                        }}
                    >
                        📤 Import
                    </button>

                    <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                            if (!hasPermission(userPermissions, 'POST:/accounts')) {
                                setShow403Modal(true);
                                return;
                            }
                            navigate(adminRoute('/account/create'));
                        }}
                    >
                        + Create Account
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="table theme-table table-bordered table-hover align-middle">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th onClick={() => handleSort('user.name')}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span>Account Name</span>
                                        {renderSortIcon('user.name', sortField, sortOrder)}
                                    </div>
                                </th>
                                <th>Account Type</th>
                                <th>Account Number</th>
                                <th>Total Amount</th>
                                <th>Opening Date</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAccounts.map((acc, idx) => (
                                <tr key={acc._id}>
                                    <td>{(currentPage - 1) * accountsPerPage + idx + 1}</td>
                                    <td>{acc.applicantName}</td>
                                    <td>{acc.accountType?.toUpperCase() || '-'}</td>
                                    <td>{acc.accountNumber || '-'}</td>
                                    <td>{acc.balance?.toFixed(2) || '-'}</td>
                                    <td>{format(new Date(acc.accountOpenDate), 'dd MMM yyyy')}</td>
                                    <td className="text-center">
                                        <button className="btn btn-sm btn-outline-info me-2" onClick={() => {
                                            if (!hasPermission(userPermissions, `GET:/accounts/${acc?._id}`)) {
                                                setShow403Modal(true);
                                                return;
                                            }
                                            navigate(adminRoute(`/account/view/${acc?._id}`), { state: { accountData: acc } });
                                        }}>View</button>
                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => {
                                            // if (!hasPermission(userPermissions, `GET:/accounts/${acc?._id}/transactions`)) {
                                            //     setShow403Modal(true);
                                            //     return;
                                            // }
                                            navigate(adminRoute(`/account/transactions/${acc?._id}`), { state: { accountData: acc } });
                                        }}>View Transactions</button>
                                    </td>
                                </tr>
                            ))}
                            {sortedAccounts.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted">No accounts found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="d-flex justify-content-end mt-3">
                    <button className="btn btn-sm btn-secondary me-2" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Prev</button>
                    <span className="align-self-center">Page {currentPage} of {totalPages}</span>
                    <button className="btn btn-sm btn-secondary ms-2" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
                </div>
            </div>

            {/* Modal: Access Denied */}
            <CommonModal
                show={show403Modal}
                onHide={() => setShow403Modal(false)}
                title="Access Denied"
                type="access-denied"
                emoji="🚫"
            />

            {/* Modal: Import CSV */}
            <CommonModal
                show={showImportModal}
                onHide={() => {
                    setShowImportModal(false);
                    setCsvFile(null);
                }}
                title="Import Accounts from CSV"
                footer={false}
            >
                <div className="mb-3">
                    <label className="form-label fw-semibold text-black">Choose CSV File</label>
                    <input
                        type="file"
                        accept=".csv"
                        className="form-control"
                        onChange={(e) => handleCSVFile(e.target.files[0])}
                    />
                </div>

                {uploadSummary && (
                    <div className="alert alert-success mt-3">
                        ✅ Imported: {uploadSummary.successCount} rows<br />
                        ⚠️ Failed: {uploadSummary.failedCount} rows
                    </div>
                )}

                {csvErrors.length > 0 && (
                    <div className="alert alert-danger mt-2">
                        <strong>Errors:</strong>
                        <ul className="mb-0">
                            {csvErrors.map((err, i) => (
                                <li key={i}>Row {err.row}: {err.reason}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
                    <button className="btn btn-primary" disabled={!csvFile || importing} onClick={handleCSVImport}>
                        {importing ? 'Importing...' : 'Import'}
                    </button>
                </div>
            </CommonModal>
        </div>
    );
};

export default Accounts;
