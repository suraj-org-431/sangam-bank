import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createInterest, getConfig } from '../../api/config';
import CommonModal from '../../components/common/CommonModal';

const InterestTrigger = () => {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [interestRates, setInterestRates] = useState([]);

    useEffect(() => {
        const fetchInterestRates = async () => {
            try {
                const config = await getConfig();
                setInterestRates(config?.monthlyInterestRates || []);
            } catch (err) {
                toast.error('Failed to fetch interest configuration');
            }
        };

        fetchInterestRates();
    }, []);

    const handleApplyInterest = async () => {
        setLoading(true);
        try {
            const res = await createInterest(); // ✅ backend applies based on config
            toast.success(`Interest applied to ${res?.updatedCount} accounts`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to apply interest');
        } finally {
            setLoading(false);
            setShowModal(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <button
                className="btn btn-lg btn-success"
                onClick={() => setShowModal(true)}
                disabled={loading}
            >
                {loading ? 'Applying...' : 'Generate Monthly Interest'}
            </button>

            <CommonModal
                show={showModal}
                onHide={() => setShowModal(false)}
                title="Confirm Interest Application"
                body={
                    <div>
                        <p>Are you sure you want to apply monthly interest to all eligible accounts?</p>
                        <hr />
                        <div>
                            <p><strong>Current Interest Rates:</strong></p>
                            <ul className="mt-2 mb-0">
                                {interestRates.map((item, idx) => (
                                    <li key={idx}>
                                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}: <strong>{item.rate}%</strong>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                }
                onConfirm={handleApplyInterest}
                confirmText="Yes, Apply"
                cancelText="Cancel"
                loading={loading}
            />
        </div>
    );
};

export default InterestTrigger;
