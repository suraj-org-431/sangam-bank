import Notification from '../models/Notification.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 10, unreadOnly } = req.query;
        const skip = (page - 1) * limit;
        let filter = {};
        if (unreadOnly === 'true') {
            filter.isRead = false;
        }

        const [data, count] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Notification.countDocuments(filter),
        ]);

        return successResponse(res, 200, 'Notifications fetched', {
            data,
            currentPage: Number(page),
            totalPages: Math.ceil(count / limit),
        });
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch notifications', err.message);
    }
};

export const toggleNotificationReadStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findById(id);
        if (!notification) {
            return errorResponse(res, 404, "Notification not found");
        }

        const updated = await Notification.findByIdAndUpdate(
            id,
            { isRead: !notification.isRead },
            { new: true }
        );

        return successResponse(res, 200, "Notification read status toggled", updated);
    } catch (err) {
        return errorResponse(res, 500, "Failed to toggle read status", err.message);
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndDelete(id);
        return successResponse(res, 200, "Notification deleted");
    } catch (err) {
        return errorResponse(res, 500, "Failed to delete notification", err.message);
    }
};