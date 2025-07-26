import React, { useState } from "react";
import { Link } from "react-router-dom";
import CommonModal from "../../components/common/CommonModal";
import { format } from 'date-fns';

const SummaryTable = ({ categorizedEntry = {}, totalEntries = {} }) => {
    const [showModal, setShowModal] = useState(false);
    const [selectedData, setSelectedData] = useState(null);
    const [selectedSource, setSelectedSource] = useState(null);
    const [activeTab, setActiveTab] = useState("receipt");

    const accountEntries = categorizedEntry?.accountEntries || {};
    const loanEntries = categorizedEntry?.loanEntries || {};
    const chargeEntries = categorizedEntry?.chargeEntries || {};

    const renderTable = (entries, sourceLabel) => (
        <table className="table theme-table table-bordered table-hover align-middle">
            <thead className="table-light">
                <tr>
                    <th>{sourceLabel === "AccountCharge" ? "CLOSING / ASSETS" : sourceLabel.toUpperCase()}</th>
                    <th>DR</th>
                    <th>CR</th>
                    <th>Total</th>
                    <th style={{ width: "100px" }}>Action</th>
                </tr>
            </thead>
            <tbody className="table-bordered border-black">
                {Object.entries(entries)
                    .filter(([key]) => !['totalDebitAll', 'totalCreditAll', 'totalAll'].includes(key))
                    .map(([accountType, data]) => {
                        const totalDebit = data?.totalDebit || 0;
                        const totalCredit = data?.totalCredit || 0;
                        const total = data?.total || 0;
                        return (
                            <tr key={accountType}>
                                <td>{accountType?.toUpperCase()}</td>
                                <td>{totalDebit?.toFixed(2)}</td>
                                <td>{totalCredit?.toFixed(2)}</td>
                                <td>{total?.toFixed(2)}</td>
                                <td>
                                    <Link className="badge bg-success" to="#" component="button" onClick={() => {
                                        setShowModal(true);
                                        setSelectedData(accountType?.toLowerCase());
                                        setSelectedSource(sourceLabel);
                                    }}>
                                        View Details
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                <tr className="fw-bold fst-italic table-secondary">
                    <td>TOTAL</td>
                    <td>{entries?.totalDebitAll?.toFixed(2)}</td>
                    <td>{entries?.totalCreditAll?.toFixed(2)}</td>
                    <td>{entries?.totalAll?.toFixed(2)}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
    );

    return (
        <div className="row g-0">
            <div className="col-md-12 mb-3">
                <div className="theme-btn-secondary text-center py-2">
                    <h5 className="mb-0">Balance Sheet {new Date().toISOString().split('T')[0]}</h5>
                </div>
            </div>

            {/* Tabs */}
            <div className="col-md-12">
                <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === "receipt" ? "active" : ""}`} onClick={() => setActiveTab("receipt")}>RECEIPT</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === "loan" ? "active" : ""}`} onClick={() => setActiveTab("loan")}>LOAN</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === "assets" ? "active" : ""}`} onClick={() => setActiveTab("assets")}>ASSETS</button>
                    </li>
                </ul>

                {activeTab === "receipt" && renderTable(accountEntries, "Transaction")}
                {activeTab === "loan" && renderTable(loanEntries, "Transaction")}
                {activeTab === "assets" && renderTable(chargeEntries, "AccountCharge")}
            </div>

            {/* Monthly Summary */}
            <div className="col-md-12 mt-4">
                <div className="card shadow-sm border border-dark">
                    <div className="card-header bg-dark text-white fw-bold">Monthly Ledger Summary</div>
                    <div className="card-body">
                        <p className="mb-2 fs-6 text-muted">
                            <strong>Total Monthly Balance</strong> = Total Receipts + Total Payments + Closing Balance
                        </p>
                        <h5 className="mb-3 text-primary fw-bold">
                            TOTAL (Profit/Loss): ₹
                            {(
                                (accountEntries?.totalAll || 0) +
                                (loanEntries?.totalAll || 0) +
                                (chargeEntries?.totalAll || 0)
                            ).toLocaleString()}
                        </h5>
                        <hr />
                        <div className="row text-center">
                            <div className="col-md-4 mb-2">
                                <div className="border rounded p-2 bg-light">
                                    <span className="fw-semibold">Account Transactions</span>
                                    <div className="text-success fs-5">₹{(accountEntries?.totalAll || 0).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="col-md-4 mb-2">
                                <div className="border rounded p-2 bg-light">
                                    <span className="fw-semibold">Loan Transactions</span>
                                    <div className="text-success fs-5">₹{(loanEntries?.totalAll || 0).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="col-md-4 mb-2">
                                <div className="border rounded p-2 bg-light">
                                    <span className="fw-semibold">Charges & Fees</span>
                                    <div className="text-success fs-5">₹{(chargeEntries?.totalAll || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <CommonModal show={showModal} onHide={() => setShowModal(false)} title="All Records" footer={false}>
                <div className="row">
                    <div className="col-md-12 mb-3">
                        <h6 className="text-center fw-bold text-danger">Balance Sheet {new Date().toISOString().split('T')[0]}</h6>
                    </div>
                    <div className="col-md-12">
                        <table className="table theme-table table-bordered table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Account No</th>
                                    <th>Debit</th>
                                    <th>Credit</th>
                                    <th>Total</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    let totalDebit = 0;
                                    let totalCredit = 0;

                                    const filteredEntries = totalEntries?.filter(item => {
                                        if (selectedSource === "AccountCharge") {
                                            return item?.type === selectedData && item?.source === selectedSource;
                                        } else {
                                            return item?.accountType === selectedData && item?.source === selectedSource;
                                        }
                                    });

                                    return (
                                        <>
                                            {filteredEntries.map((item, idx) => {
                                                totalDebit += item?.debit || 0;
                                                totalCredit += item?.credit || 0;
                                                return (
                                                    <tr key={idx}>
                                                        <td>{item?.accountNumber || "Auto-Created"}</td>
                                                        <td>{item?.debit}</td>
                                                        <td>{item?.credit}</td>
                                                        <td>{item?.amount}</td>
                                                        <td>{format(new Date(item?.date), 'dd MMM yyyy')}</td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="fw-bold fst-italic table-secondary">
                                                <td>TOTAL</td>
                                                <td>{totalDebit}</td>
                                                <td>{totalCredit}</td>
                                                <td>{(totalCredit - totalDebit)?.toFixed(2)}</td>
                                                <td></td>
                                            </tr>
                                        </>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CommonModal>
        </div>
    );
};

export default SummaryTable;
