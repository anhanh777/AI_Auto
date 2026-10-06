import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

const ProtectedRoute = ({ requiredPermission }) => {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Đang kiểm tra thông tin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Không đủ thẩm quyền truy cập</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Tài khoản của bạn chưa được cấp mã quyền <span className="font-semibold text-red-500">[{requiredPermission}]</span> để xem trang này.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition"
          >
            Về Trang Tổng Quan
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
