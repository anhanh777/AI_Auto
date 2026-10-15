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
  Package,
  Clock,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Layers,
  Filter,
  Calendar,
  ArrowUpRight,
  PieChart,
  Bot,
  UserCheck,
  AlertCircle
} from 'lucide-react';

const AnalyticsPage = () => {
  const { activeBusiness } = useBusiness();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days'); // 'today' | '7days' | '30days' | 'month' | 'all'
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);

  const fetchAnalytics = async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoading(true);
      const res = await analyticsService.getAnalytics(activeBusiness._id, timeRange);
      const analyticsData = res?.data || res;
      if (analyticsData) {
        setData(analyticsData);
      }
    } catch (err) {
      console.error('Lỗi khi tải thống kê:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeBusiness?._id, timeRange]);

  const overview = data?.overview || {
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    shippingOrders: 0,
    cancelledOrders: 0,
    aiOrders: 0,
    aiRevenue: 0,
    manualOrders: 0,
    manualRevenue: 0,
    avgOrderValue: 0,
    totalCustomers: 0,
    repeatCustomers: 0,
    repeatCustomerRate: 0,
    totalConversations: 0,
    handoverConversations: 0,
    aiAutonomyRate: 100,
    aiConversionRate: 0,
    avgResponseTimeSeconds: 3
  };

  const TIME_OPTIONS = [
    { value: 'today', label: 'Hôm nay' },
    { value: '7days', label: '7 ngày qua' },
    { value: '30days', label: '30 ngày qua' },
    { value: 'month', label: 'Tháng này' },
    { value: 'all', label: 'Tất cả' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* 1. Header & Bộ lọc thời gian */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Báo Cáo & Thống Kê Hiệu Suất</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  {activeBusiness?.business_name}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đo lường doanh thu, phân tích phễu chuyển đổi và hiệu suất chốt đơn tự động của Trợ lý AI Gemini
              </p>
            </div>
          </div>
        </div>

        {/* Thanh chọn thời gian & Nút làm mới */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeRange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  timeRange === opt.value
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer disabled:opacity-50"
            title="Tải lại số liệu mới nhất"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <RefreshCw size={24} className="animate-spin text-blue-600 mr-2" />
          <span className="text-xs font-bold">Đang tổng hợp dữ liệu thời gian thực...</span>
        </div>
      )}

      {/* 2. Hàng 1: 4 Thẻ KPI Tài Chính & Kinh Doanh Cốt Lõi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 hover:border-emerald-300 dark:hover:border-emerald-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Doanh thu ghi nhận</span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {overview.totalRevenue.toLocaleString('vi-VN')} đ
          </p>
          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <TrendingUp size={13} />
            <span>AI chốt: {overview.aiRevenue.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        {/* Tổng số đơn hàng */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 hover:border-blue-300 dark:hover:border-blue-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tổng số đơn hàng</span>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <ShoppingCart size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {overview.totalOrders} <span className="text-sm font-semibold text-slate-400">đơn</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            <span className="text-emerald-600 font-bold">{overview.completedOrders} hoàn thành</span> • <span className="text-blue-600 font-bold">{overview.aiOrders} do AI bóc tách</span>
          </p>
        </div>

        {/* Khách hàng tương tác */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Khách hàng tương tác</span>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {overview.totalCustomers} <span className="text-sm font-semibold text-slate-400">khách</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {overview.totalConversations} hội thoại • <span className="text-indigo-600 font-bold">{overview.repeatCustomers} mua lại ({overview.repeatCustomerRate}%)</span>
          </p>
        </div>

        {/* Tỷ lệ chốt đơn AI */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 hover:border-amber-300 dark:hover:border-amber-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tỷ lệ chốt đơn AI</span>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <Sparkles size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {overview.aiConversionRate}%
          </p>
          <p className="text-[11px] text-amber-600 font-semibold flex items-center space-x-1">
            <span>Tỷ lệ hội thoại chat chuyển đổi thành đơn</span>
          </p>
        </div>
      </div>

      {/* 3. Hàng 2: 4 Thẻ KPI Hiệu Năng Vận Hành & Tự Động Hóa AI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AOV - Giá trị đơn TB */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Giá trị đơn TB (AOV)</span>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
              {overview.avgOrderValue.toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>

        {/* Tỷ lệ AI Tự động hóa hoàn toàn */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
            <Bot size={18} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tỷ lệ AI tự động hóa</span>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
              {overview.aiAutonomyRate}% <span className="text-[10px] font-normal text-slate-400">(không cần nhân viên can thiệp)</span>
            </p>
          </div>
        </div>

        {/* Tốc độ phản hồi tức thì */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <Zap size={18} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tốc độ phản hồi AI</span>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
              ~{overview.avgResponseTimeSeconds} giây <span className="text-[10px] font-normal text-emerald-600 font-bold">(Tức thì)</span>
            </p>
          </div>
        </div>

        {/* Khách hàng quay lại mua */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
            <UserCheck size={18} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tỷ lệ khách quay lại</span>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
              {overview.repeatCustomerRate}% <span className="text-[10px] font-normal text-slate-400">({overview.repeatCustomers} khách trung thành)</span>
            </p>
          </div>
        </div>
      </div>

      {/* 4. Hàng 3: Biểu Đồ Doanh Thu Theo Ngày & Phễu Chuyển Đổi Bán Hàng */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ doanh thu theo ngày dạng Smooth Area / Line Chart SVG */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <TrendingUp size={16} className="text-emerald-500" />
                <span>Biến động doanh thu & đơn hàng</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Đường sóng xu hướng tăng trưởng theo mốc thời gian
              </p>
            </div>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-full">
              {overview.totalRevenue.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="relative h-64 w-full pt-2">
            {data?.revenueByDay && data.revenueByDay.length > 0 ? (
              (() => {
                const revenueList = data.revenueByDay;
                const svgW = 600;
                const svgH = 220;
                const padLeft = 55;
                const padRight = 20;
                const padTop = 25;
                const padBottom = 35;
                const chartW = svgW - padLeft - padRight;
                const chartH = svgH - padTop - padBottom;

                const maxRev = Math.max(...revenueList.map((d) => d.revenue || 0), 10000);
                // Tạo khoảng trống phía trên đỉnh đường sóng 25% để biểu đồ không bị sát trần
                const yMax = Math.ceil((maxRev * 1.25) / 10000) * 10000 || 50000;

                const pts = revenueList.map((d, i) => {
                  const x =
                    revenueList.length > 1
                      ? padLeft + (i / (revenueList.length - 1)) * chartW
                      : padLeft + chartW / 2;
                  const y = padTop + chartH - ((d.revenue || 0) / yMax) * chartH;
                  return { x, y, ...d };
                });

                // Tạo đường cong Bezier mượt mà (Smooth Cubic Spline)
                let curvePath = '';
                if (pts.length === 1) {
                  curvePath = `M ${pts[0].x} ${pts[0].y}`;
                } else if (pts.length > 1) {
                  curvePath = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
                  for (let i = 0; i < pts.length - 1; i++) {
                    const p0 = pts[i === 0 ? i : i - 1];
                    const p1 = pts[i];
                    const p2 = pts[i + 1];
                    const p3 = pts[i + 2] || p2;
                    const cp1x = p1.x + (p2.x - p0.x) / 6;
                    const cp1y = p1.y + (p2.y - p0.y) / 6;
                    const cp2x = p2.x - (p3.x - p1.x) / 6;
                    const cp2y = p2.y - (p3.y - p1.y) / 6;
                    curvePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
                  }
                }

                const areaPath =
                  pts.length > 1
                    ? `${curvePath} L ${pts[pts.length - 1].x.toFixed(1)} ${padTop + chartH} L ${pts[0].x.toFixed(1)} ${padTop + chartH} Z`
                    : '';

                const formatK = (val) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}Tr`;
                  if (val >= 1000) return `${Math.round(val / 1000)}k`;
                  return `${val} đ`;
                };

                const segW = pts.length > 1 ? chartW / (pts.length - 1) : chartW;
                const activePt = hoveredPointIndex !== null ? pts[hoveredPointIndex] : null;

                return (
                  <>
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full h-full overflow-visible select-none"
                    >
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                          <stop offset="60%" stopColor="#6366f1" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="50%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#3b82f6" floodOpacity="0.45" />
                        </filter>
                      </defs>

                      {/* 1. Trục Y & Đường lưới ngang mờ */}
                      {[1, 0.5, 0].map((ratio, rIdx) => {
                        const lineY = padTop + chartH - ratio * chartH;
                        const labelVal = Math.round(yMax * ratio);
                        return (
                          <g key={rIdx}>
                            <line
                              x1={padLeft}
                              y1={lineY}
                              x2={padLeft + chartW}
                              y2={lineY}
                              stroke="currentColor"
                              strokeDasharray="4 4"
                              className="text-slate-200 dark:text-slate-700/60"
                              strokeWidth="1"
                            />
                            <text
                              x={padLeft - 8}
                              y={lineY + 3.5}
                              textAnchor="end"
                              className="text-[10px] font-mono fill-slate-400 font-semibold"
                            >
                              {formatK(labelVal)}
                            </text>
                          </g>
                        );
                      })}

                      {/* 2. Dải miền màu phát sáng (Area Gradient) */}
                      {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

                      {/* 3. Đường sóng chính (Curved Line) */}
                      {curvePath && (
                        <path
                          d={curvePath}
                          fill="none"
                          stroke="url(#strokeGradient)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#neonGlow)"
                        />
                      )}

                      {/* 4. Đường gióng dọc khi Hover */}
                      {activePt && (
                        <line
                          x1={activePt.x}
                          y1={padTop}
                          x2={activePt.x}
                          y2={padTop + chartH}
                          stroke="#6366f1"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity="0.85"
                        />
                      )}

                      {/* 5. Các điểm mốc (Data Dots) */}
                      {pts.map((pt, i) => {
                        const isHovered = hoveredPointIndex === i;
                        const hasRevenue = (pt.revenue || 0) > 0;
                        return (
                          <g key={i}>
                            {/* Điểm bình thường */}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={hasRevenue ? 4 : 2.5}
                              fill={hasRevenue ? '#ffffff' : '#94a3b8'}
                              stroke={hasRevenue ? '#3b82f6' : '#cbd5e1'}
                              strokeWidth={hasRevenue ? 2.5 : 1}
                              className="transition-all duration-200"
                            />

                            {/* Hiệu ứng phát sáng khi hover */}
                            {isHovered && (
                              <>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="11"
                                  fill="#3b82f6"
                                  fillOpacity="0.25"
                                  className="animate-ping"
                                />
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="6"
                                  fill="#ffffff"
                                  stroke="#4f46e5"
                                  strokeWidth="3.5"
                                />
                              </>
                            )}

                            {/* Nhãn ngày trục X */}
                            <text
                              x={pt.x}
                              y={padTop + chartH + 20}
                              textAnchor="middle"
                              className={`text-[10px] font-mono transition-colors ${
                                isHovered
                                  ? 'fill-blue-600 dark:fill-blue-400 font-black'
                                  : 'fill-slate-400'
                              }`}
                            >
                              {pt._id}
                            </text>

                            {/* Vùng cảm ứng chuột cho từng cột */}
                            <rect
                              x={pt.x - segW / 2}
                              y={padTop}
                              width={segW}
                              height={chartH + 25}
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredPointIndex(i)}
                              onMouseLeave={() => setHoveredPointIndex(null)}
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* 6. Tooltip nổi bật hiển thị chi tiết */}
                    {activePt && (
                      <div
                        style={{
                          left: `${(activePt.x / svgW) * 100}%`,
                          top: `${Math.max(8, (activePt.y / svgH) * 100 - 15)}%`
                        }}
                        className="absolute -translate-x-1/2 -translate-y-full pointer-events-none z-30 transition-all duration-100 ease-out"
                      >
                        <div className="bg-slate-900/95 dark:bg-black/95 text-white p-2.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs backdrop-blur-md space-y-1 min-w-[135px]">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1">
                            <span>Ngày {activePt._id}</span>
                            <span className="text-emerald-400 font-bold">
                              {activePt.ordersCount} đơn
                            </span>
                          </div>
                          <p className="font-black text-sm text-blue-400">
                            {activePt.revenue.toLocaleString('vi-VN')} đ
                          </p>
                          <p className="text-[10px] text-slate-300">
                            AI chốt tự động:{' '}
                            <strong className="text-indigo-300">
                              {activePt.aiOrdersCount || 0}
                            </strong>{' '}
                            đơn
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-1">
                <BarChart3 size={32} className="text-slate-300 dark:text-slate-600 mb-1" />
                <span>Chưa có dữ liệu doanh thu trong khoảng thời gian này</span>
              </div>
            )}
          </div>

          {/* Chú thích biểu đồ */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/40">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></span>
                <span>Doanh thu thực tế</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full border border-blue-500 bg-white"></span>
                <span>Điểm ghi nhận</span>
              </div>
            </div>
            <span>Rê chuột trên đường sóng để xem chi tiết từng ngày</span>
          </div>
        </div>

        {/* Biểu đồ Phễu chuyển đổi bán hàng (Conversion Funnel) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers size={16} className="text-blue-600" />
              <span>Phễu chuyển đổi chốt đơn tự động (AI Funnel)</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
              Chuyển đổi {overview.aiConversionRate}%
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {data?.funnelData ? (
              data.funnelData.map((stage, idx) => {
                const colors = [
                  'from-blue-600 to-blue-500',
                  'from-indigo-600 to-indigo-500',
                  'from-purple-600 to-purple-500',
                  'from-emerald-600 to-emerald-500'
                ];
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>{stage.stage}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-black text-slate-900 dark:text-white">{stage.count}</span>
                        <span className="text-[11px] text-slate-400 ml-1">({stage.percentage}%)</span>
                      </div>
                    </div>

                    {/* Thanh tiến trình phân tầng */}
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(5, stage.percentage)}%` }}
                        className={`h-full bg-gradient-to-r ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-6.5">{stage.desc}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Đang cập nhật phễu chuyển đổi...</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Hàng 4: Tỷ lệ Chốt Đơn (AI vs Người) + Cơ Cấu Trạng Thái Đơn Hàng */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nguồn Chốt Đơn: AI vs Nhân viên */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <PieChart size={16} className="text-indigo-600" />
            <span>Nguồn chốt đơn (AI vs Nhân viên)</span>
          </h3>

          <div className="space-y-4 pt-2">
            {/* AI Gemini */}
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center space-x-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Trợ lý AI Gemini</span>
                </span>
                <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                  {overview.aiOrders} đơn ({overview.totalOrders > 0 ? Math.round((overview.aiOrders / overview.totalOrders) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                <div
                  style={{ width: `${overview.totalOrders > 0 ? (overview.aiOrders / overview.totalOrders) * 100 : 0}%` }}
                  className="h-full bg-blue-600 rounded-full"
                ></div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Doanh thu mang về: <strong className="text-slate-800 dark:text-white">{overview.aiRevenue.toLocaleString('vi-VN')} đ</strong>
              </p>
            </div>

            {/* Nhân viên trực tiếp */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <UserCheck size={14} className="text-slate-500" />
                  <span>Nhân viên tư vấn</span>
                </span>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  {overview.manualOrders} đơn ({overview.totalOrders > 0 ? Math.round((overview.manualOrders / overview.totalOrders) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  style={{ width: `${overview.totalOrders > 0 ? (overview.manualOrders / overview.totalOrders) * 100 : 0}%` }}
                  className="h-full bg-slate-500 rounded-full"
                ></div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Doanh thu mang về: <strong className="text-slate-800 dark:text-white">{overview.manualRevenue.toLocaleString('vi-VN')} đ</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Cơ Cấu Trạng Thái Đơn Hàng */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>Trạng thái vòng đời đơn hàng</span>
          </h3>

          <div className="space-y-3 pt-2">
            {data?.orderStatusDistribution && data.orderStatusDistribution.length > 0 ? (
              data.orderStatusDistribution.map((st, idx) => {
                const percent = overview.totalOrders > 0 ? Math.round((st.count / overview.totalOrders) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                        <span style={{ backgroundColor: st.color }} className="w-2.5 h-2.5 rounded-full shrink-0"></span>
                        <span>{st.label}</span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {st.count} đơn ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%`, backgroundColor: st.color }}
                        className="h-full rounded-full transition-all duration-300"
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có đơn hàng nào</p>
            )}
          </div>
        </div>

        {/* Khung Giờ Vàng Tương Tác Khách Nhắn Tin Trong Ngày */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Clock size={16} className="text-amber-500" />
              <span>Khung giờ vàng tương tác (24h)</span>
            </h3>
            <span className="text-[10px] text-slate-400">0h - 23h</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-1 pt-4 border-b border-slate-100 dark:border-slate-700/50 pb-1">
            {data?.hourlyTraffic && data.hourlyTraffic.length > 0 ? (
              (() => {
                const maxHour = Math.max(...data.hourlyTraffic.map((h) => h.messagesCount || 0), 1);
                return data.hourlyTraffic.map((h, idx) => {
                  const percent = Math.min(100, Math.max(8, Math.round((h.messagesCount / maxHour) * 100)));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                      <div
                        style={{ height: `${percent}%` }}
                        className={`w-full rounded-t-xs transition-all hover:brightness-125 cursor-pointer ${
                          h.messagesCount > 0 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap shadow-xs z-20">
                          {h.hour}h: {h.messagesCount} tin
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center w-full">Chưa có dữ liệu tin nhắn</p>
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Màu vàng cam thể hiện các khung giờ có mật độ khách nhắn tin cao nhất trong ngày
          </p>
        </div>
      </div>

      {/* 6. Hàng 5: Xếp Hạng Sản Phẩm Bán Chạy (Theo Số Lượng Đã Bán) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Package size={16} className="text-blue-600" />
              <span>Xếp Hạng Sản Phẩm Bán Chạy (Theo Số Lượng Đã Bán)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Đo lường số lượng sản phẩm bán ra thực tế từ các đơn hàng chốt thành công
            </p>
          </div>

          {data?.topProducts && data.topProducts.length > 0 && (
            <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
              Tổng đã bán: {data.topProducts.reduce((sum, p) => sum + (p.sold_quantity || 0), 0)} sản phẩm
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.topProducts && data.topProducts.length > 0 ? (
            data.topProducts.map((p, idx) => {
              const soldQty = p.sold_quantity || 0;
              const currentStock = p.stock_available ?? p.stock_physical ?? 0;
              const totalItems = soldQty + currentStock;
              const soldRate = totalItems > 0 ? Math.round((soldQty / totalItems) * 100) : 0;
              const isLowStock = currentStock <= 10 && currentStock > 0;
              const isOutOfStock = currentStock <= 0;

              return (
                <div
                  key={p._id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/60 dark:bg-slate-900/40 transition flex flex-col justify-between space-y-3 relative group"
                >
                  {/* Header thẻ: Rank Badge + Ảnh + Tên & SKU */}
                  <div className="flex items-start space-x-3">
                    {/* Rank Badge */}
                    <div className="relative shrink-0">
                      <img
                        src={p.image_urls?.[0] || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=100'}
                        alt={p.product_name}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white shadow-xs"
                      />
                      <span
                        className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center shadow-md ${
                          idx === 0
                            ? 'bg-amber-500'
                            : idx === 1
                            ? 'bg-slate-400'
                            : idx === 2
                            ? 'bg-amber-700'
                            : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate" title={p.product_name}>
                        {p.product_name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {p.sku}</p>
                      <p className="text-xs font-black text-blue-600 dark:text-blue-400 mt-1">
                        {(p.sale_price || p.base_price).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  </div>

                  {/* Chỉ số trọng tâm: Đã Bán + Tồn Kho */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      {/* ĐÃ BÁN NỔI BẬT */}
                      <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center space-x-1 shadow-xs">
                        <span>🏷️ Đã bán:</span>
                        <strong className="text-blue-800 dark:text-blue-200 text-sm ml-0.5">{soldQty}</strong>
                        <span className="font-normal text-[11px]">cái</span>
                      </span>

                      {/* TỒN KHO THỰC TẾ */}
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                            : isLowStock
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {isOutOfStock ? 'Hết hàng' : isLowStock ? `Sắp hết: ${currentStock}` : `Kho: ${currentStock} cái`}
                      </span>
                    </div>

                    {/* Thanh tỷ lệ bán / tiêu thụ kho */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(2, soldRate)}%` }}
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Tỷ lệ tiêu thụ kho</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">{soldRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-8 text-center text-xs text-slate-400">
              Chưa có sản phẩm nào được bán ra trong khoảng thời gian này
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
