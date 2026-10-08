import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

const STORAGE_KEY = 'ai_sales_notifications';

// Danh sách thông báo mẫu khởi tạo ban đầu
const initialNotifications = [
  {
    id: 'notif-1',
    title: 'Đăng nhập hệ thống',
    message: 'Tài khoản Quản trị viên đã đăng nhập thành công vào hệ thống AISales.',
    type: 'success',
    link: '/dashboard',
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-2',
    title: 'Cập nhật kho hàng',
    message: 'Sản phẩm "Kem Massage Gừng Quế" đã được đồng bộ tồn kho 100.000 sản phẩm.',
    type: 'info',
    link: '/products',
    is_read: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-3',
    title: 'Hệ thống AI',
    message: 'Mô hình AI Gemini đã sẵn sàng hỗ trợ tư vấn bán hàng tự động 24/7.',
    type: 'info',
    link: '/knowledge',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  }
];

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Lỗi khi đọc notifications từ localStorage', e);
    }
    return initialNotifications;
  });

  // Lưu vào LocalStorage mỗi khi notifications thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.error('Lỗi khi lưu notifications vào localStorage', e);
    }
  }, [notifications]);

  // Thêm thông báo mới
  const addNotification = ({ title, message, type = 'info', link = null }) => {
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title || (type === 'success' ? 'Thành công' : type === 'error' ? 'Lỗi hệ thống' : type === 'warning' ? 'Cảnh báo' : 'Thông báo'),
      message: message || '',
      type,
      link,
      is_read: false,
      created_at: new Date().toISOString()
    };

    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]); // Giữ tối đa 50 thông báo gần nhất
  };

  // Đánh dấu 1 thông báo là đã đọc
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  // Đánh dấu tất cả là đã đọc
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // Xóa 1 thông báo
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
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
