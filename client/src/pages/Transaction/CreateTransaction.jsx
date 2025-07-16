import React, { useState, useEffect } from 'react';
import { createTransaction } from '../../api/transaction';
import { searchAccounts } from '../../api/account';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminRoute } from '../../utils/router';

const allowedTransactionTypes = {
    Savings: ['deposit', 'withdrawal'],
    Current: ['deposit', 'withdrawal'],
    Fixed: ['deposit'],
    Recurring: ['deposit'],
    Loan: ['deposit'],
};

const CreateTransaction = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAccount, setSelectedAccount] = useState(null);

    const [formData, setFormData] = useState({
        accountId: '',
        type: '',
        amount: '',
        description: '',
        date: '',
        noteBreakdown: {
            2000: '',
            500: '',
            200: '',
            100: '',
            50: '',
            20: '',
            10: ''
        }
    });

    useEffect(() => {
        if (!formData.date) {
            const today = new Date().toISOString().split('T')[0];
            setFormData((prev) => ({ ...prev, date: today }));
        }
    }, [formData.date]);

    const isBlockedAccountType = (accountType) => {
        return ['MIS'].includes(accountType); // You can add more types if needed
    };

    const handleSearch = async () => {
        try {
            const res = await searchAccounts(searchQuery);
            if (res.length > 0) {
                const acc = res[0];
                setSelectedAccount(acc);
                if (!isBlockedAccountType(acc.accountType)) {
                    setFormData({
                        accountId: acc._id,
                        accountType: acc.accountType,
                        type: ['Fixed', 'Recurring', 'Loan'].includes(acc.accountType) ? 'deposit' : 'deposit',
                        amount: ['Fixed', 'Recurring'].includes(acc.accountType) ? acc.balance : acc?.accountType === 'Loan' ? acc?.loanDetails?.emiAmount : '',
                        description: '',
                        date: new Date().toISOString().split('T')[0],
                        noteBreakdown: {
                            2000: '',
                            500: '',
                            200: '',
                            100: '',
                            50: '',
                            20: '',
                            10: ''
                        }
                    });
                } else {
                    setFormData({
                        accountId: acc._id,
                        accountType: acc.accountType,
                        type: '',
                        amount: '',
                        description: '',
                        date: new Date().toISOString().split('T')[0],
                        noteBreakdown: {
                            2000: '',
                            500: '',
                            200: '',
                            100: '',
                            50: '',
                            20: '',
                            10: ''
                        }
                    });
                }
            } else {
                toast.error('No matching account found');
                setSelectedAccount(null);
            }
        } catch (err) {
            toast.error('Failed to search account');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { accountId, type, amount } = formData;
        if (!accountId || !type || !amount) {
            toast.error('All required fields must be filled');
            return;
        }

        const cleanedNotes = Object.fromEntries(
            Object.entries(formData.noteBreakdown)
                .filter(([_, val]) => parseInt(val) > 0)
                .map(([key, val]) => [key, parseInt(val)])
        );

        try {
            await createTransaction({
                ...formData,
                noteBreakdown: cleanedNotes
            });
            toast.success('Transaction created successfully');
            navigate(adminRoute('/transactions'));
        } catch (err) {
            console.error('❌ Transaction failed:', err);
            toast.error(err?.message || 'Failed to create transaction');
        }
    };

    const handleNoteChange = (denomination, value) => {
        const updatedNoteBreakdown = {
            ...formData.noteBreakdown,
            [denomination]: value
        };

        const total = Object.entries(updatedNoteBreakdown).reduce(
            (sum, [denom, count]) => sum + (parseInt(denom) * parseInt(count || 0)), 0
        );

        setFormData(prev => ({
            ...prev,
            noteBreakdown: updatedNoteBreakdown,
            amount: total
        }));
    };

    return (
        <div className="px-4 py-4">
            <div className="card p-3">
                <h4>New Transaction</h4>

                {/* 🔍 Search Section */}
                <div className="row align-items-end">
                    <div className="col-md-6">
                        <label className='text-black'>Search Account</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Name or Account No."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="col-md-2">
                        <button className="btn btn-lg btn-primary" onClick={handleSearch}>Search</button>
                    </div>
                </div>

                {/* 📋 Account Summary */}
                {selectedAccount && (
                    <>
                        <hr />
                        <div className="alert alert-info">
                            <strong>Customer Name - {selectedAccount.applicantName}</strong> <br />
                            <strong>Account Number - {selectedAccount.accountNumber}</strong><br />
                            <small>Type: {selectedAccount.accountType} | Balance: ₹{selectedAccount.balance}</small>
                        </div>
                    </>
                )}

                {/* 💵 Transaction Form */}
                {selectedAccount && !isBlockedAccountType(selectedAccount.accountType) ? (
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <label className='text-black'>Transaction Type *</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="form-select"
                                    required
                                    disabled={['Fixed', 'Recurring', 'Loan'].includes(selectedAccount?.accountType)}
                                >
                                    <option value="">Select</option>
                                    {allowedTransactionTypes[selectedAccount?.accountType]?.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4 mb-3">
                                <label className='text-black'>Amount *</label>
                                <input
                                    type="number"
                                    name="amount"
                                    className="form-control"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                    disabled={['Fixed', 'Recurring'].includes(selectedAccount.accountType)}
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <label className='text-black'>Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="form-control"
                                />
                            </div>
                            <div className="col-md-12">
                                <label className="text-black">Denomination-wise Notes (optional)</label>
                                <div className="row">
                                    {[2000, 500, 200, 100, 50, 20, 10].map((denom) => (
                                        <div className="col-md-2 mb-2" key={denom}>
                                            <div className="input-group">
                                                <span className="input-group-text">₹{denom}</span>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    min={0}
                                                    value={formData?.noteBreakdown[denom] || {}}
                                                    onChange={(e) => handleNoteChange(denom, e.target.value)}
                                                    placeholder="0"
                                                    disabled={['Fixed', 'Recurring'].includes(selectedAccount?.accountType)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-muted mt-2">
                                    <strong>
                                        Total Notes Value: ₹
                                        {
                                            Object.entries(formData.noteBreakdown).reduce(
                                                (total, [denom, count]) =>
                                                    total + (parseInt(denom) * parseInt(count || 0)), 0
                                            )
                                        }
                                    </strong>
                                </div>
                            </div>
                            <div className="col-md-12 mb-3">
                                <label className='text-black'>Remarks</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="Optional notes..."
                                />
                            </div>
                        </div>
                        {selectedAccount?.accountType !== 'Savings' && (
                            <div className="alert alert-warning mt-2">
                                {selectedAccount.accountType === 'Fixed' && "Only initial deposit allowed. Withdrawal requires special approval."}
                                {selectedAccount.accountType === 'Recurring' && "Only monthly/periodic deposits are allowed."}
                                {selectedAccount.accountType === 'Loan' && "Only repayment deposits (EMI) allowed. Withdrawals not permitted."}
                            </div>
                        )}
                        <div className="text-end">
                            <button className="btn btn-success" type="submit">Submit Transaction</button>
                        </div>
                    </form>
                ) : selectedAccount ? (
                    <div className="alert alert-danger mt-3">
                        ⚠️ Transactions are not allowed on <strong>{selectedAccount.accountType}</strong> accounts. These are locked until maturity.
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default CreateTransaction;
