import React, { useState } from "react";
import { Link } from "react-router-dom";
import CommonModal from "../../components/common/CommonModal";
import { format } from 'date-fns';

const SummaryTable = ({ categorizedEntry = {}, totalEntries = {} }) => {
    const [showModal, setShowModal] = useState(false);
    const [selectedData, setSelectedData] = useState(null);
    const [selectedSource, setSelectedSource] = useState(null);
    const accountEntries = categorizedEntry?.accountEntries || {};
    const loanEntries = categorizedEntry?.loanEntries || {};
    const chargeEntries = categorizedEntry?.chargeEntries || {};

    return (
        <div className="row">
            <h6 className="text-center fw-bold text-danger">Balance Sheet {new Date().toISOString().split('T')[0]}</h6>
            <div className="col-md-4">
                <table className="table table-sm table-bordered">
                    <thead className="table-light">
                        <tr>
                            <th>RECEIPT</th>
                            <th>DR</th>
                            <th>CR</th>
                            <th>Total</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody className="table-bordered border-black">
                        {Object.entries(accountEntries)
                            .filter(([key]) => !['totalDebitAll', 'totalCreditAll', 'totalAll'].includes(key))
                            .map(([accountType, data]) => {
                                const totalDebit = data?.totalDebit || 0;
                                const totalCredit = data?.totalCredit || 0;
                                const total = data?.total || 0;
                                return (
                                    <tr key={accountType}>
                                        <td>{accountType?.toUpperCase()}</td>
                                        <td>{totalDebit}</td>
                                        <td>{totalCredit}</td>
                                        <td>{total}</td>
                                        <td>
                                            <Link to="#" component="button" onClick={() => {
                                                setShowModal(true)
                                                setSelectedData(accountType?.toLowerCase())
                                                setSelectedSource("Transaction")
                                            }}>
                                                view
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        <tr className="fw-bold fst-italic table-secondary">
                            <td>TOTAL</td>
                            <td>{accountEntries?.totalDebitAll}</td>
                            <td>{accountEntries?.totalCreditAll}</td>
                            <td>{accountEntries?.totalAll?.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="col-md-4">
                <table className="table table-sm table-bordered">
                    <thead className="table-light">
                        <tr>
                            <th>PAYMENT</th>
                            <th>DR</th>
                            <th>CR</th>
                            <th>Total</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody className="table-bordered border-black">
                        {Object.entries(loanEntries)
                            .filter(([key]) => !['totalDebitAll', 'totalCreditAll', 'totalAll'].includes(key))
                            .map(([accountType, data]) => {
                                const totalDebit = data?.totalDebit || 0;
                                const totalCredit = data?.totalCredit || 0;
                                const total = data?.total || 0;
                                return (
                                    <tr key={accountType}>
                                        <td>{accountType?.toUpperCase()}</td>
                                        <td>{totalDebit}</td>
                                        <td>{totalCredit}</td>
                                        <td>{total}</td>
                                        <td>
                                            <Link to="#" component="button" onClick={() => {
                                                setShowModal(true)
                                                setSelectedData(accountType?.toLowerCase())
                                                setSelectedSource("Transaction")
                                            }}>
                                                view
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        <tr className="fw-bold fst-italic table-secondary">
                            <td>TOTAL</td>
                            <td>{loanEntries?.totalDebitAll}</td>
                            <td>{loanEntries?.totalCreditAll}</td>
                            <td>{loanEntries?.totalAll?.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="col-md-4">
                <table className="table table-sm table-bordered">
                    <thead className="table-light">
                        <tr>
                            <th>CLOSING / ASSETS</th>
                            <th>DR</th>
                            <th>CR</th>
                            <th>Total</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody className="table-bordered border-black">
                        {Object.entries(chargeEntries)
                            .filter(([key]) => !['totalDebitAll', 'totalCreditAll', 'totalAll'].includes(key))
                            .map(([accountType, data]) => {
                                const totalDebit = data?.totalDebit || 0;
                                const totalCredit = data?.totalCredit || 0;
                                const total = data?.total || 0;
                                return (
                                    <tr key={accountType}>
                                        <td>{accountType?.toUpperCase()}</td>
                                        <td>{totalDebit}</td>
                                        <td>{totalCredit}</td>
                                        <td>{total}</td>
                                        <td>
                                            <Link to="#" component="button" onClick={() => {
                                                setShowModal(true)
                                                setSelectedData(accountType?.toLowerCase())
                                                setSelectedSource("AccountCharge")
                                            }}>
                                                view
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        <tr className="fw-bold fst-italic table-secondary">
                            <td>TOTAL</td>
                            <td>{chargeEntries?.totalDebitAll}</td>
                            <td>{chargeEntries?.totalCreditAll}</td>
                            <td>{chargeEntries?.totalAll?.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="col-md-12 mt-4">
                <div className="card shadow-sm border border-dark">
                    <div className="card-header bg-dark text-white fw-bold">
                        Monthly Ledger Summary
                    </div>

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
            <CommonModal
                show={showModal}
                onHide={() => setShowModal(false)}
                title="All Records"
                footer={false}
            >
                <div className="row">
                    <h6 className="text-center fw-bold text-danger">Balance Sheet {new Date().toISOString().split('T')[0]}</h6>
                    <div className="col-md-12">
                        <table className="table table-sm table-bordered">
                            <thead className="table-light">
                                <tr>
                                    <th>Account No</th>
                                    <th>Debit</th>
                                    <th>Credit</th>
                                    <th>Total</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody className="table-bordered border-black">
                                {(() => {
                                    let totalDebit = 0;
                                    let totalCredit = 0;

                                    const filteredEntries = totalEntries?.filter(
                                        (item) => {
                                            if (selectedSource === "AccountCharge") {
                                                return item?.type === selectedData && item?.source === selectedSource
                                            } else {
                                                return item?.accountType === selectedData && item?.source === selectedSource
                                            }
                                        }
                                    );

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
