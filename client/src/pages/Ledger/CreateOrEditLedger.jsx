import React, { useState, useEffect, useRef } from 'react';
import { upsertLedgerEntry } from '../../api/ledger';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminRoute } from '../../utils/router';

const chargeTypes = [
    { value: 'interestPayout', label: 'Interest Payout' },
    { value: 'salaryPayment', label: 'Salary Payment' },
    { value: 'officeExpenses', label: 'Office Expenses' },
    { value: 'cashInHand', label: 'Cash in Hand Adjustment' },
    { value: 'processingFee', label: 'Processing Fee' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'fine', label: 'Fine' },
    { value: 'serviceCharge', label: 'Service Charge' },
    { value: 'interest', label: 'Interest' },
    { value: 'loanInterest', label: 'Loan Interest' },
    { value: 'other', label: 'Other' },
    { value: 'addNew', label: '"Add new..."' }
];

const CreateOrEditCharge = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { chargeData } = state || {};
    const [showCustomParticular, setShowCustomParticular] = useState(false);

    const customInputRef = useRef(null);

    const [formData, setFormData] = useState({
        type: '',
        label: '',
        amount: '',
        chargedDate: '',
        notes: ''
    });

    useEffect(() => {
        if (chargeData) {
            const formattedDate = new Date(chargeData.chargedDate).toISOString().split('T')[0];
            setFormData({ ...chargeData, chargedDate: formattedDate });
        } else {
            setFormData(prev => ({
                ...prev,
                chargedDate: new Date().toISOString().split('T')[0]
            }));
        }
    }, [chargeData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTypeSelect = (e) => {
        const value = e.target.value;
        if (value === 'addNew') {
            setShowCustomParticular(true);
            setFormData(prev => ({ ...prev, type: '' }));
        } else {
            setShowCustomParticular(false);
            setFormData(prev => ({ ...prev, type: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { type, label, amount, chargedDate, notes } = formData;

        if (!type || !label || !amount || !chargedDate) {
            toast.error("All required fields must be filled");
            return;
        }

        try {
            await upsertLedgerEntry(formData);
            toast.success(`Charge ${chargeData ? 'updated' : 'created'} successfully`);
            navigate(adminRoute('/ledger'));
        } catch (err) {
            toast.error(err.message || 'Failed to save charge');
        }
    };

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <h4 className="mb-4 text-primary">{chargeData ? 'Edit' : 'Create'} Account Ledger</h4>
                <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="theme-label text-black">Date <span className="text-danger">*</span></label>
                            <input
                                type="date"
                                name="chargedDate"
                                value={formData.chargedDate}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />
                        </div>

                        <div className="col-md-4">
                            <label className="theme-label text-black">Charge Type <span className="text-danger">*</span></label>
                            {!showCustomParticular ? (
                                <select
                                    name="particulars"
                                    className="form-select"
                                    value={formData.type}
                                    onChange={handleTypeSelect}
                                    required
                                >
                                    <option value="">-- Select Type --</option>
                                    {chargeTypes.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="particulars"
                                    className="form-control"
                                    value={formData.type}
                                    onChange={handleChange}
                                    ref={customInputRef}
                                    placeholder="Enter new particular"
                                    required
                                />
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="theme-label text-black">Amount ₹ <span className="text-danger">*</span></label>
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

                        <div className="col-md-6">
                            <label className="theme-label text-black">Label <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="label"
                                value={formData.label}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="e.g. Processing Fee for FD"
                                required
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="theme-label text-black">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                className="form-control"
                                rows={2}
                                placeholder="Optional remarks"
                            />
                        </div>
                    </div>

                    <div className="text-end mt-4">
                        <button className="btn btn-success px-4" type="submit">
                            {chargeData ? 'Update Charge' : 'Save Charge'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default CreateOrEditCharge;
