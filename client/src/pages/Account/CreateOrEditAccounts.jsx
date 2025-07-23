import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateAccountNumber, upsertAccountDetails } from '../../api/account';
import { adminRoute } from '../../utils/router';
import { getConfig } from '../../api/config';
import { calculateMaturityAmount } from '../../utils/maturityCalculator';
import { calculateLoanDetails } from '../../utils/calculateLoanDetails';

const CreateAccounts = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { accountData } = location.state || {};
    const [loading, setLoading] = useState(false);
    const [interestRates, setInterestRates] = useState({});
    const [tenureOptions, setTenureOptions] = useState([]);
    const [maturityAmount, setMaturityAmount] = useState(0);
    const [loanDetails, setloanDetails] = useState('');

    const [formData, setFormData] = useState({
        accountType: '',
        tenure: '',
        branch: 'Shivadih',
        applicantName: '',
        gender: '',
        dob: '',
        occupation: '',
        phone: '',
        fatherOrHusbandName: '',
        relation: 'Father',
        address: {
            village: '',
            post: '',
            block: '',
            district: 'Hazaribagh',
            state: 'Jharkhand',
            pincode: ''
        },
        aadhar: '',
        depositAmount: '',
        introducerName: '',
        membershipNumber: '',
        introducerKnownSince: '',
        accountNumber: '',
        nomineeName: '',
        nomineeRelation: '',
        nomineeAge: '',
        managerName: '',
        lekhpalOrRokapal: '',
        formDate: '',
        accountOpenDate: '',
        profileImage: null,
        signature: null,
        verifierSignature: null,
        agreedToTerms: false,
        loanCategory: '',
        interestRate: '',
        interestAccType: '',
        paymentType: '',
        totalInterest: '',
        totalPayable: '',
        monthlyPayment: '',
        hasInsurance: 'yes',

    });

    useEffect(() => {
        const fetchConfig = async () => {
            const config = await getConfig();

            // Set interest rates and tenure options for loan
            if (Array.isArray(config?.loanInterestRates)) {
                const ratesMap = {};
                config.loanInterestRates.forEach(category => {
                    ratesMap[category.type] = category.rate;
                });
                setInterestRates(ratesMap);
            }

            if (Array.isArray(config?.loanDurations)) {
                setTenureOptions(config.loanDurations);
            }

            const { accountType, depositAmount, tenure, paymentType, interestRate } = formData;

            // For RD/FD/MIS
            if (['recurring', 'fixed', 'mis'].includes(accountType)) {
                const result = calculateMaturityAmount(
                    depositAmount,
                    tenure,
                    config,
                    accountType
                );
                setMaturityAmount(result.maturityAmount);
            }

            // For Loan EMI Calculation
            if (accountType === 'loan') {
                const principal = parseFloat(depositAmount);
                const rate = parseFloat(interestRate); // Annual interest rate in %
                const months = parseInt(tenure);
                const isSimpleInterest = paymentType === 's/i';

                const validPrincipal = !isNaN(principal);
                const validRate = !isNaN(rate);
                const validTenure = !isNaN(months) && months > 0;

                const result = calculateLoanDetails({
                    amount: Number(principal),
                    interestRate: Number(rate),
                    tenure: isSimpleInterest ? Infinity : Number(months),
                    paymentType
                });

                if (validPrincipal && validRate && (validTenure || isSimpleInterest)) {
                    if (result) {
                        setloanDetails(result);

                        setFormData(prev => ({
                            ...prev,
                            totalInterest: result?.totalInterest?.toFixed?.(2) || '',
                            totalPayable: result?.totalPayable?.toFixed?.(2) || '',
                            monthlyPayment: result?.monthlyPayment?.toFixed?.(2) || result?.monthlyInterest?.toFixed?.(2) || '',
                            tenure: isSimpleInterest ? '' : months
                        }));
                    }
                } else {
                    setFormData(prev => ({
                        ...prev,
                        totalInterest: '',
                        totalPayable: '',
                        monthlyPayment: '',
                        tenure: ''
                    }));
                }
            }
            else {
                setFormData(prev => ({
                    ...prev,
                    totalInterest: '',
                    totalPayable: '',
                    monthlyPayment: '',
                }));
            }
        };

        fetchConfig();
    }, [formData?.tenure, formData?.depositAmount, formData?.paymentType, formData?.interestRate]);


    useEffect(() => {
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        if (accountData) {
            setFormData(prev => ({
                ...prev,
                ...accountData,
                dob: formatDate(accountData?.dob),
                formDate: formatDate(accountData?.formDate),
                accountOpenDate: formatDate(accountData?.accountOpenDate),
            }));
        } else {
            const today = formatDate(new Date());
            setFormData(prev => ({
                ...prev,
                formDate: today,
                accountOpenDate: today,
            }));
        }

    }, [accountData]);

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        const val = type === 'checkbox'
            ? checked
            : type === 'file'
                ? files[0]
                : value.trimStart();

        if (name.startsWith('address.')) {
            const [, field] = name.split('.');
            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    [field]: val
                }
            }));
        }
        else if (name === 'loanCategory') {
            const selectedCategory = value;
            const rate = interestRates?.[selectedCategory] ?? '';
            setFormData(prev => ({
                ...prev,
                loanCategory: selectedCategory,
                interestRate: rate
            }));
        }
        else if (name === 'accountType') {
            let updatedFields = { accountType: value };
            if (value === 'fixed') {
                updatedFields.tenure = 84;
            }

            setFormData(prev => ({
                ...prev,
                ...updatedFields
            }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: val }));
        }
    };

    const validate = () => {
        const requiredFields = [
            'accountType',
            'branch',
            'applicantName',
            'gender',
            'dob',
            'phone',
            'fatherOrHusbandName',
            'aadhar',
            'depositAmount',
            'introducerName',
            'membershipNumber',
            'introducerKnownSince',
            'nomineeName',
            'nomineeRelation',
            'nomineeAge',
            'managerName',
            'formDate',
            'accountOpenDate'
        ];

        const fieldLabels = {
            accountType: 'Account Type',
            branch: 'Branch',
            applicantName: 'Applicant Name',
            gender: 'Gender',
            dob: 'Date of Birth',
            phone: 'Phone',
            fatherOrHusbandName: 'Father/Husband Name',
            relation: 'Relation',
            aadhar: 'Aadhar',
            depositAmount: 'Deposit Amount',
            introducerName: 'Introducer Name',
            membershipNumber: 'Membership Number',
            introducerKnownSince: 'Introducer Known Since',
            nomineeName: 'Nominee Name',
            nomineeRelation: 'Nominee Relation',
            nomineeAge: 'Nominee Age',
            managerName: 'Manager Name',
            lekhpalOrRokapal: 'Lekhpal or Rokapal',
            formDate: 'Form Date',
            accountOpenDate: 'Account Open Date'
        };

        for (let field of requiredFields) {
            if (!formData[field] || String(formData[field]).trim() === '') {
                toast.error(`Please fill ${fieldLabels[field] || field}`);
                return false;
            }
        }

        // Address fields validation
        const addressFields = ['village', 'post', 'block', 'district', 'state', 'pincode'];
        for (let field of addressFields) {
            if (!formData.address[field] || String(formData.address[field]).trim() === '') {
                toast.error(`Please fill address field: ${field}`);
                return false;
            }
        }

        // Phone number validations
        if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
            toast.error('Phone number must be 10 digits');
            return false;
        }


        if (!/^\d{12}$/.test(formData.aadhar.replace(/\D/g, ''))) {
            toast.error('Aadhar must be 12 digits');
            return false;
        }

        // Tenure check for RD accounts
        if (formData.accountType === 'RD' && (!formData.tenure || isNaN(formData.tenure))) {
            toast.error('Tenure is required and must be numeric for RD accounts');
            return false;
        }

        if (!formData.agreedToTerms) {
            toast.error('You must agree to the terms and conditions');
            return false;
        }

        return true;
    };

    const handleGenerateAccountNumber = async () => {
        try {
            const res = await generateAccountNumber(formData?.accountType);
            if (res?.accountNumber) {
                setFormData(prev => ({ ...prev, accountNumber: res.accountNumber }));
                toast.success('Account number generated');
            } else {
                toast.error('Failed to generate account number');
            }
        } catch (err) {
            console.log(err)
            toast.error('Error generating account number');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const formPayload = new FormData();

            const allowedKeys = [
                'accId', 'accountType', 'tenure', 'branch', 'applicantName',
                'gender', 'dob', 'occupation', 'phone', 'fatherOrHusbandName', 'relation',
                'aadhar', 'depositAmount', 'introducerName', 'membershipNumber',
                'introducerKnownSince', 'accountNumber', 'nomineeName', 'nomineeRelation',
                'nomineeAge', 'managerName', 'lekhpalOrRokapal', 'formDate',
                'accountOpenDate', 'address', 'signature', 'verifierSignature',
                'profileImage', 'loanCategory', 'interestRate', 'interestAccType', 'paymentType', 'hasInsurance'
            ];

            const cleanPayload = {
                accId: accountData?._id || '',
                ...formData,
                phone: formData.phone.replace(/\D/g, ''),
                depositAmount: Number(formData.depositAmount),
            };

            for (let key of allowedKeys) {
                const value = cleanPayload[key];
                if (key === 'address') {
                    formPayload.append('address', JSON.stringify(value));
                } else if (value instanceof File) {
                    formPayload.append(key, value);
                } else if (value !== null && value !== undefined) {
                    formPayload.append(key, value);
                }
            }
            await upsertAccountDetails(formPayload); // Update backend to accept multipart/form-data
            toast.success(accountData ? 'Account updated' : 'Account created');
            navigate(adminRoute('/accounts'));
        } catch (err) {
            toast.error(err?.message || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-wrapper px-4 py-4 theme-bg">
            <div className="card theme-card border-0 shadow p-3">
                <h4 className="theme-text mb-3">Create New Account / नया खाता बनाएं</h4>
                <form onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Upload Profile Image / प्रोफ़ाइल फोटो</label>
                             <div className='profile_image'><input
                                type="file"
                                accept="image/*"
                                name="profileImage"
                                onChange={handleChange}
                                className="form-control"
                            />
                            {formData?.profileImage && (
                                <div className="mt-2">
                                    <img
                                        src={URL.createObjectURL(formData?.profileImage)}
                                        alt="Profile Preview"
                                        width={150}
                                        style={{ borderRadius: '10px', objectFit: 'cover' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Account Type / खाता प्रकार</label>
                            <select name="accountType" value={formData.accountType} onChange={handleChange} className="form-select">
                                <option value="">Select / चुनें</option>
                                <option value="s/f">Saving Fund / बचत कोष</option>
                                <option value="recurring">RD / आवर्ती जमा</option>
                                <option value="fixed">fixed / सावधि जमा</option>
                                <option value="mis">mis / मासिक आय योजना</option>
                                <option value="loan">loan / ऋण</option>
                            </select>
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Insurance / बीमा</label>
                            <select
                                name="hasInsurance"
                                value={formData.hasInsurance}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="">Select / चुनें</option>
                                <option value="yes">Yes / हाँ</option>
                                <option value="no">No / नहीं</option>
                            </select>
                        </div>

                        {formData.accountType === 'loan' && (
                            <>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label text-black">loan Category / ऋण श्रेणी</label>
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
                                    <label className="form-label text-black">Payment Type / भुगतान प्रकार</label>
                                    <select
                                        name="paymentType"
                                        value={formData.paymentType}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="">Select / चुनें</option>
                                        <option value="s/i">Simple Interest / साधारण ब्याज</option>
                                        <option value="emi">EMI / ईएमआई (समान मासिक किस्त)</option>
                                    </select>
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label text-black">Interest Rate (%) / ब्याज दर</label>
                                    <input
                                        name="interestRate"
                                        type="number"
                                        className="form-control"
                                        value={formData.interestRate}
                                        readOnly
                                        disabled
                                    />
                                </div>
                            </>
                        )}

                        {formData.accountType === 'mis' && (
                            <>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label text-black">Interest Account Type / खाता प्रकार</label>
                                    <select name="interestAccType" value={formData.interestAccType} onChange={handleChange} className="form-select">
                                        <option value="">Select / चुनें</option>
                                        <option value="s/f">Saving Fund / बचत कोष</option>
                                        <option value="recurring">RD / आवर्ती जमा</option>
                                    </select>
                                </div>
                            </>
                        )}
                        {(
                            (formData.accountType === 'loan' && formData.paymentType === 'emi') ||
                            ['recurring', 'fixed', 'mis'].includes(formData.accountType)
                        ) && (
                                <div className="col-md-6 mb-3">
                                    <label className="form-label text-black">Tenure (months) / अवधि</label>
                                    <select
                                        name="tenure"
                                        className="form-control"
                                        value={formData.tenure}
                                        onChange={handleChange}
                                        required
                                        disabled={formData.accountType === 'fixed'}
                                    >
                                        <option value="">Select tenure</option>
                                        {(
                                            formData.accountType === 'loan' && formData.paymentType === 'emi'
                                                ? tenureOptions.filter(month => month <= 36)
                                                : tenureOptions
                                        ).map(month => (
                                            <option key={month} value={month}>
                                                {month} months
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">
                                {formData?.accountType === "loan"
                                    ? "loan Amount / ऋण राशि"
                                    : formData?.accountType === "recurring"
                                        ? "Monthly Installment / मासिक क़िस्त"
                                        : "Deposit Amount / जमा राशि"}
                            </label>
                            <input
                                name="depositAmount"
                                type="number"
                                value={formData.depositAmount}
                                onChange={handleChange}
                                className="form-control"
                                placeholder={
                                    formData?.accountType === "loan"
                                        ? "Enter loan amount"
                                        : formData?.accountType === "recurring"
                                            ? "Enter monthly installment"
                                            : "Enter deposit amount"
                                }
                            />
                            {['recurring', 'fixed', 'mis'].includes(formData.accountType) && (
                                <p className="bg-gray-100 p-4 rounded"><strong>Maturity Amount (परिपक्व राशि):</strong> ₹{maturityAmount}</p>
                            )}
                        </div>
                        {loanDetails && (
                            <div className="bg-gray-100 p-4 rounded">
                                {formData.paymentType === 's/i' && loanDetails.monthlyInterest ? (
                                    <>
                                        <p><strong>मासिक भुगतान (Monthly Payment):</strong> ₹{loanDetails.monthlyInterest.toFixed(2)}</p>
                                        <p>{loanDetails.message}</p>
                                    </>
                                ) : (
                                    <>
                                        <p><strong>कुल ब्याज (Total Interest):</strong>  ₹{loanDetails.totalInterest?.toFixed(2)}</p>
                                        <p><strong>मासिक भुगतान (Monthly Payment):</strong> ₹{loanDetails.monthlyPayment?.toFixed(2)}</p>
                                        <p><strong>कुल भुगतान (Total Payable):</strong> ₹{loanDetails.totalPayable?.toFixed(2)}</p>
                                    </>
                                )}
                            </div>
                        )}
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Branch / शाखा</label>
                            <input name="branch" value={formData.branch} onChange={handleChange} className="form-control" />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Applicant Name / पूरा नाम / श्रीमती / श्री</label>
                            <input name="applicantName" value={formData.applicantName} onChange={handleChange} className="form-control" required />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Gender / लिंग</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className="form-select">
                                <option value="">Select Gender / लिंग चुनें</option>
                                <option>Male / पुरुष</option>
                                <option>Female / महिला</option>
                                <option>Other / अन्य</option>
                            </select>
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">DOB / जन्म तिथि</label>
                            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="form-control" />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Occupation / व्यवसाय</label>
                            <input
                                name="occupation"
                                value={formData.occupation}
                                onChange={handleChange}
                                className="form-control"
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Phone / फ़ोन</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="form-control"
                                pattern="[0-9]{10}"
                                placeholder="Enter 10-digit phone number"
                            />
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Father/Husband Name / पिता/पति का नाम</label>
                            <input name="fatherOrHusbandName" value={formData.fatherOrHusbandName} onChange={handleChange} className="form-control" />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Relation / संबंध</label>
                            <select name="relation" value={formData.relation} onChange={handleChange} className="form-select">
                                <option value="">Select / चुनें</option>
                                <option>Father / पिता</option>
                                <option>Mother / माता</option>
                                <option>Spouse / पति/पत्नी</option>
                                <option>Brother / भाई</option>
                                <option>Sister / बहन</option>
                                <option>Son / पुत्र</option>
                                <option>Daughter / पुत्री</option>
                                <option>Other / अन्य</option>
                            </select>
                        </div>
                        {[
                            { field: 'village', label: 'Village / गांव' },
                            { field: 'post', label: 'Post / पोस्ट' },
                            { field: 'block', label: 'Block / प्रखंड' },
                            { field: 'district', label: 'District / जिला' },
                            { field: 'state', label: 'State / राज्य' },
                            { field: 'pincode', label: 'Pincode / पिनकोड' }
                        ].map(({ field, label }) => (
                            <div className="col-md-6 mb-3" key={field}>
                                <label className="form-label text-black">{label}</label>
                                <input
                                    name={`address.${field}`}
                                    value={formData.address[field]}
                                    onChange={handleChange}
                                    className="form-control"
                                />
                            </div>
                        ))}

                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Aadhar / आधार</label>
                            <input name="aadhar" value={formData.aadhar} onChange={handleChange} className="form-control" />
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Introducer Name / पहचानकर्ता का नाम</label>
                            <input name="introducerName" value={formData.introducerName} onChange={handleChange} className="form-control" />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Membership Number / सदस्य संख्या</label>
                            <input name="membershipNumber" value={formData.membershipNumber} onChange={handleChange} className="form-control" />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Introducer Known Since (Years) / पहचानकर्ता को कितने वर्षों से जानते हैं</label>
                            <input
                                type="number"
                                name="introducerKnownSince"
                                value={formData.introducerKnownSince}
                                onChange={handleChange}
                                className="form-control"
                                min="0"
                                placeholder="e.g. 10"
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Account Number / खाता संख्या</label>
                            <div className="input-group">
                                <input
                                    name="accountNumber"
                                    value={formData.accountNumber}
                                    onChange={handleChange}
                                    className="form-control"
                                    readOnly
                                    disabled
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={handleGenerateAccountNumber}
                                >
                                    Generate / उत्पन्न करें
                                </button>
                            </div>
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Nominee Name / नामांकित</label>
                            <input name="nomineeName" value={formData.nomineeName} onChange={handleChange} className="form-control" />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Nominee Relation / संबंध</label>
                            <select name="nomineeRelation" value={formData.nomineeRelation} onChange={handleChange} className="form-select">
                                <option value="">Select / चुनें</option>
                                <option>Father / पिता</option>
                                <option>Mother / माता</option>
                                <option>Spouse / पति/पत्नी</option>
                                <option>Brother / भाई</option>
                                <option>Sister / बहन</option>
                                <option>Son / पुत्र</option>
                                <option>Daughter / पुत्री</option>
                                <option>Other / अन्य</option>
                            </select>
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Nominee Age / आयु</label>
                            <input name="nomineeAge" type="number" value={formData.nomineeAge} onChange={handleChange} className="form-control" />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Manager Name / प्रबंधक का नाम</label>
                            <input
                                name="managerName"
                                value={formData.managerName}
                                onChange={handleChange}
                                className="form-control"
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Lekhpal / Rokapal Name / लेखपाल / रोकपाल का नाम</label>
                            <input
                                name="lekhpalOrRokapal"
                                value={formData.lekhpalOrRokapal}
                                onChange={handleChange}
                                className="form-control"
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Form Date / फॉर्म दिनांक</label>
                            <input name="formDate" type="date" value={formData.formDate} onChange={handleChange} className="form-control" />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Account Open Date / खाता खुलने की दिनांक</label>
                            <input name="accountOpenDate" type="date" value={formData.accountOpenDate} onChange={handleChange} className="form-control" />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Upload Signature 1 / हस्ताक्षर</label>
                            <input type="file" accept="image/*" name="signature" onChange={handleChange} className="form-control" />
                            {formData.signature && (
                                <div className="mt-2">
                                    <img src={URL.createObjectURL(formData.signature)} alt="Signature Preview" width={150} />
                                </div>
                            )}
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Upload Signature 2 / हस्ताक्षर</label>
                            <input type="file" accept="image/*" name="verifierSignature" onChange={handleChange} className="form-control" />
                            {formData.verifierSignature && (
                                <div className="mt-2">
                                    <img src={URL.createObjectURL(formData.verifierSignature)} alt="Signature Preview" width={150} />
                                </div>
                            )}
                        </div>

                        <div className="col-12 mt-2">
                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    name="agreedToTerms"
                                    checked={formData.agreedToTerms}
                                    onChange={handleChange}
                                />
                                <label className="form-check-label text-black">
                                    I agree to the terms and conditions / मैं नियम और शर्तों से सहमत हूं
                                </label>
                            </div>
                        </div>

                    </div>

                    <div className="text-end mt-3">
                        <button className="btn btn-success" type="submit" disabled={loading}>
                            {loading
                                ? (accountData ? 'Updating...' : 'Saving...')
                                : (accountData ? 'Update Account / खाता अपडेट करें' : 'Create Account / खाता बनाएं')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAccounts;
