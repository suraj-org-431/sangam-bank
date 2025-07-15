import bcrypt from "bcryptjs/dist/bcrypt.js";
import User from "../models/User.js";
import {
    successResponse,
    errorResponse,
    notFoundResponse,
    badRequestResponse
} from "../utils/response.js";
import { createNewUser } from "../utils/userhelper.js";
import { format } from 'fast-csv';
import { notify } from "../utils/notify.js";
import path from 'path';
import fs from 'fs';

// ✅ GET /users/profile
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("role");
        if (!user) return notFoundResponse(res, 404, "User not found");

        return successResponse(res, 200, "Profile fetched successfully", {
            name: user.name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            dob: user.dob,
            role: user.role?.name,
            loginHistory: user.loginHistory
        });
    } catch (err) {
        return errorResponse(res, 500, "Failed to fetch profile", err.message);
    }
};

// ✅ GET /users
export const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const role = req.query.role || '';

        const query = {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        };

        if (role) {
            query.role = role;
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .populate("role")
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        return successResponse(res, 200, "Users fetched successfully", {
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalUsers: total,
        });
    } catch (err) {
        return errorResponse(res, 500, "Failed to fetch users", err.message);
    }
};

// ✅ GET /users/id/:userId
export const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return badRequestResponse(res, 400, "User ID is required");

        const user = await User.findById(userId).populate("role");
        if (!user) return notFoundResponse(res, 404, "User not found");

        return successResponse(res, 200, "User fetched successfully", user);
    } catch (err) {
        return errorResponse(res, 500, "Failed to fetch user", err.message);
    }
};

// ✅ GET /users/:email
export const getUserByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        if (!email) return badRequestResponse(res, 400, "Email is required");

        const user = await User.findOne({ email }).populate("role");
        if (!user) return notFoundResponse(res, 404, "User not found");

        return successResponse(res, 200, "User fetched successfully", user);
    } catch (err) {
        return errorResponse(res, 500, "Failed to fetch user", err.message);
    }
};

// ✅ POST /users
export const createUser = async (req, res) => {
    try {
        const { name, email, password, gender, role, phone, dob, status = true } = req.body;

        if (!name || !email || !password || !role) {
            return badRequestResponse(res, 400, "Name, email, password, and role are required");
        }

        const newUser = {
            name,
            email,
            gender,
            password: await bcrypt.hash(password, 10),
            phone,
            dob,
            status,
            role,
        };

        if (req.file) {
            newUser.profilePic = `/uploads/profilePics/${req.file.filename}`;
        }
        const user = await createNewUser(newUser);

        return successResponse(res, 201, "User created successfully", user);
    } catch (err) {
        return errorResponse(res, 500, "Failed to create user", err.message);
    }
};

// ✅ PUT /users/:userId
export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, phone, role, status, dob, gender } = req.body;
        let roleId = role;
        if (typeof role === 'object' && role?._id) {
            roleId = role._id;
        }

        const updateData = { name, email, phone, status, dob, gender };
        if (roleId) updateData.role = roleId;

        if (req.file) updateData.profilePic = `/uploads/profilePics/${req.file.filename}`;

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        );

        if (!user) return notFoundResponse(res, 404, "User not found");

        return successResponse(res, 200, "User updated successfully", user);
    } catch (err) {
        return errorResponse(res, 500, "Failed to update user", err.message);
    }
};

// ✅ DELETE /users/:userId
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return badRequestResponse(res, 400, "User ID is required");

        const deleted = await User.findByIdAndDelete(userId);
        if (!deleted) return notFoundResponse(res, 404, "User not found");

        return successResponse(res, 200, "User deleted successfully");
    } catch (err) {
        return errorResponse(res, 500, "Failed to delete user", err.message);
    }
};

// ✅ PATCH /users/:userId/status
export const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return notFoundResponse(res, 404, "User not found");

        user.status = !user.status;
        await user.save();

        return successResponse(res, 200, `User ${user.status ? "activated" : "deactivated"} successfully`, {
            status: user.status
        });
    } catch (err) {
        return errorResponse(res, 500, "Failed to update status", err.message);
    }
};

// ✅ PATCH /users/:userId/change-password OR /users/change-password (self)
export const changePasswordUnified = async (req, res) => {
    try {
        const { userId: paramUserId } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!newPassword) {
            return badRequestResponse(res, 400, "New password is required");
        }

        const targetUserId = paramUserId || req?.user?.id;
        const user = await User.findById(targetUserId);
        if (!user) return notFoundResponse(res, 404, "User not found");

        if (!paramUserId) {
            if (!currentPassword) {
                return badRequestResponse(res, 400, "Current password is required");
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return badRequestResponse(res, 400, "Current password is incorrect");
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return successResponse(
            res,
            200,
            paramUserId ? "Password changed by admin successfully" : "Password updated successfully"
        );
    } catch (err) {
        return errorResponse(res, 500, "Failed to change password", err.message);
    }
};

// ✅ GET /users/export
export const exportUsersCsv = async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');

        const cursor = User.find({})
            .populate('role')
            .cursor();

        const csvStream = format({ headers: true });
        csvStream.pipe(res);

        for await (const user of cursor) {
            csvStream.write({
                Name: user.name,
                Email: user.email,
                Phone: user.phone,
                DOB: user.dob ? user.dob.toISOString().split('T')[0] : '',
                Role: user.role?.name || '',
                Status: user.status ? 'Active' : 'Inactive',
            });
        }

        csvStream.end();
    } catch (err) {
        console.error('CSV export error:', err);
        res.status(500).json({ success: false, message: 'Failed to export users.' });
    }
};

// ✅ DELETE /users/:userId/profile-pic
export const deleteProfilePic = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return badRequestResponse(res, 400, "User ID is required");

        const user = await User.findById(userId);
        if (!user) return notFoundResponse(res, 404, "User not found");
        if (!user.profilePic) return notFoundResponse(res, 404, "No profile picture to delete");

        const filePath = path.resolve(`.${user.profilePic}`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        user.profilePic = undefined;
        await user.save();

        return successResponse(res, 200, "Profile picture deleted successfully");
    } catch (err) {
        console.error("Delete profile picture error:", err);
        return errorResponse(res, 500, "Failed to delete profile picture", err.message);
    }
};
