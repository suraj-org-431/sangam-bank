import API from './axios';

export const getNotifications = async (page = 1, limit = 10) => {
    try {
        const res = await API.get(`/notifications?page=${page}&limit=${limit}`);
        return res.data?.data;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to fetch notifications');
    }
};

export const getUnreadNotifications = async () => {
    try {
        const res = await API.get('/notifications?unreadOnly=true');
        return res.data?.data || [];
    } catch (err) {
        console.error("Failed to fetch unread notifications:", err);
        return [];
    }
};

export const markAsRead = async (id) => {
    try {
        return await API.put(`/notifications/${id}/read`);
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to mark as read');
    }
};

export const deleteNotification = async (id) => {
    try {
        return await API.delete(`/notifications/${id}`);
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to delete notification');
    }
};
