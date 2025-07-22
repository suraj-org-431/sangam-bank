import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

export const notify = async (type, accId, loanId, title, body) => {
    try {
        const notification = {
            type,
            title,
            body,
            isRead: false,
        };

        if (mongoose.Types.ObjectId.isValid(accId)) {
            notification.accountId = accId;
        }

        if (mongoose.Types.ObjectId.isValid(loanId)) {
            notification.loanId = loanId;
        }

        await Notification.create(notification);
    } catch (err) {
        console.error("Notification Error:", err.message);
    }
};