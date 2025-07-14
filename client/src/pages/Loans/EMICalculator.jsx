import React, { useState } from 'react';

const EMICalculator = () => {
    const [principal, setPrincipal] = useState('');
    const [rate, setRate] = useState('');
    const [tenure, setTenure] = useState('');
    const [emi, setEmi] = useState(null);

    const calculateEMI = () => {
        const P = parseFloat(principal);
        const R = parseFloat(rate) / 100 / 12;
        const N = parseFloat(tenure);

        const emiValue = P * R * Math.pow(1 + R, N) / (Math.pow(1 + R, N) - 1);
        setEmi(emiValue.toFixed(2));
    };

    return (
        <div className="card p-4">
            <h4 className="mb-3">EMI Calculator</h4>
            <div className="row g-3">
                <div className="col-md-4">
                    <input
                        type="number"
                        className="form-control"
                        placeholder="Principal"
                        value={principal}
                        onChange={(e) => setPrincipal(e.target.value)}
                    />
                </div>
                <div className="col-md-4">
                    <input
                        type="number"
                        className="form-control"
                        placeholder="Rate (%)"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                    />
                </div>
                <div className="col-md-4">
                    <input
                        type="number"
                        className="form-control"
                        placeholder="Tenure (months)"
                        value={tenure}
                        onChange={(e) => setTenure(e.target.value)}
                    />
                </div>
            </div>
            <div className="mt-3">
                <button onClick={calculateEMI} className="btn btn-primary">Calculate EMI</button>
                {emi && <div className="mt-2">Monthly EMI: ₹{emi}</div>}
            </div>
        </div>
    );
};

export default EMICalculator;