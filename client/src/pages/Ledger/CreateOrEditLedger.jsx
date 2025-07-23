import React, { useState, useEffect, useRef } from 'react';
import { upsertLedgerEntry } from '../../api/ledger';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminRoute } from '../../utils/router';

const ledgerParticularOptions = [
    "Interest Payout",
    "Salary Payment",
    "Office Expenses",
    "Adjustment Entry",
    "Cash in Hand Adjustment",
    "Add new..."
];

const transactionTypes = [
    { value: "deposit", label: "Deposit / जमा" },
    { value: "withdrawal", label: "Withdrawal / निकासी" },
    { value: "adjustment", label: "Adjustment / समायोजन" },
];

const CreateOrEditLedger = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { ledgerData } = state || {};

    const [showCustomParticular, setShowCustomParticular] = useState(false);
    const [particularOptions, setParticularOptions] = useState(ledgerParticularOptions);
    const [formData, setFormData] = useState({
        date: '',
        particulars: '',
        transactionType: '',
        amount: '',
        balance: '',
        description: ''
    });

    const customInputRef = useRef(null);

    useEffect(() => {
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toISOString().split('T')[0];
        };

        if (ledgerData) {
            setFormData({
                ...ledgerData,
                date: formatDate(ledgerData.date)
            });

            if (
                ledgerData.particulars &&
                !ledgerParticularOptions.includes(ledgerData.particulars)
            ) {
                setParticularOptions(prev =>
                    [...new Set([...prev.filter(p => p !== 'Add new...'), ledgerData.particulars, 'Add new...'])]
                );
            }
        } else {
            setFormData(prev => ({
                ...prev,
                date: formatDate(new Date())
            }));
        }
    }, [ledgerData]);

    useEffect(() => {
        if (showCustomParticular && customInputRef.current) {
            customInputRef.current.focus();
        }
    }, [showCustomParticular]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleParticularSelect = (e) => {
        const value = e.target.value;
        if (value === 'Add new...') {
            setShowCustomParticular(true);
            setFormData(prev => ({ ...prev, particulars: '' }));
        } else {
            setShowCustomParticular(false);
            setFormData(prev => ({ ...prev, particulars: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { date, particulars, transactionType, amount } = formData;

        if (!date || !particulars || !transactionType || !amount) {
            toast.error("All required fields must be filled");
            return;
        }

        try {
            await upsertLedgerEntry(formData);
            toast.success(`Ledger ${ledgerData ? 'updated' : 'created'} successfully`);
            navigate(adminRoute('/ledger-report'));
        } catch (err) {
            toast.error(err.message || 'Failed to save');
        }
    };

    return (
        <div className="px-4 py-4">
            <div className="card p-4 shadow-sm border-0">
                <h4 className="mb-4 text-primary">{ledgerData ? 'Edit' : 'Create'} Ledger</h4>
                <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label text-black">Date <span className="text-danger">*</span></label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>

                        <div className="col-md-4">
                            <label className="form-label text-black">Particulars <span className="text-danger">*</span></label>
                            {!showCustomParticular ? (
                                <select
                                    name="particulars"
                                    className="form-select"
                                    value={formData.particulars}
                                    onChange={handleParticularSelect}
                                    required
                                >
                                    <option value="">-- Select Particular --</option>
                                    {particularOptions.map((item, idx) => (
                                        <option key={idx} value={item}>{item}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="particulars"
                                    className="form-control"
                                    value={formData.particulars}
                                    onChange={handleChange}
                                    ref={customInputRef}
                                    placeholder="Enter new particular"
                                    required
                                />
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label text-black">Transaction Type <span className="text-danger">*</span></label>
                            <select
                                name="transactionType"
                                value={formData.transactionType}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="">-- Select Type --</option>
                                {transactionTypes.map(txnT => (
                                    <option key={txnT?.value} value={txnT?.value}>
                                        {txnT?.value.charAt(0).toUpperCase() + txnT?.label.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-4">
                            <label className="form-label text-black">Amount ₹ <span className="text-danger">*</span></label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div className="col-md-8">
                            <label className="form-label text-black">Remarks</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className="form-control"
                                rows={2}
                                placeholder="Optional notes or references"
                            />
                        </div>
                    </div>

                    <div className="text-end mt-4">
                        <button className="btn btn-success px-4" type="submit">
                            {ledgerData ? 'Update Ledger' : 'Save Ledger'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateOrEditLedger;
