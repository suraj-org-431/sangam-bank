import Notification from '../models/Notification.js';

export const notify = async (type, accId, loanId, title, body) => {
    try {
        await Notification.create({ type, accId, loanId, title, body });
    } catch (err) {
        console.error("Notification Error:", err.message);
    }
};