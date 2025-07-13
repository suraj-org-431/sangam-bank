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

const accountsSchema = new Schema({
    accountType: { type: String },
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
    accountNumber: { type: String, unique: true },
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
    status: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Accounts", accountsSchema);
