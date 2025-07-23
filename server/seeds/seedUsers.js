import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import server from "../server.js"; // ⬅️ Ensure your Express app is exported
import { extractRoutes } from "../utils/getRoutes.js";

dotenv.config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Clear old
        await Permission.deleteMany({});
        await Role.deleteMany({});
        await User.deleteMany({});

        // ⛔ Exclude public routes from permission list
        const excludedRoutes = [
            "POST:/auth/register",
            "POST:/auth/login",
            "GET:/auth/google",
            "GET:/auth/google/callback"
        ];

        const allRoutes = extractRoutes(server);

        // ✅ Clean & filter
        const uniquePermissions = Array.from(
            new Set(allRoutes.map(r => `${r.method}:${r.route}`))
        )
            .filter(name => !excludedRoutes.includes(name))
            .map(name => {
                const [method, ...rest] = name.split(":");
                let route = rest.join(":");

                // ✅ Remove /api prefix
                if (route.startsWith("/api/")) {
                    route = route.replace("/api", "");
                }

                // ✅ Remove trailing slash (but not if it's just "/")
                if (route.length > 1 && route.endsWith("/")) {
                    route = route.slice(0, -1);
                }

                return {
                    name: `${method}:${route}`, // update name too
                    method,
                    route
                };
            });

        // Insert valid permissions
        const createdPermissions = await Permission.insertMany(uniquePermissions);

        // ROLES: Define access levels
        const superAdminRole = await Role.create({
            name: "SuperAdmin",
            roleType: "super-admin",
            permissions: createdPermissions.map(p => p._id) // full access
        });

        const branchManagerPermissions = createdPermissions.filter(p =>
            // Can GET and POST anything EXCEPT admin-level settings or user/permission/role configs
            ["GET", "POST"].includes(p.method) &&
            !p.route.includes("/admin") &&
            !p.route.includes("/roles") &&
            !p.route.includes("/permissions") &&
            !p.route.includes("/users")
        ).map(p => p._id);

        const branchManagerRole = await Role.create({
            name: "Branch Manager",
            roleType: "branch-manager",
            permissions: branchManagerPermissions
        });

        const accountOfficerPermissions = createdPermissions.filter(p =>
            // GET-only access to non-admin financial data
            p.method === "GET" &&
            (
                p.route.includes("/accounts") ||
                p.route.includes("/transactions") ||
                p.route.includes("/ledger") ||
                p.route.includes("/loans")
            )
        ).map(p => p._id);

        const accountOfficerRole = await Role.create({
            name: "Account Officer",
            roleType: "account-officer",
            permissions: accountOfficerPermissions
        });

        const viewerPermissions = createdPermissions
            .filter(p => p.method === "GET")
            .map(p => p._id);

        const viewerRole = await Role.create({
            name: "Viewer",
            roleType: "viewer",
            permissions: viewerPermissions
        });

        const userPermissions = createdPermissions
            .filter(p => p.method === "GET")
            .map(p => p._id);

        const userRole = await Role.create({
            name: "User",
            roleType: "user",
            permissions: userPermissions
        });

        const adminPermissions = createdPermissions
            .filter(p => !p.route.includes("/admin/permissions"))
            .map(p => p._id);

        const adminRole = await Role.create({
            name: "Admin",
            roleType: "admin",
            permissions: adminPermissions
        });

        // Create users
        await User.create({
            name: "Super Admin",
            email: "super@admin.com",
            password: await bcrypt.hash("Super@123", 10),
            role: superAdminRole._id
        });

        await User.create({
            name: "Branch Manager",
            email: "branch@bank.com",
            password: await bcrypt.hash("Branch@123", 10),
            role: branchManagerRole._id
        });

        await User.create({
            name: "Account Officer",
            email: "officer@bank.com",
            password: await bcrypt.hash("Officer@123", 10),
            role: accountOfficerRole._id
        });

        await User.create({
            name: "Admin",
            email: "admin@gmail.com",
            password: await bcrypt.hash("Admin@123", 10),
            role: adminRole._id
        });

        await User.create({
            name: "Suraj Kumar",
            email: "srjkmr431@gmail.com",
            password: await bcrypt.hash("Suraj@1994", 10),
            role: viewerRole._id
        });

        console.log("✅ Dynamic seed completed.");
    } catch (err) {
        console.error("❌ Seeding error:", err);
    } finally {
        process.exit();
    }
};

seed();
