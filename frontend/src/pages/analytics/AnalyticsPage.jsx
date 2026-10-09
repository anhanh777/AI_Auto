import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { analyticsService } from '../../services/analytics.service.js';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Package
} from 'lucide-react';

const AnalyticsPage = () => {
  const { activeBusiness } = useBusiness();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoading(true);
      const res = await analyticsService.getAnalytics(activeBusiness._id);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải thống kê:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeBusiness?._id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <RefreshCw size={24} className="animate-spin text-blue-600 mr-2" />
        <span className="text-xs font-semibold">Đang tổng hợp số liệu kinh doanh...</span>
      </div>
    );
  }

  const overview = data?.overview || {
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    aiOrders: 0,
    totalCustomers: 0,
    totalConversations: 0,
    aiConversionRate: 0
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <BarChart3 className="text-blue-600" />
              <span>Báo Cáo & Thống Kê Hiệu Suất</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold">
              {activeBusiness?.business_name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Đo lường doanh thu, đơn hàng và tỷ lệ chuyển đổi chốt đơn tự động của AI Bot
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Doanh thu ghi nhận</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-xl">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {overview.totalRevenue.toLocaleString('vi-VN')} đ
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1">
            <TrendingUp size={13} />
            <span>Tự động chốt từ AI & Nhân viên</span>
          </p>
        </div>

        {/* Đơn hàng */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Tổng số đơn hàng</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-xl">
              <ShoppingCart size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {overview.totalOrders} đơn
          </p>
          <p className="text-[11px] text-slate-400">
            {overview.completedOrders} đơn hoàn thành / {overview.aiOrders} do AI bóc tách
          </p>
        </div>

        {/* Khách hàng */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Khách hàng tương tác</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-xl">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {overview.totalCustomers} khách
          </p>
          <p className="text-[11px] text-slate-400">
            {overview.totalConversations} phiên hội thoại Messenger
          </p>
        </div>

        {/* Tỷ lệ AI Chốt đơn */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Hiệu suất AI Bot</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-xl">
              <Sparkles size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {overview.aiConversionRate}%
          </p>
          <p className="text-[11px] text-amber-600 font-semibold">
            Tỷ lệ hội thoại chuyển đổi thành đơn
          </p>
        </div>
      </div>

      {/* Top Sản Phẩm & Biểu đồ doanh thu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sản phẩm bán chạy */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Package size={16} className="text-blue-600" />
            <span>Sản phẩm kinh doanh chủ lực</span>
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {data?.topProducts && data.topProducts.length > 0 ? (
              data.topProducts.map((p) => (
                <div key={p._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={p.image_urls?.[0] || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=100'}
                      alt={p.product_name}
                      className="w-10 h-10 rounded-xl object-cover border shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {p.product_name}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {(p.sale_price || p.base_price).toLocaleString('vi-VN')} đ
                    </p>
                    <span className="text-[10px] text-slate-400">
                      Kho: {p.stock_physical?.toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có sản phẩm nào</p>
            )}
          </div>
        </div>

        {/* Biểu đồ doanh thu 7 ngày */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <TrendingUp size={16} className="text-emerald-500" />
            <span>Biến động doanh thu gần đây</span>
          </h3>

          <div className="h-60 flex items-end justify-between gap-2 pt-6 px-2">
            {data?.revenueByDay && data.revenueByDay.length > 0 ? (
              data.revenueByDay.map((day, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    style={{ height: `${Math.min(100, Math.max(15, (day.revenue / 1000000) * 100))}%` }}
                    className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-lg transition hover:brightness-110 relative group"
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                      {day.revenue.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{day._id}</span>
                </div>
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu giao dịch gần đây
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
