import mongoose from "mongoose";

const { Schema } = mongoose;

const addressSchema = new Schema({
    village: String,
    post: String,
    block: String,
    district: String,
    state: String,
    pincode: String
}, { _id: false });

const loanScheduleSchema = new Schema({
    dueDate: Date,
    principal: Number,
    interest: Number,
    amount: Number,
    fine: { type: Number, default: 0 },
    paid: { type: Boolean, default: false },
    paidOn: Date,
    paymentRef: String,
    prepayment: { type: Number, default: 0 }
}, { _id: false });

const recurringInstallmentSchema = new Schema({
    month: Number,
    dueDate: Date,
    paid: { type: Boolean, default: false },
    paidDate: Date,
    fine: { type: Number, default: 0 },
    paymentRef: String
}, { _id: false });

const maturitySchema = new Schema({
    interestAccount: {
        type: Schema.Types.ObjectId,
        ref: 'Accounts',
        required: false
    },
    depositAmount: { type: Number, default: 0 },
    interestRate: { type: Number, default: 0 },
    maturityAmount: { type: Number, default: 0 },
    maturityDate: { type: Date },
    totalInterest: { type: Number, default: 0 }
}, { _id: false });

const accountsSchema = new Schema({
    accountType: {
        type: String,
        enum: ['s/f', 'recurring', 'fixed', 'loan', 'mis', 'Auto-Created']
    },
    tenure: { type: Number, default: 0 },
    branch: String,
    applicantName: String,
    gender: String,
    dob: Date,
    occupation: String,
    phone: String,
    fatherOrHusbandName: String,
    relation: String,
    address: addressSchema,
    aadhar: String,
    depositAmount: Number,
    introducerName: String,
    membershipNumber: String,
    introducerKnownSince: String,
    accountNumber: { type: String, unique: true, index: true },
    nomineeName: String,
    nomineeRelation: String,
    nomineeAge: Number,
    managerName: String,
    lekhpalOrRokapal: String,
    formDate: Date,
    accountOpenDate: Date,
    signaturePath: String,
    verifierSignaturePath: String,
    profileImage: String,
    balance: { type: Number, default: 0 },
    hasLoan: { type: Boolean, default: false },

    loanDetails: {
        totalLoanAmount: { type: Number, default: 0 },
        disbursedAmount: { type: Number, default: 0 },
        interestRate: Number,
        tenureMonths: { type: Number, default: null },
        emiAmount: Number,
        disbursedDate: Date,
        status: {
            type: String,
            enum: ['pending', 'approved', 'disbursed', 'repaid', 'defaulted'],
            default: 'pending'
        },
        nextDueDate: Date,
        lastEMIPaidOn: Date,
        totalPaidAmount: { type: Number, default: 0 },
        defaultedOn: Date,
        maturityAmount: { type: Number, default: 0 },
        totalInterest: { type: Number, default: 0 },
        loanCategory: {
            type: String,
            enum: ['personal', 'education', 'gold', 'vehicle', 'home', 'business'],
        },
        paymentType: {
            type: String,
            enum: ['s/i', 'emi'],
        },
        repaymentSchedule: [loanScheduleSchema]
    },

    recurringDetails: {
        installmentAmount: Number,
        schedule: [recurringInstallmentSchema],
        fineTotal: { type: Number, default: 0 },
        completedInstallments: { type: Number, default: 0 },
        isMatured: { type: Boolean, default: false },
        maturityDate: Date,
        maturityAmount: { type: Number, default: 0 },
        totalInterest: { type: Number, default: 0 }
    },

    misDetails: maturitySchema,
    fixedDetails: maturitySchema,
    savingsDetails: maturitySchema,
    currentDetails: maturitySchema,

    status: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Accounts", accountsSchema);
