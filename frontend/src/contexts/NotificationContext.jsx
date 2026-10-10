import React, { createContext, useContext, useState, useEffect } from 'react';
import { notificationService } from '../services/notification.service.js';

const NotificationContext = createContext();

const STORAGE_KEY = 'ai_sales_notifications';

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tải danh sách thông báo thực tế từ CSDL
  const fetchNotifications = async () => {
    const token = localStorage.getItem('ai_sales_token');
    if (!token) return;

    try {
      setLoading(true);
      const res = await notificationService.getNotifications();
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.warn('Không thể tải thông báo từ máy chủ:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Tự động kiểm tra thông báo mới mỗi 30 giây
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Thêm thông báo mới cục bộ
  const addNotification = ({ title, message, type = 'info', link = null }) => {
    const newNotif = {
      _id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title || 'Thông báo hệ thống',
      message: message || '',
      type,
      link,
      is_read: false,
      created_at: new Date().toISOString()
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Đánh dấu 1 thông báo là đã đọc
  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id || n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error(err);
    }
  };

  // Đánh dấu tất cả là đã đọc
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error(err);
    }
  };

  // Xóa 1 thông báo
  const removeNotification = async (id) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
    try {
      await notificationService.deleteNotification(id);
    } catch (err) {
      console.error(err);
    }
  };

  // Xóa tất cả thông báo
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Số lượng thông báo chưa đọc
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
