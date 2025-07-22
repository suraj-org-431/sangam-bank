export const calculateMaturity = (
    accountType,
    principal,
    rate,
    months,
    isCompound = false,
    compoundingFrequency = 1
) => {
    principal = Number(principal) || 0;
    rate = Number(rate) || 0;
    months = Number(months) || 0;

    if (principal <= 0 || rate < 0 || months <= 0) {
        return {
            maturityAmount: 0,
            totalInterest: 0,
        };
    }

    let maturityAmount = 0;
    let totalInterest = 0;

    if (accountType.toLowerCase() === 'mis') {
        // Monthly Income Scheme (only interest paid monthly, principal returned at end)
        const rate = 100 / 6; // ≈ 16.67%

        const monthlyInterest = (principal * rate) / (100 * 12);
        totalInterest = monthlyInterest * months;
        maturityAmount = 2 * principal;

    } else if (accountType.toLowerCase() === 'recurring') {
        const P = principal;
        const n = months;
        const r = rate;

        totalInterest = (P * n * (n + 1) * r) / (2 * 12 * 100);
        maturityAmount = (P * n) + totalInterest;
    }
    else if (isCompound) {
        const years = months / 12;
        maturityAmount =
            principal * Math.pow(1 + rate / (100 * compoundingFrequency), compoundingFrequency * years);
        totalInterest = maturityAmount - principal;
    } else {
        totalInterest = principal * (rate / 100) * (months / 12);
        maturityAmount = principal + totalInterest;
    }

    return {
        maturityAmount: parseFloat(Number(maturityAmount).toFixed(2)),
        totalInterest: parseFloat(Number(totalInterest).toFixed(2)),
    };
};
