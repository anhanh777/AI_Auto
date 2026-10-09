import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import BusinessHomePage from '../pages/business/BusinessHomePage.jsx';
import LiveChatPage from '../pages/livechat/LiveChatPage.jsx';
import ProductListPage from '../pages/products/ProductListPage.jsx';
import UserManagementPage from '../pages/settings/UserManagementPage.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import ProtectedRoute from '../components/guards/ProtectedRoute.jsx';

const AppRoutes = () => {
  return (
    <Routes>
      {/* 1. Tuyến đường công khai: Đăng nhập */}
      <Route path="/login" element={<LoginPage />} />

      {/* 2. Tuyến đường được bảo vệ bởi MainLayout & ProtectedRoute */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* Cổng Doanh Nghiệp (Portal) */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Trang chủ / Nhắn tin của Business đã chọn (Kênh chat Fanpage & LiveChat) */}
          <Route path="/business/home" element={<Navigate to="/livechat" replace />} />


          {/* Hộp thư Live Chat / Nhắn tin */}
          <Route path="/livechat" element={<LiveChatPage />} />

          {/* Quản lý Sản phẩm & Kho (Yêu cầu quyền PRODUCT_VIEW) */}
          <Route element={<ProtectedRoute requiredPermission="PRODUCT_VIEW" />}>
            <Route path="/products" element={<ProductListPage />} />
          </Route>

          {/* Quản lý thành viên (Yêu cầu quyền USER_MANAGE) */}
          <Route element={<ProtectedRoute requiredPermission="USER_MANAGE" />}>
            <Route path="/settings/users" element={<UserManagementPage />} />
          </Route>
          <Route path="/settings/roles" element={<Navigate to="/settings/users" replace />} />

          {/* Chuyển hướng mặc định */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      {/* 404 Not Found fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
