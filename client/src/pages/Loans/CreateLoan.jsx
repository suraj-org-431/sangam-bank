import React, { useState, useEffect } from 'react';
import { createLoan } from '../../api/loan';
import { searchAccounts } from '../../api/account';
import { getConfig } from '../../api/config';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminRoute } from '../../utils/router';

const CreateLoan = () => {
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [tenureOptions, setTenureOptions] = useState([]);
    const [formData, setFormData] = useState({
        borrowerId: '',
        loanAmount: '',
        interestRate: '',
        tenureMonths: '',
        remarks: '',
        loanType: 'personal',
        loanCategory: 'fixed'
    });

    // 🔁 Fetch interest rate + tenure from config based on loanType
    useEffect(() => {
        const fetchLoanDefaults = async () => {
            try {
                const config = await getConfig();
                // 🔁 interest rate by loan type
                const found = config?.loanInterestRates?.find(item => item.type === formData.loanType);
                setFormData(prev => ({
                    ...prev,
                    interestRate: found?.rate ?? ''
                }));

                // 🔁 tenure options
                if (Array.isArray(config.loanDurations)) {
                    setTenureOptions(config.loanDurations);
                }
            } catch (err) {
                console.error('Config load failed:', err);
                toast.error('Failed to load loan configuration');
            }
        };

        fetchLoanDefaults();
    }, [formData.loanType]);

    // 🔍 Search Account
    const handleSearch = async () => {
        try {
            const res = await searchAccounts(searchQuery);
            if (res.length > 0) {
                const acc = res[0];
                setSelectedAccount(acc);
                setFormData(prev => ({
                    ...prev,
                    borrowerId: acc._id
                }));
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
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { borrowerId, loanAmount, loanType, interestRate, tenureMonths } = formData;

        if (!borrowerId || !loanAmount || !loanType || !interestRate || !tenureMonths) {
            toast.error('All required fields must be filled');
            return;
        }

        try {
            await createLoan(formData);
            toast.success('Loan created successfully');
            navigate(adminRoute('/loans'));
        } catch (err) {
            console.error('❌ Loan creation failed:', err);
            toast.error(err?.message || 'Failed to create loan');
        }
    };

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <h4>Create New Loan</h4>

                {/* 🔍 Borrower Search */}
                <div className="row align-items-end">
                    <div className="col-md-6 mb-3">
                        <label className="text-black">Search Borrower</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Name or Account No."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="col-md-2 mb-3">
                        <button className="btn btn-lg btn-primary" onClick={handleSearch}>
                            Search
                        </button>
                    </div>
                </div>

                {/* 👤 Borrower Info */}
                {selectedAccount && (
                    <>
                        <hr />

                        <div className='row'>
                            <div className='col-md-3'>
                                <div className='alert alert-warning bank_info'>
                                    <label className='text-black border-bottom mb-2 text-muted'>Customer Name</label>
                                    <div> <i class="fa-solid fa-user me-2"></i>
                                        <b>{selectedAccount.applicantName}</b></div>
                                </div>
                            </div>
                            <div className='col-md-3'>
                                <div className='alert alert-warning bank_info'>
                                    <label className='text-black border-bottom mb-2 text-muted'>Account Number</label>
                                    <div> <i class="fa-solid fa-building-columns me-2"></i>
                                        <b>{selectedAccount.accountNumber}</b></div>
                                </div>
                            </div>
                            <div className='col-md-3'>
                                <div className='alert alert-warning bank_info'>
                                    <label className='text-black border-bottom mb-2 text-muted'>Account Type</label>
                                    <div><i class="fa-solid fa-layer-group me-2"></i>
                                        <b>{selectedAccount.accountType}</b></div>
                                </div>
                            </div>

                            <div className='col-md-3'>
                                <div className='alert alert-warning bank_info'>
                                    <label className='text-black border-bottom mb-2 text-muted'>Balance</label>
                                    <div><i class="fa-solid fa-indian-rupee-sign me-2"></i>
                                        <b>{selectedAccount.balance}</b></div>
                                </div>

                            </div>

                        </div>
                    </>
                )}

                {/* 📝 Loan Form */}
                {selectedAccount && (
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <label className="text-black">Loan Amount (₹) *</label>
                                <input
                                    type="number"
                                    name="loanAmount"
                                    className="form-control"
                                    value={formData.loanAmount}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label text-black">Loan Category / ऋण श्रेणी</label>
                                <select
                                    name="loanCategory"
                                    value={formData.loanCategory}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="">Select / चुनें</option>
                                    <option value="personal">Personal / व्यक्तिगत</option>
                                    <option value="education">Education / शिक्षा</option>
                                    <option value="gold">Gold / सोना</option>
                                    <option value="vehicle">Vehicle / वाहन</option>
                                    <option value="home">Home / आवास</option>
                                    <option value="business">Business / व्यवसाय</option>
                                </select>
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label text-black">Loan Type / ऋण प्रकार</label>
                                <select
                                    name="loanType"
                                    value={formData.loanType}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="">Select / चुनें</option>
                                    <option value="fixed">Fixed / निश्चित</option>
                                    <option value="flexible">Flexible / लचीला</option>
                                </select>
                            </div>
                            <div className="col-md-4 mb-3">
                                <label className="text-black">Interest Rate (%) *</label>
                                <input
                                    type="number"
                                    name="interestRate"
                                    className="form-control"
                                    value={formData.interestRate}
                                    readOnly
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <label className="text-black">Tenure (Months) *</label>
                                <select
                                    name="tenureMonths"
                                    className="form-control"
                                    value={formData.tenureMonths}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select tenure</option>
                                    {tenureOptions.map(month => (
                                        <option key={month} value={month}>
                                            {month} months
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-8 mb-3">
                                <label className="text-black">Remarks</label>
                                <textarea
                                    name="remarks"
                                    className="form-control"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    placeholder="Optional remarks..."
                                />
                            </div>
                        </div>
                        <div className="text-end">
                            <button type="submit" className="btn btn-success">Submit Loan</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CreateLoan;
