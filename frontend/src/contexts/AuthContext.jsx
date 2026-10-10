import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../config/axios.config.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('ai_sales_token') || null);
  const [loading, setLoading] = useState(true);

  // Khởi tạo thông tin user khi load trang
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('ai_sales_token');
      if (savedToken) {
        try {
          const res = await apiClient.get('/auth/me');
          if (res.success) {
            setUser(res.data);
            localStorage.setItem('ai_sales_user', JSON.stringify(res.data));
          }
        } catch (error) {
          console.error('Lỗi xác thực token:', error);
          localStorage.removeItem('ai_sales_token');
          localStorage.removeItem('ai_sales_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Hàm Đăng nhập
  const login = async (username, password) => {
    const res = await apiClient.post('/auth/login', { username, password });
    if (res.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('ai_sales_token', receivedToken);
      localStorage.setItem('ai_sales_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return res;
    }
    throw new Error(res.message || 'Đăng nhập thất bại');
  };

  // Hàm Đăng ký tài khoản
  const register = async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    if (res.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('ai_sales_token', receivedToken);
      localStorage.setItem('ai_sales_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return res;
    }
    throw new Error(res.message || 'Đăng ký tài khoản thất bại');
  };

  // Hàm Đăng xuất
  const logout = () => {
    localStorage.removeItem('ai_sales_token');
    localStorage.removeItem('ai_sales_user');
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  // Hàm kiểm tra quyền chi tiết (hasPermission)
  const hasPermission = (permissionCode) => {
    if (!user) return false;
    if (user.role_id?.name === 'ADMIN' || (user.role_id?.permissions && user.role_id.permissions.includes('ALL'))) {
      return true;
    }
    if (user.custom_permissions && user.custom_permissions.includes('ALL')) {
      return true;
    }
    if (user.custom_permissions && user.custom_permissions.includes(permissionCode)) {
      return true;
    }
    return Boolean(user.role_id?.permissions && user.role_id.permissions.includes(permissionCode));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
        hasPermission,
        isAdmin: user?.role_id?.name === 'ADMIN'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
