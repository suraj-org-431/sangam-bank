import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getAccountDetailsByUser, payRecurringInstallment } from '../../api/account';
import { toast } from 'react-toastify';
import { FaUser, FaMoneyBill, FaFileAlt, FaMapMarkerAlt, FaImage, FaGavel } from 'react-icons/fa';
import CommonModal from '../../components/common/CommonModal';

const ViewAccount = () => {
    const location = useLocation();
    const { accountData } = location.state || {};
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPayModal, setShowPayModal] = useState(false);
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        if (accountData?._id) {
            getAccountDetailsByUser(accountData._id)
                .then((result) => setAccount(result))
                .catch(() => toast.error('Failed to load account'))
                .finally(() => setLoading(false));
        }
    }, []);

    const renderField = (label, value) => (
        <div className="col-md-6 mb-3" key={label}>
            <div className="bg-light border rounded p-3 h-100 shadow-sm">
                <small className="text-muted">{label}</small>
                <div className="fw-semibold fs-6">{value || '-'}</div>
            </div>
        </div>
    );

    const renderSection = (title, icon, children) => (
        <div className="mb-4">
            <h5 className="mb-3 border-bottom pb-2 d-flex align-items-center text-primary">
                {icon}<span className="ms-2">{title}</span>
            </h5>
            <div className="row">{children}</div>
        </div>
    );

    const renderImage = (label, path) => (
        <div className="col-md-4 mb-3 text-center" key={label}>
            <div className="card shadow-sm border-0 h-100">
                <div className="card-body py-3 px-3">
                    <h6 className="text-muted mb-2">{label}</h6>
                    <img
                        src={path || ''}
                        alt={label}
                        className="img-fluid rounded shadow"
                        style={{ maxHeight: 150, objectFit: 'contain' }}
                    />
                </div>
            </div>
        </div>
    );

    const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '-';

    const confirmInstallmentPayment = async () => {
        try {
            setIsPaying(true);
            await payRecurringInstallment(account._id);
            toast.success("Installment paid successfully");

            const updated = await getAccountDetailsByUser(account._id);
            setAccount(updated);
            setShowPayModal(false);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsPaying(false);
        }
    };

    if (loading) return <div className="text-center mt-5">Loading account details...</div>;
    if (!account) return <div className="text-muted text-center">No account details available.</div>;

    return (
        <div className="main-content py-4">
            <div className="container">
                <div className="card shadow border-0 p-4">
                    <h4 className="theme-text mb-4">Account Overview</h4>

                    {account?.accountType === 'Recurring' && (
                        <div className="text-end mb-4">
                            <button
                                className="btn btn-success"
                                onClick={() => setShowPayModal(true)}
                                disabled={isPaying}
                            >
                                💰 Pay Installment ₹{account.recurringDetails?.installmentAmount || 0}
                            </button>
                        </div>
                    )}

                    {/* Basic Info */}
                    {renderSection("Basic Information", <FaUser className="text-primary" />, [
                        renderField('Account Number', account.accountNumber),
                        renderField('Account Type', account.accountType),
                        renderField('Applicant Name', account.applicantName),
                        renderField('Gender', account.gender),
                        renderField('DOB', formatDate(account.dob)),
                        renderField('Phone', account.phone),
                        renderField('Occupation', account.occupation),
                        renderField('Branch', account.branch),
                        renderField('Status', account.status ? 'Active' : 'Inactive'),
                    ])}

                    {/* Address */}
                    {renderSection("Address", <FaMapMarkerAlt className="text-primary" />, [
                        renderField('Village', account.address?.village),
                        renderField('Post', account.address?.post),
                        renderField('Block', account.address?.block),
                        renderField('District', account.address?.district),
                        renderField('State', account.address?.state),
                        renderField('Pincode', account.address?.pincode),
                    ])}

                    {/* Financial Info */}
                    {renderSection("Financial Information", <FaMoneyBill className="text-primary" />, [
                        renderField('Deposit Amount', `₹${account.depositAmount}`),
                        renderField('Balance', `₹${account.balance}`),
                        renderField('Tenure (Months)', account.tenure),
                        renderField('Form Date', formatDate(account.formDate)),
                        renderField('Account Open Date', formatDate(account.accountOpenDate)),
                        renderField('Aadhar', account.aadhar),
                        renderField('Membership Number', account.membershipNumber),
                        renderField('Introducer Name', account.introducerName),
                        renderField('Introducer Known Since', account.introducerKnownSince),
                    ])}

                    {/* Nominee Info */}
                    {account.nomineeName && renderSection("Nominee Information", <FaUser className="text-primary" />, [
                        renderField('Nominee Name', account.nomineeName),
                        renderField('Nominee Relation', account.nomineeRelation),
                        renderField('Nominee Age', account.nomineeAge),
                    ])}

                    {/* Recurring Details */}
                    {account.accountType === 'Recurring' && account.recurringDetails &&
                        renderSection("Recurring Deposit", <FaMoneyBill className="text-primary" />, [
                            <div className="col-md-12 text-end mb-3" key="pay-button">
                                <button className="btn btn-primary" onClick={() => setShowPayModal(true)} disabled={isPaying}>
                                    Pay Installment
                                </button>
                            </div>,
                            renderField('Monthly Installment', `₹${account.recurringDetails.installmentAmount}`),
                            renderField('Completed Installments', account.recurringDetails.completedInstallments),
                            renderField('Total Fine', `₹${account.recurringDetails.fineTotal}`),
                            renderField('Maturity Date', formatDate(account.recurringDetails.maturityDate)),
                        ])
                    }

                    {/* Loan Details */}
                    {account.accountType === 'Loan' && account.loanDetails &&
                        renderSection("Loan Details", <FaGavel className="text-primary" />, [
                            renderField('Loan Amount', `₹${account.loanDetails.totalLoanAmount}`),
                            renderField('Disbursed Amount', `₹${account.loanDetails.disbursedAmount}`),
                            renderField('Interest Rate', `${account.loanDetails.interestRate}%`),
                            renderField('Tenure Months', account.loanDetails.tenureMonths),
                            renderField('EMI Amount', `₹${account.loanDetails.emiAmount}`),
                            renderField('Status', account.loanDetails.status),
                            renderField('Disbursed Date', formatDate(account.loanDetails.disbursedDate)),
                            renderField('Next Due Date', formatDate(account.loanDetails.nextDueDate)),
                        ])
                    }

                    {/* Signatures & Images */}
                    {renderSection("Documents", <FaImage className="text-primary" />, [
                        renderImage('Profile Image', account.profileImage),
                        renderImage('Signature', account.signaturePath),
                        renderImage('Verifier Signature', account.verifierSignaturePath),
                    ])}

                    {/* Meta Info */}
                    {renderSection("Timestamps", <FaFileAlt className="text-primary" />, [
                        renderField('Created At', formatDate(account.createdAt)),
                        renderField('Last Updated', formatDate(account.updatedAt)),
                    ])}
                </div>
            </div>
            <CommonModal
                show={showPayModal}
                onHide={() => setShowPayModal(false)}
                title="Confirm Payment"
                body={`Are you sure you want to pay ₹${account?.recurringDetails?.installmentAmount || 0} for this installment?`}
                emoji="💸"
                confirmText="Pay Now"
                cancelText="Cancel"
                confirmVariant="success"
                onConfirm={confirmInstallmentPayment}
            />

        </div>
    );
};

export default ViewAccount;
