export const calculateRecurringMaturityAmount = (
    installmentAmount,
    tenure,
    config
) => {
    if (!installmentAmount || !tenure || !config) {
        throw new Error("Missing required parameters");
    }

    // Find Recurring interest rate from config
    const recurringRateObj = config.monthlyInterestRates?.find(
        (rateObj) => rateObj.type?.toLowerCase() === "recurring"
    );

    const interestRate = recurringRateObj?.rate || 6; // fallback 6%

    const totalPrincipal = installmentAmount * tenure;
    const totalInterest = (totalPrincipal * interestRate) / 100;
    const maturityAmount = Math.round(totalPrincipal + totalInterest);

    return { maturityAmount, interestRate };
};
