export const calculateMaturityAmount = (
    installmentAmount,
    tenure,
    config,
    accountType
) => {
    const type = accountType.toLowerCase();

    let rateObj;
    if (type === 'loan') {
        rateObj = config.loanInterestRates?.find(
            (rate) => rate.type?.toLowerCase() === type
        );
    }
    else {
        rateObj = config.monthlyInterestRates?.find(
            (rate) => rate.type?.toLowerCase() === type
        );
    }
    if (!rateObj?.rate) {
        throw new Error(`Interest rate not found for account type: ${accountType}`);
    }

    const monthlyRate = Number(rateObj.rate);
    const r = monthlyRate * 12; // convert to annual

    const P = Number(installmentAmount);
    const n = Number(tenure);

    let maturityAmount = 0;
    let interest = 0;

    if (type === "recurring") {
        interest = (P * n * (n + 1) * r) / (2 * 12 * 100);
        maturityAmount = Math.round(P * n + interest);
    } else if (type === "mis") {
        interest = (P * r * n) / (12 * 100);
        maturityAmount = Math.round(P + interest);
    } else if (type === "fixed") {
        const fixedTenure = 84;
        if (n !== fixedTenure) {
            throw new Error("Fixed Deposit tenure must be exactly 84 months.");
        }
        maturityAmount = Math.round(2 * P);
        interest = maturityAmount - P;
    } else {
        throw new Error(`Unsupported account type: ${accountType}`);
    }

    return {
        maturityAmount,
        interestRate: r,
        totalInterest: Math.round(interest),
    };
};
