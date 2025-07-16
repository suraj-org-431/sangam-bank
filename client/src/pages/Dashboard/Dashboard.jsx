import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllTransactions } from '../../api/transaction';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { getAllAccountsCount } from '../../api/account';
import { adminRoute } from '../../utils/router';
import { getOveralllSummary, getTodayLedgerEntryCount } from '../../api/ledger';

const Dashboard = () => {
    const [transactions, setTransactions] = useState([]);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [closingBalance, setClosingBalance] = useState(0);
    const [ledgerCount, setLedgerCount] = useState(0);
    const [showOpening, setShowOpening] = useState(false);
    const [showClosing, setShowClosing] = useState(false);

    const toggleOpening = () => setShowOpening(true);
    const toggleClosing = () => setShowClosing(true);

    useEffect(() => {
        loadRecentTransactions();
        loadTotalAccounts();
        loadTodayLedgerEntry()
    }, []);

    const loadTodayLedgerEntry = async () => {
        try {
            const res = await getTodayLedgerEntryCount();
            setLedgerCount(res.count || 0);
        } catch (err) {
            toast.error('Failed to load recent transactions');
        }
    };

    const loadRecentTransactions = async () => {
        try {
            const res = await getAllTransactions({ page: 1, limit: 10 });
            setTransactions(res.transactions || []); // Assuming API returns { transactions: [...] }
        } catch (err) {
            toast.error('Failed to load recent transactions');
        }
    };


    const loadTotalAccounts = async () => {
        try {
            const res = await getAllAccountsCount();
            setTotalAccounts(res?.count);
        } catch (err) {
            toast.error('Failed to fetch total accounts');
        }
    };

    return (
        <div className="dashboard-wrapper px-4 py-4 theme-bg mt-3">
            <div className="row">
                {/* Cards */}
                <div className='col-sm-3'>
                    <div className='card dash_card'>
                        <div className='card-header'>
                            <div>
                                <h4>Account Openings</h4>
                                <i className="fa-solid fa-receipt"></i>
                            </div>
                        </div>
                        <div className='card-body'>
                            <div className='lg-text'>
                                <i className="fa-solid fa-users"></i>
                                <span>{totalAccounts.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className='card-footer'>
                            <Link to={adminRoute('/accounts')}>View Details
                                <i className="fa-solid fa-eye ms-2"></i>
                            </Link>
                        </div>
                    </div>
                </div>


                <div className='col-sm-3'>
                    <div className='card dash_card'>
                        <div className='card-header'>
                            <div>
                                <h4>Opening Balance</h4>
                                <i className="fa-solid fa-folder-open"></i>
                            </div>
                        </div>
                        <div className='card-body'>
                            <div className='lg-text'>
                                <i className="fa-solid fa-indian-rupee-sign"></i>
                                <span>{showOpening ? openingBalance?.toLocaleString('en-IN') : '••••••'}</span>
                            </div>
                        </div>
                        <div className='card-footer'>
                            <Link components="button" onClick={toggleOpening}>
                                View <i className="fa-solid fa-eye ms-2"></i>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className='col-sm-3'>
                    <div className='card dash_card'>
                        <div className='card-header'>
                            <div>
                                <h4>Closing Balance</h4>
                                <i className="fa-solid fa-folder"></i>
                            </div>
                        </div>
                        <div className='card-body'>
                            <div className='lg-text'>
                                <i className="fa-solid fa-indian-rupee-sign"></i>
                                <span>{showClosing ? closingBalance?.toLocaleString('en-IN') : '••••••'}</span>
                            </div>
                        </div>
                        <div className='card-footer'>
                            <Link components="button" onClick={toggleClosing}>
                                View <i className="fa-solid fa-eye ms-2"></i>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className='col-sm-3'>
                    <div className='card dash_card'>
                        <div className='card-header'>
                            <div>
                                <h4>Ledger</h4>
                                <i className="fa-solid fa-file"></i>
                            </div>
                        </div>
                        <div className='card-body'>
                            <div className='lg-text'>
                                {/* <i className="fa-solid fa-indian-rupee-sign"></i> */}
                                <span>{ledgerCount}</span>
                            </div>
                        </div>
                        <div className='card-footer'>
                            <Link to={adminRoute('/ledger')}>View
                                <i className="fa-solid fa-eye ms-2"></i>
                            </Link>
                        </div>
                    </div>
                </div>


                {/* Repeat for other 3 cards with different icons & content */}

            </div>

            {/* Transactions Table */}
            <div className="card theme-card border-0 shadow p-3 mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0 theme-text">Recent Transactions</h4>
                </div>
                <div className="table-responsive mt-2">
                    <table className="table table-bordered theme-table">
                        <thead className="table-dark">
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Account No.</th>
                                <th>Transaction Type</th>
                                <th>Amount (₹)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                                    <td>{tx?.accountId?.accountNumber}</td>
                                    <td>
                                        <span className={`badge ${tx.type === 'deposit' ? 'bg-success' :
                                            tx.type === 'loanDisbursed' ? 'bg-primary' :
                                                tx.type === 'loanRepayment' ? 'bg-warning text-dark' :
                                                    tx.type === 'transfer' ? 'bg-info text-dark' :
                                                        'bg-danger'
                                            }`}>
                                            {(() => {
                                                switch (tx.type) {
                                                    case 'deposit':
                                                        return 'Deposit / जमा';
                                                    case 'withdrawal':
                                                        return 'Withdrawal / निकासी';
                                                    case 'transfer':
                                                        return 'Transfer / ट्रांसफर';
                                                    case 'loanDisbursed':
                                                        return 'Loan Disbursed / ऋण वितरण';
                                                    case 'loanRepayment':
                                                        return 'Loan Repayment / ऋण भुगतान';
                                                    default:
                                                        return tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
                                                }
                                            })()}
                                        </span>
                                    </td>

                                    <td>₹{tx.amount.toLocaleString()}</td>
                                    <td>
                                        <span className={`badge ${tx?.accountId?.status === true ? "bg-success" :
                                            tx.accountId?.status === false ? "bg-warning text-dark" : "bg-danger"}`}>
                                            {tx?.accountId?.status === true ? "Active" :
                                                tx?.accountId?.status === false ? "Inactive" : "Failed"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
