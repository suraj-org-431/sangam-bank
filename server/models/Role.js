import mongoose from "mongoose";

const { Schema } = mongoose;

const roleSchema = new Schema({
    name: { type: String, unique: true },
    roleType: {
        type: String,
        enum: [
            // Core roles
            "super-admin", "admin", "viewer", "custom", "user",

            // Banking-specific executive/staff
            "branch-manager", "regional-manager", "teller", "cashier",
            "account-officer", "loan-officer", "customer-service",
            "relationship-manager", "it-admin", "auditor",
            "compliance-officer", "risk-analyst", "internal-auditor",
            "external-auditor", "finance-manager", "legal-officer",

            // Customer roles
            "customer", "corporate-customer", "vip-customer", "loan-customer"
        ],
        default: "custom"
    },
    permissions: [{ type: Schema.Types.ObjectId, ref: "Permission" }],
    status: { type: Boolean, default: true },
});

const Role = mongoose.model("Role", roleSchema);

export default Role;
