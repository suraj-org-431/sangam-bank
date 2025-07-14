import React, { useEffect, useState } from 'react';
import { getConfig, updateConfig } from '../../api/config';
import { toast } from 'react-toastify';

const ConfigSettings = () => {
    const [config, setConfig] = useState({
        interestRates: [],
        charges: [],
        loanDurations: [],
        repaymentModes: [],
        penaltyPerDay: 0
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await getConfig();
            setConfig(res);
        } catch (err) {
            toast.error('Failed to load config');
        }
    };

    const handleSave = async () => {
        try {
            await updateConfig(config);
            toast.success('Config updated successfully');
        } catch (err) {
            toast.error('Failed to update config');
        }
    };

    const handleInterestRateChange = (index, field, value) => {
        const updated = [...config.interestRates];
        updated[index][field] = value;
        setConfig((prev) => ({ ...prev, interestRates: updated }));
    };

    const addInterestRate = () => {
        setConfig((prev) => ({
            ...prev,
            interestRates: [...prev.interestRates, { type: '', rate: 0 }]
        }));
    };

    const handleChargeChange = (index, field, value) => {
        const updated = [...config.charges];
        updated[index][field] = field === 'isPercentage' ? value === 'true' : value;
        setConfig((prev) => ({ ...prev, charges: updated }));
    };

    const addCharge = () => {
        setConfig((prev) => ({
            ...prev,
            charges: [...prev.charges, { name: '', amount: 0, isPercentage: true }]
        }));
    };

    return (
        <div className="px-4 py-4">
            <div className="card p-4">
                <h4 className="mb-3">System Configuration</h4>

                <h5>Interest Rates</h5>
                {config.interestRates.map((item, idx) => (
                    <div className="row mb-2" key={idx}>
                        <div className="col">
                            <input
                                type="text"
                                className="form-control"
                                value={item.type}
                                placeholder="Type (e.g., personal)"
                                onChange={(e) => handleInterestRateChange(idx, 'type', e.target.value)}
                            />
                        </div>
                        <div className="col">
                            <input
                                type="number"
                                className="form-control"
                                value={item.rate}
                                placeholder="Rate %"
                                onChange={(e) => handleInterestRateChange(idx, 'rate', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
                <button className="btn btn-sm btn-outline-primary mb-3" onClick={addInterestRate}>
                    + Add Rate
                </button>

                <h5>Charges</h5>
                {config.charges.map((item, idx) => (
                    <div className="row mb-2" key={idx}>
                        <div className="col">
                            <input
                                type="text"
                                className="form-control"
                                value={item.name}
                                placeholder="Charge Name"
                                onChange={(e) => handleChargeChange(idx, 'name', e.target.value)}
                            />
                        </div>
                        <div className="col">
                            <input
                                type="number"
                                className="form-control"
                                value={item.amount}
                                placeholder="Amount"
                                onChange={(e) => handleChargeChange(idx, 'amount', e.target.value)}
                            />
                        </div>
                        <div className="col">
                            <select
                                className="form-select"
                                value={item.isPercentage}
                                onChange={(e) => handleChargeChange(idx, 'isPercentage', e.target.value)}
                            >
                                <option value="true">% Based</option>
                                <option value="false">Fixed ₹</option>
                            </select>
                        </div>
                    </div>
                ))}
                <button className="btn btn-sm btn-outline-primary mb-3" onClick={addCharge}>
                    + Add Charge
                </button>

                <h5>Loan Durations (months)</h5>
                <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="e.g. 6, 12, 24"
                    value={config.loanDurations.join(',')}
                    onChange={(e) =>
                        setConfig((prev) => ({
                            ...prev,
                            loanDurations: e.target.value.split(',').map(Number)
                        }))
                    }
                />

                <h5>Repayment Modes</h5>
                <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="e.g. full, emi, custom"
                    value={config.repaymentModes.join(',')}
                    onChange={(e) =>
                        setConfig((prev) => ({
                            ...prev,
                            repaymentModes: e.target.value.split(',').map((x) => x.trim())
                        }))
                    }
                />

                <h5>Penalty per day (₹)</h5>
                <input
                    type="number"
                    className="form-control mb-3"
                    value={config.penaltyPerDay}
                    onChange={(e) =>
                        setConfig((prev) => ({ ...prev, penaltyPerDay: parseFloat(e.target.value) }))
                    }
                />

                <button className="btn btn-primary mt-3" onClick={handleSave}>
                    Save Config
                </button>
            </div>
        </div>
    );
};

export default ConfigSettings;
