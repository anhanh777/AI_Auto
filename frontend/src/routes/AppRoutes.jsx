import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import LiveChatPage from '../pages/livechat/LiveChatPage.jsx';
import BotAutoPage from '../pages/bot/BotAutoPage.jsx';
import CustomerListPage from '../pages/customers/CustomerListPage.jsx';
import AnalyticsPage from '../pages/analytics/AnalyticsPage.jsx';
import ProductListPage from '../pages/products/ProductListPage.jsx';
import OrderListPage from '../pages/orders/OrderListPage.jsx';
import KnowledgeBasePage from '../pages/knowledge/KnowledgeBasePage.jsx';
import UserManagementPage from '../pages/settings/UserManagementPage.jsx';
import BusinessSettingsPage from '../pages/settings/BusinessSettingsPage.jsx';
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

          {/* 1. Nhắn tin (Channels, LiveChat & Messenger) */}
          <Route path="/livechat" element={<LiveChatPage />} />
          <Route path="/chat" element={<LiveChatPage />} />

          {/* 2. Cấu hình Bot-Auto */}
          <Route path="/bot-auto" element={<BotAutoPage />} />

          {/* 3. Quản lý Khách hàng */}
          <Route path="/customers" element={<CustomerListPage />} />

          {/* 4. Báo cáo Thống kê */}
          <Route path="/analytics" element={<AnalyticsPage />} />

          {/* 5. Quản lý Sản phẩm & Kho */}
          <Route path="/products" element={<ProductListPage />} />

          {/* 6. Quản lý Đơn hàng */}
          <Route path="/orders" element={<OrderListPage />} />

          {/* 7. Kho Tri Thức RAG */}
          <Route path="/knowledge" element={<KnowledgeBasePage />} />

          {/* 8. Quản lý Thành viên */}
          <Route path="/settings/users" element={<UserManagementPage />} />
          <Route path="/settings/roles" element={<Navigate to="/settings/users" replace />} />

          {/* 9. Quản lý Thông tin Doanh nghiệp */}
          <Route path="/settings/business" element={<BusinessSettingsPage />} />

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
