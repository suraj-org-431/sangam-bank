import React, { useState, useEffect } from 'react';
import { upsertLedgerEntry } from '../../api/ledger';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminRoute } from '../../utils/router';

const transactionTypes = ['deposit', 'withdrawal', 'Interest'];

const initialParticulars = [
    'Office Equipment',
    'Utilities',
    'Rent',
    'Sales',
    'Services',
    'Office Supplies',
    'Salary',
    'Add new...'
];

const CreateOrEditLedger = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { ledgerData } = state || {};

    const [showCustomParticular, setShowCustomParticular] = useState(false);
    const [particularOptions, setParticularOptions] = useState(initialParticulars);
    const [formData, setFormData] = useState({
        date: '',
        particulars: '',
        transactionType: '',
        amount: '',
        balance: '',
        description: ''
    });

    useEffect(() => {
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        if (ledgerData) {
            setFormData({
                ...ledgerData,
                date: formatDate(ledgerData?.date),
            });
            if (
                ledgerData?.particulars &&
                !initialParticulars.includes(ledgerData.particulars)
            ) {
                setParticularOptions(prev => [...new Set([...prev, ledgerData.particulars])]);
            }

        } else {
            const today = formatDate(new Date());
            setFormData(prev => ({
                ...prev,
                date: today,
            }));
        }

    }, [ledgerData]);

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
            navigate(adminRoute('/ledger'));
        } catch (err) {
            toast.error(err.message || 'Failed to save');
        }
    };

    return (
        <div className="px-4 py-4">
            <div className="card p-3">
                <h4>{ledgerData ? 'Edit' : 'Create'} Ledger</h4>
                <form onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-4 mb-3">
                            <label className='theme-label text-black'>Date <span className="text-danger">*</span></label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className='theme-label text-black'>Particulars <span className="text-danger">*</span></label>
                            {!showCustomParticular ? (
                                <select
                                    name="particulars"
                                    className="form-select"
                                    value={formData.particulars || ''}
                                    onChange={handleParticularSelect}
                                    required
                                >
                                    <option value="">Select Particular</option>
                                    {particularOptions.map((item, idx) => (
                                        <option key={idx} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="particulars"
                                    className="form-control"
                                    value={formData.particulars}
                                    onChange={handleChange}
                                    placeholder="Enter new particular"
                                    required
                                />
                            )}
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className='theme-label text-black'>Transaction Type <span className="text-danger">*</span></label>
                            <select
                                name="transactionType"
                                value={formData.transactionType}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="">Select</option>
                                {transactionTypes.map(type => (
                                    <option key={type} value={type}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className='theme-label text-black'>Amount ($) <span className="text-danger">*</span></label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>

                        {/* <div className="col-md-4 mb-3">
                            <label className='theme-label text-black'>Balance ($)</label>
                            <input
                                type="number"
                                name="balance"
                                value={formData.balance}
                                onChange={handleChange}
                                className="form-control"
                            />
                        </div> */}

                        <div className="col-md-8 mb-3">
                            <label className='theme-label text-black'>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className="form-control"
                                rows={2}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div className="text-end">
                        <button className="btn btn-success" type="submit">
                            {ledgerData ? 'Update Entry' : 'Add Entry'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateOrEditLedger;
