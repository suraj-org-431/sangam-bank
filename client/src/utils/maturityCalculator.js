export const calculateMaturityAmount = (
    installmentAmount,
    tenure,
    config,
    accountType
) => {
    if (!installmentAmount || !tenure || !config || !accountType) {
        throw new Error("Missing required parameters");
    }

    let interestRate;
    const type = accountType.toLowerCase();

    // Get interest rate from config based on accountType
    const rateObj = config.monthlyInterestRates?.find(
        (rate) => rate.type?.toLowerCase() === type
    );
    interestRate = rateObj?.rate;

    if (!interestRate) {
        throw new Error(`Interest rate not found for account type: ${accountType}`);
    }

    const P = Number(installmentAmount);
    const n = Number(tenure);
    const r = Number(interestRate);

    let maturityAmount = 0;
    let interest = 0;
    console.log(type)

    if (type === "recurring") {
        // RD formula: I = P * n(n+1) * r / (2 * 12 * 100)
        interest = (P * n * (n + 1) * r) / (2 * 12 * 100);
        maturityAmount = Math.round(P * n + interest);
    } else if (type === "fixed") {
        // FD formula: I = P * r * n / (12 * 100)
        interest = (P * r * n) / (12 * 100);
        maturityAmount = Math.round(P + interest);
    } else if (type === "mis") {
        // Assume doubling = 100% return => maturity = 2 * P
        const fixedTenure = 72;
        if (n !== fixedTenure) {
            throw new Error("MIS tenure must be exactly 72 months.");
        }
        maturityAmount = Math.round(2 * P);
        interest = maturityAmount - P; // interest is just the gain
        interestRate = (interest * 12 * 100) / (P * n);
    } else {
        throw new Error(`Unsupported account type: ${accountType}`);
    }

    return {
        maturityAmount,
        interestRate,
        totalInterest: Math.round(interest),
    };
};
