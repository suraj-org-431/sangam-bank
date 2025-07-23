export function calculateLoanDetails({ amount, interestRate, tenure, paymentType }) {
    if (!amount || !interestRate || (paymentType !== 's/i' && !tenure)) {
        return { error: 'Invalid input. Amount, interestRate, tenure, and paymentType are required.' };
    }

    const monthlyRate = interestRate / 100;

    if (paymentType === 'emi') {
        const P = amount;
        const r = monthlyRate;
        const n = tenure;

        const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPayable = emi * n;
        const totalInterest = totalPayable - P;

        return {
            paymentType: 'emi',
            monthlyPayment: parseFloat(emi.toFixed(2)),
            totalInterest: parseFloat(totalInterest.toFixed(2)),
            totalPayable: parseFloat(totalPayable.toFixed(2)),
            message: `EMI-based repayment: ₹${emi.toFixed(2)} per month for ${tenure} months.`
        };
    }

    if (paymentType === 's/i') {
        const monthlyInterest = amount * monthlyRate;
        const totalInterest = monthlyInterest * tenure;
        const totalPayable = amount + totalInterest;
        const monthlyPayment = totalPayable / tenure;

        if (!tenure || tenure === Infinity) {
            return {
                paymentType: 's/i',
                monthlyInterest: parseFloat(monthlyInterest.toFixed(2)),
                message: `Simple interest-based loan with no fixed tenure. Monthly interest is ₹${monthlyInterest.toFixed(2)}.`
            };
        }

        return {
            paymentType: 's/i',
            monthlyInterest: parseFloat(monthlyInterest.toFixed(2)),
            totalInterest: parseFloat(totalInterest.toFixed(2)),
            totalPayable: parseFloat(totalPayable.toFixed(2)),
            monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
            message: `Simple interest repayment: ₹${monthlyPayment.toFixed(2)} per month for ${tenure} months.`
        };
    }

    return { error: 'Unsupported payment type. Use "emi" or "s/i".' };
}
