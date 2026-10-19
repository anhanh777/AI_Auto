import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useNotification } from '../../contexts/NotificationContext.jsx';
import { authService } from '../../services/auth.service.js';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingCart,
  Users,
  Brain,
  ShieldCheck,
  UserCheck,
  Sun,
  Moon,
  LogOut,
  Bell,
  Sparkles,
  Grid,
  Pin,
  Search,
  ChevronDown,
  Building2,
  User,
  KeyRound,
  Globe,
  Languages,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCheck,
  Trash2,
  X,
  Bot,
  BarChart3,
  Plus,
  Check,
  Store,
  Clock,
  Images
} from 'lucide-react';

import JoinOrCreateBusinessModal from '../modals/JoinOrCreateBusinessModal.jsx';
import ProfileModal from '../modals/ProfileModal.jsx';

const MainLayout = () => {
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { businesses, activeBusiness, switchBusiness, exitBusiness } = useBusiness();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const isPortal = location.pathname === '/dashboard' || location.pathname === '/';

  // Danh mục toàn bộ 8 Ứng dụng của Business (Khớp hoàn toàn Hệ thống & Multi-Tenant)
  const allApplications = [
    { id: 'chat', name: 'Nhắn tin', path: '/livechat', icon: MessageSquare, permission: 'CHAT_VIEW', badge: 'AI Active', category: 'Tư vấn' },
    { id: 'bot_auto', name: 'Bot-Auto', path: '/bot-auto', icon: Bot, permission: 'AI_CONFIG_MANAGE', category: 'Trí tuệ nhân tạo' },
    { id: 'customers', name: 'Khách hàng', path: '/customers', icon: Users, permission: 'CUSTOMER_VIEW', category: 'Kinh doanh' },
    { id: 'analytics', name: 'Thống kê', path: '/analytics', icon: BarChart3, permission: 'DASHBOARD_VIEW', category: 'Báo cáo' },
    { id: 'products', name: 'Sản phẩm & Kho', path: '/products', icon: Package, permission: 'PRODUCT_VIEW', category: 'Kinh doanh' },
    { id: 'media', name: 'Kho Tư liệu & Media', path: '/media', icon: Images, permission: 'PRODUCT_VIEW', category: 'Kinh doanh' },
    { id: 'orders', name: 'Quản lý Đơn hàng', path: '/orders', icon: ShoppingCart, permission: 'ORDER_VIEW', category: 'Kinh doanh' },
    { id: 'knowledge', name: 'Kho Tri Thức RAG', path: '/knowledge', icon: Brain, permission: 'KNOWLEDGE_MANAGE', category: 'Trí tuệ nhân tạo' },
    { id: 'users', name: 'Quản lý Thành viên', path: '/settings/users', icon: UserCheck, permission: 'USER_MANAGE', category: 'Hệ thống' },
    { id: 'business', name: 'Doanh nghiệp', path: '/settings/business', icon: Building2, permission: 'BUSINESS_MANAGE', category: 'Hệ thống' }
  ];


  const [pinnedAppIds, setPinnedAppIds] = useState(() => {
    const saved = localStorage.getItem('ai_sales_pinned_apps');
    return saved ? JSON.parse(saved) : ['chat', 'bot_auto', 'customers', 'products', 'media', 'orders'];
  });

  // State Dropdowns & Modals
  const [showAppLauncher, setShowAppLauncher] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notificationTab, setNotificationTab] = useState('all'); // 'all' | 'unread'
  const [appSearch, setAppSearch] = useState('');

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState('profile');
  const [showJoinOrCreateModal, setShowJoinOrCreateModal] = useState(false);
  const [modalDefaultStep, setModalDefaultStep] = useState('select');

  const launcherRef = useRef(null);
  const userDropdownRef = useRef(null);
  const businessDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (launcherRef.current && !launcherRef.current.contains(event.target)) {
        setShowAppLauncher(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (businessDropdownRef.current && !businessDropdownRef.current.contains(event.target)) {
        setShowBusinessDropdown(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format thời gian thông báo tương đối
  const formatNotificationTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${min}`;
  };

  const togglePinApp = (e, appId) => {
    e.stopPropagation();
    setPinnedAppIds((prev) => {
      let updated = prev.includes(appId) ? (prev.length <= 1 ? prev : prev.filter((id) => id !== appId)) : [...prev, appId];
      localStorage.setItem('ai_sales_pinned_apps', JSON.stringify(updated));
      return updated;
    });
  };

  const headerPinnedApps = allApplications.filter(
    (app) => pinnedAppIds.includes(app.id) && (!app.permission || hasPermission(app.permission))
  );

  const filteredLauncherApps = allApplications.filter((app) => {
    const matches = app.name.toLowerCase().includes(appSearch.toLowerCase()) || app.category.toLowerCase().includes(appSearch.toLowerCase());
    return matches && (!app.permission || hasPermission(app.permission));
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* ================= TOP HEADER (#17234e) ================= */}
      <header className="h-14 bg-[#17234e] text-white flex items-center justify-between px-3 sm:px-6 shadow-md z-30 sticky top-0">
        <div className="flex items-center space-x-3 lg:space-x-5 overflow-x-auto no-scrollbar">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center space-x-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow">
              <Sparkles size={17} />
            </div>
            <span className="font-extrabold text-base sm:text-lg text-white tracking-tight hidden sm:inline-block">
              AISales<span className="text-blue-400">.ai</span>
            </span>
          </NavLink>

          {/* CHỈ HIỂN THỊ STORE SWITCHER VÀ CÁC NÚT ĐIỀU HƯỚNG KHI ĐÃ VÀO CỬA HÀNG (KHÔNG Ở TRANG PORTAL /dashboard) */}
          {!isPortal && (
            <>


              {/* CÁC NÚT ĐƯỢC GHIM ĐỘNG LÊN HEADER */}
              <nav className="flex items-center space-x-1 shrink-0">
                {headerPinnedApps.map((app) => {
                  const Icon = app.icon;
                  const isActive = location.pathname === app.path;

                  return (
                    <NavLink
                      key={app.id}
                      to={app.path}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white shadow-inner font-bold'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-blue-300' : 'text-slate-400'} />
                      <span>{app.name}</span>
                      {app.badge && (
                        <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                          {app.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </>
          )}
        </div>

        {/* NÚT TIỆN ÍCH BÊN PHẢI */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* NÚT APP LAUNCHER CHỈ HIỆN KHI Ở TRONG CỬA HÀNG */}
          {!isPortal && (
            <div className="relative" ref={launcherRef}>
              <button
                type="button"
                onClick={() => {
                  setShowAppLauncher(!showAppLauncher);
                  setShowUserDropdown(false);
                  setShowBusinessDropdown(false);
                }}
                className={`p-2 rounded-xl transition flex items-center justify-center cursor-pointer ${
                  showAppLauncher
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white'
                }`}
                title="Mở toàn bộ danh mục Ứng dụng & Ghim lên Header"
              >
                <Grid size={18} />
              </button>

              {/* MODAL LAUNCHER DROPDOWN */}
              {showAppLauncher && (
                <div className="absolute top-12 right-0 w-[340px] sm:w-[540px] md:w-[680px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 text-slate-800 dark:text-slate-100 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm ứng dụng..."
                        value={appSearch}
                        onChange={(e) => setAppSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block">
                      Click biểu tượng Ghim để Ghim/Bỏ ghim lên Header
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 max-h-[380px] overflow-y-auto pr-1">
                    {filteredLauncherApps.map((app) => {
                      const Icon = app.icon;
                      const isPinned = pinnedAppIds.includes(app.id);

                      return (
                        <div
                          key={app.id}
                          onClick={() => {
                            navigate(app.path);
                            setShowAppLauncher(false);
                          }}
                          className={`p-3 rounded-xl border transition flex items-center justify-between group cursor-pointer ${
                            isPinned
                              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                              : 'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className={`p-2 rounded-lg ${isPinned ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-blue-600'}`}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold leading-tight line-clamp-1">{app.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{app.category}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => togglePinApp(e, app.id)}
                            className={`p-1.5 rounded-lg transition ${
                              isPinned
                                ? 'text-[#f05a28] hover:bg-orange-100 dark:hover:bg-orange-950/40'
                                : 'text-slate-300 hover:text-slate-600 dark:hover:text-slate-100'
                            }`}
                            title={isPinned ? 'Bỏ ghim khỏi Header' : 'Ghim ứng dụng lên Header'}
                          >
                            <Pin size={15} className={isPinned ? 'fill-[#f05a28]' : ''} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nút chuyển đổi Sáng / Tối */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition flex items-center justify-center cursor-pointer"
            title={isDark ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
          >
            {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-blue-300" />}
          </button>

          {/* ================= CHUÔNG THÔNG BÁO ================= */}
          <div className="relative" ref={notificationDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotificationDropdown(!showNotificationDropdown);
                setShowUserDropdown(false);
                setShowAppLauncher(false);
                setShowBusinessDropdown(false);
              }}
              className={`p-1.5 sm:p-2 rounded-xl transition relative flex items-center justify-center cursor-pointer ${
                showNotificationDropdown
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
              title="Trung tâm thông báo hệ thống"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center absolute -top-1 -right-1 shadow-sm ring-2 ring-[#17234e] animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* DROPDOWN TRUNG TÂM THÔNG BÁO */}
            {showNotificationDropdown && (
              <div className="absolute top-12 right-0 w-[350px] sm:w-[420px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-3 text-slate-800 dark:text-slate-100 z-50 animate-fadeIn overflow-hidden">
                {/* Header Dropdown */}
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Thông báo
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-bold border border-rose-200 dark:border-rose-900/40">
                        {unreadCount} mới
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                        title="Đánh dấu tất cả là đã đọc"
                      >
                        <CheckCheck size={14} />
                        <span>Đã đọc tất cả</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllNotifications}
                        className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 flex items-center space-x-1 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Xóa toàn bộ lịch sử thông báo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center px-4 pt-2 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 text-xs font-bold gap-2">
                  <button
                    type="button"
                    onClick={() => setNotificationTab('all')}
                    className={`pb-2 px-2.5 border-b-2 transition cursor-pointer ${
                      notificationTab === 'all'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    Tất cả ({notifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotificationTab('unread')}
                    className={`pb-2 px-2.5 border-b-2 transition cursor-pointer ${
                      notificationTab === 'unread'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    Chưa đọc ({unreadCount})
                  </button>
                </div>

                {/* Danh sách Thông báo */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                  {(() => {
                    const filtered = notifications.filter(
                      (n) => notificationTab === 'all' || !n.is_read
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="py-10 px-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-2 text-slate-400">
                            <Bell size={22} />
                          </div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Không có thông báo nào
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {notificationTab === 'unread'
                              ? 'Bạn đã đọc hết tất cả các thông báo.'
                              : 'Các thông báo và cập nhật mới sẽ hiển thị tại đây.'}
                          </p>
                        </div>
                      );
                    }

                    return filtered.map((item) => {
                      const isUnread = !item.is_read;

                      const getIcon = () => {
                        switch (item.type) {
                          case 'success':
                            return <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />;
                          case 'error':
                            return <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />;
                          case 'warning':
                            return <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />;
                          case 'join_request':
                            return <Clock size={16} className="text-orange-500 shrink-0 mt-0.5" />;
                          default:
                            return <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />;
                        }
                      };

                      const itemId = item._id || item.id;

                      return (
                        <div
                          key={itemId}
                          onClick={() => {
                            markAsRead(itemId);
                            if (item.link) {
                              navigate(item.link);
                              setShowNotificationDropdown(false);
                            }
                          }}
                          className={`p-3.5 transition flex items-start justify-between gap-2.5 cursor-pointer group ${
                            isUnread
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/40'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                          }`}
                        >
                          <div className="flex items-start space-x-3 min-w-0 flex-1">
                            {getIcon()}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                  {item.title}
                                </h4>
                                {isUnread && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words">
                                {item.message}
                              </p>
                              <span className="text-[10px] text-slate-400 mt-1.5 block">
                                {formatNotificationTime(item.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Nút xóa 1 thông báo */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(itemId);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-white dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
                            title="Xóa thông báo này"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-white/20"></div>

          {/* ================= USER PROFILE DROPDOWN ================= */}
          <div className="relative" ref={userDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowAppLauncher(false);
                setShowBusinessDropdown(false);
              }}
              className="flex items-center space-x-1.5 p-1 rounded-full hover:bg-white/15 transition cursor-pointer"
            >
              <div className="relative">
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={user?.full_name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                  }}
                  className="w-8 h-8 rounded-full object-cover border-2 border-blue-400/80 shadow"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#17234e] absolute bottom-0 right-0"></span>
              </div>
              <ChevronDown size={14} className="text-slate-300" />
            </button>

            {/* POPOVER MENU HỒ SƠ CÁ NHÂN */}
            {showUserDropdown && (
              <div className="absolute top-12 right-0 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-3 text-slate-800 dark:text-slate-100 z-50 animate-fadeIn">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/80 flex items-center space-x-3">
                  <div className="relative shrink-0">
                    <img
                      src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={user?.full_name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                      }}
                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-sm"
                    />
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 absolute bottom-0 right-0"></span>
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {user?.full_name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {user?.email}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full text-[10px] font-bold">
                      {user?.role_id?.name === 'ADMIN' ? '👑 Quản trị viên' : 'Thành viên'}
                    </span>
                  </div>
                </div>

                {/* Danh mục menu lựa chọn */}
                <div className="py-2 px-2 text-xs font-medium space-y-0.5">
                  <button
                    onClick={() => {
                      setProfileModalTab('profile');
                      setShowProfileModal(true);
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition text-left cursor-pointer"
                  >
                    <User size={16} className="text-slate-400" />
                    <span>Hồ sơ cá nhân</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileModalTab('password');
                      setShowProfileModal(true);
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition text-left cursor-pointer"
                  >
                    <KeyRound size={16} className="text-slate-400" />
                    <span>Đổi mật khẩu</span>
                  </button>

                  <div className="flex items-center justify-between px-3 py-2.5 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <div className="flex items-center space-x-3">
                      <Globe size={16} className="text-slate-400" />
                      <span>Vùng/quốc gia</span>
                    </div>
                    <span className="text-slate-400 font-mono font-bold">[VN]</span>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2.5 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <div className="flex items-center space-x-3">
                      <Languages size={16} className="text-slate-400" />
                      <span>Ngôn ngữ</span>
                    </div>
                    <span className="text-xs font-bold text-rose-500">Tiếng Việt (VN)</span>
                  </div>
                </div>

                <div className="pt-2 px-2 border-t border-slate-100 dark:border-slate-700/80">
                  <button
                    onClick={logout}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 hover:text-red-600 font-bold transition text-left cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= MODAL: THAM GIA HOẶC TẠO BUSINESS MỚI (MULTI-TENANT) ================= */}
      <JoinOrCreateBusinessModal
        isOpen={showJoinOrCreateModal}
        onClose={() => setShowJoinOrCreateModal(false)}
        defaultStep={modalDefaultStep}
      />

      {/* ================= MODAL: HỒ SƠ CÁ NHÂN & ĐỔI MẬT KHẨU ================= */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        defaultTab={profileModalTab}
      />

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
