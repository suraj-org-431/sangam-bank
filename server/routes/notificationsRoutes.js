import express from 'express';
import {
    getNotifications,
    deleteNotification,
    toggleNotificationReadStatus
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', getNotifications);
router.put('/:id/read', toggleNotificationReadStatus);
router.delete('/:id', deleteNotification);

export default router;