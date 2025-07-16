import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateAccountNumber, upsertAccountDetails } from '../../api/account';
import { adminRoute } from '../../utils/router';
import { getConfig } from '../../api/config';

const CreateAccounts = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { accountData } = location.state || {};
    const [loading, setLoading] = useState(false);
    const [interestRates, setInterestRates] = useState({});
    const [tenureOptions, setTenureOptions] = useState([]);

    const [formData, setFormData] = useState({
        accountType: '',
        tenure: '',
        branch: '',
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
        loanType: '',
        interestRate: '',

    });

    useEffect(() => {
        const fetchConfig = async () => {
            const config = await getConfig();
            if (config?.loanInterestRates) {
                const ratesMap = {};
                config.loanInterestRates.forEach(rate => {
                    ratesMap[rate.type] = rate.rate;
                });
                setInterestRates(ratesMap);
            }
            if (Array.isArray(config.loanDurations)) {
                setTenureOptions(config.loanDurations);
            }
        };

        fetchConfig();
    }, []);

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
        const val = type === 'checkbox' ? checked
            : type === 'file' ? files[0]
                : value.trimStart();
        if (name.includes('address.')) {
            const [_, field] = name.split('.');
            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    [field]: val
                }
            }));
        }
        else if (name === 'loanType') {
            const rate = interestRates[value] || '';
            setFormData(prev => ({
                ...prev,
                loanType: value,
                interestRate: rate
            }));
            return;
        } else if (name === 'accountType') {
            let updatedFields = { accountType: value };
            if (value === 'MIS') {
                updatedFields.tenure = 72;
            }
            setFormData(prev => ({
                ...prev,
                ...updatedFields
            }));
            return;
        } else {
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
            const res = await generateAccountNumber();
            if (res?.accountNumber) {
                setFormData(prev => ({ ...prev, accountNumber: res.accountNumber }));
                toast.success('Account number generated');
            } else {
                toast.error('Failed to generate account number');
            }
        } catch (err) {
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
                'profileImage', 'loanType', 'interestRate'
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
                            <input
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
                                <option value="Recurring">RD / आवर्ती जमा</option>
                                <option value="Savings">Saving / बचत</option>
                                <option value="Fixed">Fixed / सावधि जमा</option>
                                <option value="MIS">MIS / मासिक आय योजना</option>
                                <option value="Loan">Loan / ऋण</option>
                            </select>
                        </div>
                        {formData.accountType === 'Loan' && (
                            <>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label text-black">Loan Type / ऋण प्रकार</label>
                                    <select
                                        name="loanType"
                                        value={formData.loanType}
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
                                    <label className="form-label text-black">Interest Rate (%) / ब्याज दर</label>
                                    <input
                                        name="interestRate"
                                        type="number"
                                        className="form-control"
                                        value={formData.interestRate}
                                        readOnly
                                    />
                                </div>
                            </>
                        )}
                        {['Recurring', 'Loan', 'MIS'].includes(formData.accountType) && (
                            <div className="col-md-6 mb-3">
                                <label className="form-label text-black">Tenure (months) / अवधि</label>
                                {formData.accountType === 'MIS' ? (
                                    <input
                                        type="number"
                                        name="tenure"
                                        className="form-control"
                                        value={72}
                                        readOnly
                                        disabled
                                    />
                                ) : (
                                    <select
                                        name="tenure"
                                        className="form-control"
                                        value={formData.tenure}
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
                            <input name="phone" value={formData.phone} onChange={handleChange} className="form-control" />
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
                            <label className="form-label text-black">
                                {formData?.accountType === "Loan"
                                    ? "Loan Amount / ऋण राशि"
                                    : formData?.accountType === "Recurring"
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
                                    formData?.accountType === "Loan"
                                        ? "Enter loan amount"
                                        : formData?.accountType === "Recurring"
                                            ? "Enter monthly installment"
                                            : "Enter deposit amount"
                                }
                            />
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

                        {/* <div className="col-md-6 mb-3">
                            <label className="form-label text-black">Account Number / खाता संख्या</label>
                            <input name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="form-control" />
                        </div> */}
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
