export function generateRepaymentSchedule({
    amount,
    interestRate,
    tenure,
    paymentType,
    openDate,
    result
}) {
    const schedule = [];
    const monthlyRate = interestRate / 100;
    console.log(amount, tenure, openDate)


    if (!amount || !tenure || !openDate) return [];


    if (paymentType === 'emi') {
        const emiAmount = result?.monthlyPayment || 0;
        let balance = amount;

        for (let i = 0; i < tenure; i++) {
            const dueDate = new Date(openDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            const interest = balance * monthlyRate;
            const principal = emiAmount - interest;

            schedule.push({
                month: i + 1,
                dueDate,
                amount: parseFloat(emiAmount.toFixed(2)),
                interest: parseFloat(interest.toFixed(2)),
                principal: parseFloat(principal.toFixed(2)),
                balance: parseFloat(balance?.toFixed(2)),
                paid: false,
                paidOn: null,
                amountPaid: 0
            });

            balance -= principal;
        }
    } else if (paymentType === 's/i') {
        const monthlyInterest = amount * monthlyRate;
        const totalInterest = monthlyInterest * tenure;
        const totalPayable = amount + totalInterest;
        const monthlyPayment = totalPayable / tenure;

        for (let i = 0; i < tenure; i++) {
            const dueDate = new Date(openDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            schedule.push({
                month: i + 1,
                dueDate,
                amount: parseFloat(monthlyPayment.toFixed(2)),
                interest: parseFloat(monthlyInterest.toFixed(2)),
                principal: parseFloat((monthlyPayment - monthlyInterest).toFixed(2)),
                balance: parseFloat(amount.toFixed(2)),
                paid: false,
                paidOn: null,
                amountPaid: 0
            });
        }
    }
    return schedule;
}
