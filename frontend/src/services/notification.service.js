import apiClient from '../config/axios.config.js';

export const notificationService = {
  getNotifications: async () => {
    return await apiClient.get('/notifications');
  },

  markAsRead: async (id) => {
    return await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    return await apiClient.patch('/notifications/read-all');
  },

  deleteNotification: async (id) => {
    return await apiClient.delete(`/notifications/${id}`);
  }
};
