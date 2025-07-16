export const calculateEMI = ({ loanAmount, interestRate, tenureMonths }) => {
    if (!loanAmount || !interestRate || !tenureMonths) {
        return {
            emi: 0,
            totalPayable: 0,
            totalInterest: 0,
            schedule: []
        };
    }

    const P = loanAmount;
    const r = interestRate / 100 / 12; // Monthly interest
    const n = tenureMonths;

    const emi = parseFloat(((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)).toFixed(2));
    const totalPayable = parseFloat((emi * n).toFixed(2));
    const totalInterest = parseFloat((totalPayable - P).toFixed(2));

    // 📅 Generate amortization schedule
    let balance = P;
    const schedule = [];

    for (let i = 1; i <= n; i++) {
        const interest = parseFloat((balance * r).toFixed(2));
        const principal = parseFloat((emi - interest).toFixed(2));
        balance = parseFloat((balance - principal).toFixed(2));

        schedule.push({
            month: i,
            emi,
            interest,
            principal,
            balance: Math.max(balance, 0)
        });

        if (balance <= 0) break;
    }

    return { emi, totalPayable, totalInterest, schedule };
};
