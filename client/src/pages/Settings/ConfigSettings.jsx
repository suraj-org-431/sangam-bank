import React, { useEffect, useState } from 'react';
import { getConfig, updateConfig } from '../../api/config';
import { toast } from 'react-toastify';

const ConfigSettings = () => {
    const [config, setConfig] = useState({
        monthlyInterestRates: [],
        loanInterestRates: [],
        charges: [],
        penaltyCharges: {
            rdMissedDeposit: 0,
            loanMissedEmi: 0,
            penaltyPerDay: 0
        },
        initialDeposits: {
            's/f': 0,
            recurring: 0,
            fixed: 0
        },
        loanDurations: [],
        repaymentModes: []
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

    const handleInterestRateChange = (listName, index, field, value) => {
        const updated = [...config[listName]];
        updated[index][field] = value;
        setConfig((prev) => ({ ...prev, [listName]: updated }));
    };

    const addInterestRate = (listName) => {
        setConfig((prev) => ({
            ...prev,
            [listName]: [...prev[listName], { type: '', rate: 0 }]
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

                <h5>Monthly Interest Rates</h5>
                {config.monthlyInterestRates.map((item, idx) => (
                    <div className="row mb-2" key={idx}>
                        <div className="col">
                            <input
                                type="text"
                                className="form-control"
                                value={item.type}
                                placeholder="Type (e.g., Recurring, MIS)"
                                onChange={(e) => handleInterestRateChange('monthlyInterestRates', idx, 'type', e.target.value)}
                            />
                        </div>
                        <div className="col">
                            <input
                                type="number"
                                className="form-control"
                                value={item.rate}
                                placeholder="Rate %"
                                onChange={(e) => handleInterestRateChange('monthlyInterestRates', idx, 'rate', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
                <button className="btn btn-sm btn-outline-primary mb-3" onClick={() => addInterestRate('monthlyInterestRates')}>
                    + Add Monthly Rate
                </button>

                <h5>Loan Interest Rates</h5>
                {config.loanInterestRates.map((item, idx) => (
                    <div className="row mb-2" key={idx}>
                        <div className="col">
                            <input
                                type="text"
                                className="form-control"
                                value={item.type}
                                placeholder="Loan Type (e.g., personal)"
                                onChange={(e) => handleInterestRateChange('loanInterestRates', idx, 'type', e.target.value)}
                            />
                        </div>
                        <div className="col">
                            <input
                                type="number"
                                className="form-control"
                                value={item.rate}
                                placeholder="Rate %"
                                onChange={(e) => handleInterestRateChange('loanInterestRates', idx, 'rate', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
                <button className="btn btn-sm btn-outline-primary mb-3" onClick={() => addInterestRate('loanInterestRates')}>
                    + Add Loan Rate
                </button>

                <h5>Penalty Charges</h5>
                <div className="row mb-2">
                    <div className="col">
                        <label className="text-black">RD Missed Deposit (₹)</label>
                        <input
                            type="number"
                            className="form-control"
                            value={config.penaltyCharges.rdMissedDeposit}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                penaltyCharges: { ...prev.penaltyCharges, rdMissedDeposit: parseFloat(e.target.value) }
                            }))}
                        />
                    </div>
                    <div className="col">
                        <label className="text-black">Loan Missed EMI (₹)</label>
                        <input
                            type="number"
                            className="form-control"
                            value={config.penaltyCharges.loanMissedEmi}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                penaltyCharges: { ...prev.penaltyCharges, loanMissedEmi: parseFloat(e.target.value) }
                            }))}
                        />
                    </div>
                    <div className="col">
                        <label className="text-black">Penalty Per Day (₹)</label>
                        <input
                            type="number"
                            className="form-control"
                            value={config.penaltyCharges.penaltyPerDay}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                penaltyCharges: { ...prev.penaltyCharges, penaltyPerDay: parseFloat(e.target.value) }
                            }))}
                        />
                    </div>
                </div>

                <h5>Fine Configuration</h5>
                <div className="form-check form-switch mb-2">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={config.fineAffectsBalance || false}
                        onChange={(e) =>
                            setConfig((prev) => ({ ...prev, fineAffectsBalance: e.target.checked }))
                        }
                        id="fineAffectsBalanceSwitch"
                    />
                    <label className="form-check-label text-black" htmlFor="fineAffectsBalanceSwitch">
                        Fine Affects Balance
                    </label>
                </div>

                <div className="row mb-3">
                    <div className="col">
                        <label className="text-black">Enable Auto Fine</label>
                        <select
                            className="form-select"
                            value={config.fineConfig?.enableAutoFine ? 'true' : 'false'}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    fineConfig: {
                                        ...prev.fineConfig,
                                        enableAutoFine: e.target.value === 'true'
                                    }
                                }))
                            }
                        >
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
                        </select>
                    </div>
                    <div className="col">
                        <label className="text-black">Grace Period (days)</label>
                        <input
                            type="number"
                            className="form-control"
                            value={config.fineConfig?.graceDays || 0}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    fineConfig: {
                                        ...prev.fineConfig,
                                        graceDays: parseInt(e.target.value)
                                    }
                                }))
                            }
                        />
                    </div>
                    <div className="col">
                        <label className="text-black">Fine Description</label>
                        <input
                            type="text"
                            className="form-control"
                            value={config.fineConfig?.fineDescription || ''}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    fineConfig: {
                                        ...prev.fineConfig,
                                        fineDescription: e.target.value
                                    }
                                }))
                            }
                        />
                    </div>
                </div>

                <h5 className="mt-4">Fine Rules (Per Account Type)</h5>
                {config.fineRules?.map((rule, idx) => (
                    <div className="row mb-2" key={idx}>
                        <div className="col">
                            <input
                                type="text"
                                className="form-control"
                                value={rule.accountType}
                                placeholder="Account Type (e.g., Recurring)"
                                onChange={(e) => {
                                    const updated = [...config.fineRules];
                                    updated[idx].accountType = e.target.value;
                                    setConfig((prev) => ({ ...prev, fineRules: updated }));
                                }}
                            />
                        </div>
                        <div className="col">
                            <input
                                type="text"
                                className="form-control"
                                value={rule.ruleName}
                                placeholder="Rule Name"
                                onChange={(e) => {
                                    const updated = [...config.fineRules];
                                    updated[idx].ruleName = e.target.value;
                                    setConfig((prev) => ({ ...prev, fineRules: updated }));
                                }}
                            />
                        </div>
                        <div className="col">
                            <input
                                type="number"
                                className="form-control"
                                value={rule.fineAmount}
                                placeholder="Fine ₹"
                                onChange={(e) => {
                                    const updated = [...config.fineRules];
                                    updated[idx].fineAmount = parseFloat(e.target.value);
                                    setConfig((prev) => ({ ...prev, fineRules: updated }));
                                }}
                            />
                        </div>
                        <div className="col">
                            <input
                                type="number"
                                className="form-control"
                                value={rule.appliesAfterDays}
                                placeholder="Grace Days"
                                onChange={(e) => {
                                    const updated = [...config.fineRules];
                                    updated[idx].appliesAfterDays = parseInt(e.target.value);
                                    setConfig((prev) => ({ ...prev, fineRules: updated }));
                                }}
                            />
                        </div>
                        <div className="col">
                            <select
                                className="form-select"
                                value={rule.affectsBalance}
                                onChange={(e) => {
                                    const updated = [...config.fineRules];
                                    updated[idx].affectsBalance = e.target.value === 'true';
                                    setConfig((prev) => ({ ...prev, fineRules: updated }));
                                }}
                            >
                                <option value="true">Affects Balance</option>
                                <option value="false">No Deduction</option>
                            </select>
                        </div>
                    </div>
                ))}
                <button
                    className="btn btn-sm btn-outline-primary mb-3"
                    onClick={() =>
                        setConfig((prev) => ({
                            ...prev,
                            fineRules: [...(prev.fineRules || []), {
                                accountType: '',
                                ruleName: '',
                                fineAmount: 0,
                                appliesAfterDays: 0,
                                affectsBalance: true,
                                ledgerDescription: ''
                            }]
                        }))
                    }
                >
                    + Add Fine Rule
                </button>

                <h5>Other Charges</h5>
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

                {/* ✅ Initial Deposits Section */}
                <h5>Initial Deposits (₹)</h5>
                <div className="row mb-2">
                    <div className="col">
                        <label className="text-black">Savings Fund (S/F)</label>
                        <input
                            type="number"
                            className="form-control"
                            value={config.initialDeposits?.[`s/f`] || 0}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    initialDeposits: {
                                        ...prev.initialDeposits,
                                        's/f': parseFloat(e.target.value)
                                    }
                                }))
                            }
                        />
                    </div>
                    <div className="col">
                        <label className="text-black">Recurring</label>
                        <input
                            type="number"
                            className="form-control"
                            value={config.initialDeposits?.recurring || 0}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    initialDeposits: {
                                        ...prev.initialDeposits,
                                        recurring: parseFloat(e.target.value)
                                    }
                                }))
                            }
                        />
                    </div>
                    <div className="col">
                        <label className="text-black">Fixed</label>
                        <input
                            type="number"
                            className="form-control"
                            value={config.initialDeposits?.fixed || 0}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    initialDeposits: {
                                        ...prev.initialDeposits,
                                        fixed: parseFloat(e.target.value)
                                    }
                                }))
                            }
                        />
                    </div>
                </div>

                <button className="btn btn-primary mt-3" onClick={handleSave}>
                    Save Config
                </button>
            </div>
        </div>
    );
};

export default ConfigSettings;