export const generateRepaymentSchedule = ({
    loanAmount,
    interestRate,
    tenureMonths,
    disbursementDate = new Date()
}) => {
    const P = parseFloat(loanAmount);
    const r = interestRate / 100 / 12;
    const n = tenureMonths;

    let emi = 0;
    if (r === 0) {
        emi = parseFloat((P / n).toFixed(2));
    } else {
        emi = parseFloat(((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)).toFixed(2));
    }

    let balance = P;
    const schedule = [];

    let totalPrincipalPaid = 0;

    for (let i = 1; i <= n; i++) {
        const interest = parseFloat((balance * r).toFixed(2));
        let principal = parseFloat((emi - interest).toFixed(2));

        // Handle last EMI adjustment
        if (i === n || totalPrincipalPaid + principal > P) {
            principal = parseFloat((P - totalPrincipalPaid).toFixed(2));
            emi = parseFloat((principal + interest).toFixed(2));
        }

        totalPrincipalPaid += principal;
        balance = parseFloat((balance - principal).toFixed(2));
        balance = Math.max(balance, 0); // avoid negative

        const dueDate = new Date(disbursementDate);
        dueDate.setMonth(disbursementDate.getMonth() + i);
        dueDate.setDate(15);

        schedule.push({
            month: i,
            dueDate,
            amount: emi,
            interest,
            principal,
            balance,
            paid: false,
            paidOn: null,
            amountPaid: 0,
            fine: 0,
            paymentRef: ""
        });
    }

    return { schedule, emiAmount: emi };
};
