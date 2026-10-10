import { Router } from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get('/', getNotifications);
notificationRouter.patch('/:id/read', markNotificationAsRead);
notificationRouter.patch('/read-all', markAllNotificationsAsRead);
notificationRouter.delete('/:id', deleteNotification);

export default notificationRouter;
