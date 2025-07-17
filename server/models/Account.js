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
    amount: Number, // total = principal + interest
    paid: { type: Boolean, default: false },
    paidOn: Date,
    fine: { type: Number, default: 0 },
    paymentRef: String
}, { _id: false });

const recurringInstallmentSchema = new Schema({
    month: Number,
    dueDate: Date,
    paid: { type: Boolean, default: false },
    paidDate: Date,
    fine: { type: Number, default: 0 },
    paymentRef: String
}, { _id: false });

const accountsSchema = new Schema({
    accountType: {
        type: String,
        enum: ['Savings', 'Recurring', 'Fixed', 'Current', 'Loan', 'MIS', 'Auto-Created']
    },
    tenure: { type: Number, default: 0 },
    branch: { type: String },
    applicantName: { type: String },
    gender: { type: String },
    dob: { type: Date },
    occupation: String,
    phone: String,
    fatherOrHusbandName: { type: String },
    relation: { type: String },
    address: addressSchema,
    aadhar: { type: String },
    depositAmount: { type: Number },
    introducerName: { type: String },
    membershipNumber: { type: String },
    introducerKnownSince: String,
    accountNumber: { type: String, unique: true, index: true },
    nomineeName: { type: String },
    nomineeRelation: { type: String },
    nomineeAge: { type: Number },
    managerName: String,
    lekhpalOrRokapal: String,
    formDate: Date,
    accountOpenDate: Date,
    signaturePath: { type: String },
    verifierSignaturePath: { type: String },
    profileImage: { type: String },
    balance: { type: Number, default: 0 },
    hasLoan: { type: Boolean, default: false },

    loanDetails: {
        totalLoanAmount: { type: Number, default: 0 },
        disbursedAmount: { type: Number, default: 0 },
        interestRate: { type: Number },
        tenureMonths: { type: Number },
        emiAmount: { type: Number },
        disbursedDate: { type: Date },
        status: {
            type: String,
            enum: ['pending', 'approved', 'disbursed', 'repaid', 'defaulted'],
            default: 'pending'
        },
        nextDueDate: { type: Date },
        lastEMIPaidOn: { type: Date }, // ✅ New field
        totalPaidAmount: { type: Number, default: 0 }, // ✅ Optional useful field
        defaultedOn: { type: Date }, // ✅ Optional for tracking NPAs
        repaymentSchedule: [loanScheduleSchema]
    },

    recurringDetails: {
        installmentAmount: { type: Number },
        schedule: [recurringInstallmentSchema],
        fineTotal: { type: Number, default: 0 },
        completedInstallments: { type: Number, default: 0 },
        isMatured: { type: Boolean, default: false },
        maturityDate: Date
    },

    status: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Accounts", accountsSchema);
