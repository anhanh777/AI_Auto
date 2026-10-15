import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { customerService } from '../../services/customer.service.js';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { socket } from '../../utils/socket.js';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Tag,
  ShoppingBag,
  Facebook,
  Trash2,
  Edit2,
  X,
  Eye,
  Crown,
  MessageSquare,
  Calendar,
  Sparkles,
  ExternalLink,
  DollarSign,
  Package,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Copy,
  Check,
  Send,
  Save,
  MessageCircle,
  Building2,
  Globe,
  Store
} from 'lucide-react';

const CustomerListPage = () => {
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // State
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1
  });
  const [stats, setStats] = useState({
    total_customers: 0,
    vip_customers: 0,
    facebook_customers: 0,
    with_phone_count: 0,
    new_customers_this_month: 0,
    total_spend: 0,
    total_orders: 0
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [hasPhoneFilter, setHasPhoneFilter] = useState(''); // '' | 'yes' | 'no'
  const [sortBy, setSortBy] = useState('updated_at');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận xóa',
    cancelText: 'Hủy bỏ',
    type: 'danger',
    loading: false,
    onConfirm: () => {}
  });
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailTab, setDetailTab] = useState('info'); // 'info' | 'orders'
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Form State
  const initialForm = {
    full_name: '',
    phone: '',
    email: '',
    address: '',
    tags: '',
    source: 'manual',
    notes: ''
  };
  const [form, setForm] = useState(initialForm);

  // Load KPI Stats
  const fetchStats = useCallback(async () => {
    if (!activeBusiness?._id) return;
    try {
      setStatsLoading(true);
      const res = await customerService.getCustomerStats(activeBusiness._id);
      const data = res?.data || res;
      if (data && typeof data === 'object') {
        setStats(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải thống kê khách hàng:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [activeBusiness?._id]);

  // Load Customers
  const fetchCustomers = useCallback(async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoading(true);
      const res = await customerService.getCustomers({
        business_id: activeBusiness._id,
        page,
        limit: 10,
        search: search.trim() || undefined,
        tag: selectedTag || undefined,
        source: selectedSource || undefined,
        has_phone: hasPhoneFilter || undefined,
        sortBy,
        order: 'desc'
      });
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setCustomers(list);
        const pag = res?.pagination || res?.meta?.pagination;
        if (pag) {
          setPagination(pag);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách khách hàng:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?._id, page, search, selectedTag, selectedSource, hasPhoneFilter, sortBy]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Lắng nghe Socket.IO thời gian thực khi có khách mới / tin nhắn mới
  useEffect(() => {
    const handleRealtimeCustomer = () => {
      fetchCustomers();
      fetchStats();
    };

    socket.on('customer_updated', handleRealtimeCustomer);
    socket.on('new_incoming_message', handleRealtimeCustomer);
    socket.on('conversation_updated', handleRealtimeCustomer);

    return () => {
      socket.off('customer_updated', handleRealtimeCustomer);
      socket.off('new_incoming_message', handleRealtimeCustomer);
      socket.off('conversation_updated', handleRealtimeCustomer);
    };
  }, [fetchCustomers, fetchStats]);

  // Format ngày giờ đầy đủ chuẩn: hh:mm dd/mm/yyyy
  const formatFullDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  // Format thời gian tương tác cuối (tương đối)
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Chưa có';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Chưa có';
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Render Badge Kênh tiếp cận của khách hàng
  const renderChannelBadge = (c) => {
    const isFacebook = c.source === 'facebook' || !!c.psid || !!c.channel_name;
    if (isFacebook) {
      return (
        <div className="inline-flex flex-col items-start gap-1">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60">
            <Facebook size={12} className="text-[#1877F2] shrink-0" />
            <span className="font-bold truncate max-w-[130px]" title={c.channel_name ? `Fanpage: ${c.channel_name}` : 'Facebook Messenger'}>
              {c.channel_name || 'Facebook'}
            </span>
          </span>
          {c.psid && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono pl-0.5">
              ID: {c.psid.slice(0, 8)}...
            </span>
          )}
        </div>
      );
    }

    if (c.source === 'zalo') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60">
          <MessageCircle size={12} className="text-blue-500 shrink-0" />
          <span>Zalo OA</span>
        </span>
      );
    }

    if (c.source === 'web' || c.source === 'website') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
          <Globe size={12} className="text-indigo-500 shrink-0" />
          <span>Website</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <Store size={12} className="text-slate-500 shrink-0" />
        <span>Tại quầy</span>
      </span>
    );
  };

  // Copy helper
  const handleCopy = (text, label, e) => {
    e?.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    showToast('success', `Đã sao chép ${label}: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Chuyển thẳng sang LiveChat với khách
  const handleGoToChat = (customer, e) => {
    e?.stopPropagation();
    if (customer.channel_id) {
      navigate(`/livechat?channel_id=${customer.channel_id}&customer_id=${customer._id}`);
    } else {
      navigate(`/livechat?customer_id=${customer._id}`);
    }
  };

  // Gắn / Gỡ nhãn nhanh (1-click)
  const handleToggleTag = async (customer, tagToToggle, e) => {
    e?.stopPropagation();
    const currentTags = customer.tags || [];
    const hasTag = currentTags.includes(tagToToggle);
    const newTags = hasTag
      ? currentTags.filter((t) => t !== tagToToggle)
      : [...currentTags, tagToToggle];

    try {
      const res = await customerService.updateCustomer(customer._id, { tags: newTags });
      if (res.success) {
        showToast('success', hasTag ? `Đã gỡ nhãn "${tagToToggle}"` : `Đã gắn nhãn "${tagToToggle}"`);
        setCustomers((prev) =>
          prev.map((c) => (c._id === customer._id ? { ...c, tags: newTags } : c))
        );
        if (detailCustomer?._id === customer._id) {
          setDetailCustomer((prev) => ({ ...prev, tags: newTags }));
        }
        fetchStats();
      }
    } catch (err) {
      showToast('error', 'Lỗi khi cập nhật nhãn');
    }
  };

  // Lưu ghi chú nội bộ
  const handleSaveNote = async () => {
    if (!detailCustomer?._id) return;
    try {
      setSavingNote(true);
      const res = await customerService.updateCustomer(detailCustomer._id, { notes: noteText });
      if (res.success) {
        showToast('success', 'Đã lưu ghi chú khách hàng thành công!');
        setDetailCustomer((prev) => ({ ...prev, notes: noteText }));
        setCustomers((prev) =>
          prev.map((c) => (c._id === detailCustomer._id ? { ...c, notes: noteText } : c))
        );
      }
    } catch (err) {
      showToast('error', 'Lỗi khi lưu ghi chú');
    } finally {
      setSavingNote(false);
    }
  };

  // Load orders when customer detail modal opens orders tab
  const handleOpenDetail = async (customer, tab = 'info') => {
    setDetailCustomer(customer);
    setDetailTab(tab);
    setNoteText(customer.notes || '');
    if (tab === 'orders') {
      loadCustomerOrders(customer._id);
    }
  };

  const loadCustomerOrders = async (customerId) => {
    try {
      setOrdersLoading(true);
      const res = await customerService.getCustomerOrders(customerId, activeBusiness?._id);
      if (res.success && Array.isArray(res.data)) {
        setCustomerOrders(res.data);
      } else {
        setCustomerOrders([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng của khách:', err);
      setCustomerOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setForm(initialForm);
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (customer) => {
    setEditingCustomer(customer);
    setForm({
      full_name: customer.full_name || '',
      phone: customer.phone || customer.phone_number || '',
      email: customer.email || '',
      address: customer.address || customer.shipping_address || '',
      tags: Array.isArray(customer.tags) ? customer.tags.join(', ') : (customer.tags || ''),
      source: customer.source || 'manual',
      notes: customer.notes || ''
    });
    setShowAddEditModal(true);
  };

  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      showToast('error', 'Họ tên khách hàng là bắt buộc');
      return;
    }

    try {
      setSubmitting(true);
      const tagsArray = form.tags
        ? form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        tags: tagsArray,
        source: form.source,
        notes: form.notes.trim(),
        business_id: activeBusiness._id
      };

      if (editingCustomer) {
        const res = await customerService.updateCustomer(editingCustomer._id, payload);
        if (res.success) {
          showToast('success', 'Cập nhật thông tin khách hàng thành công!');
          setShowAddEditModal(false);
          fetchCustomers();
          fetchStats();
          if (detailCustomer?._id === editingCustomer._id) {
            setDetailCustomer({ ...detailCustomer, ...payload });
          }
        }
      } else {
        const res = await customerService.createCustomer(payload);
        if (res.success) {
          showToast('success', 'Thêm khách hàng mới thành công!');
          setShowAddEditModal(false);
          setForm(initialForm);
          fetchCustomers();
          fetchStats();
        }
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, name) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa thông tin khách hàng',
      message: `Bạn có chắc chắn muốn xóa khách hàng "${name}" khỏi danh sách khách hàng của cửa hàng?`,
      confirmText: 'Xóa khách hàng',
      cancelText: 'Hủy bỏ',
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          const res = await customerService.deleteCustomer(id, activeBusiness._id);
          if (res.success) {
            showToast('success', 'Đã xóa khách hàng thành công');
            fetchCustomers();
            fetchStats();
            if (detailCustomer?._id === id) {
              setDetailCustomer(null);
            }
          }
        } catch (err) {
          showToast('error', err.response?.data?.message || err.message || 'Lỗi khi xóa khách hàng');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  const getOrderStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'COMPLETED':
      case 'DELIVERED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">Giao thành công</span>;
      case 'SHIPPING':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">Đang giao hàng</span>;
      case 'CONFIRMED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400">Đã xác nhận</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">Đã hủy</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">Chờ xử lý</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* 1. Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f05a28] to-[#ff7e54] flex items-center justify-center text-white shadow-md shadow-[#f05a28]/20">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Quản lý Khách Hàng (CRM)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                  {pagination.totalItems || customers.length} liên hệ
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hồ sơ khách hàng đa kênh tích hợp trích xuất tự động qua Facebook Live Chat & AI Gemini NER
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => {
              fetchCustomers();
              fetchStats();
            }}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-sm transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} className={loading || statsLoading ? 'animate-spin text-[#f05a28]' : ''} />
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#f05a28] hover:bg-[#e04d1c] text-white rounded-xl text-xs font-bold shadow-md shadow-[#f05a28]/20 transition cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Tổng khách hàng */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:border-[#f05a28]/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tổng khách hàng</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {statsLoading ? '...' : (stats.total_customers || 0).toLocaleString('vi-VN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <UserCheck size={12} className="text-blue-500" />
            <span>Toàn bộ hồ sơ lưu trữ</span>
          </p>
        </div>

        {/* Card 2: Khách VIP */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Khách VIP</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
              <Crown size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {statsLoading ? '...' : (stats.vip_customers || 0).toLocaleString('vi-VN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500" />
            <span>Tệp khách hàng thân thiết</span>
          </p>
        </div>

        {/* Card 3: Khách từ Facebook / Fanpage */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:border-sky-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Fanpage / Messenger</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center">
              <Facebook size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {statsLoading ? '...' : (stats.facebook_customers || 0).toLocaleString('vi-VN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <MessageSquare size={12} className="text-sky-500" />
            <span>Đồng bộ từ tin nhắn Facebook</span>
          </p>
        </div>

        {/* Card 4: Đã có Số điện thoại */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Đã có SĐT</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center">
              <Phone size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {statsLoading ? '...' : (stats.with_phone_count || 0).toLocaleString('vi-VN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>
              {stats.total_customers > 0
                ? `${Math.round(((stats.with_phone_count || 0) / stats.total_customers) * 100)}% tệp khách có SĐT`
                : 'Sẵn sàng chốt đơn'}
            </span>
          </p>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo Tên, Số điện thoại, Email, PSID, hoặc Địa chỉ..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f05a28]"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-2">
            {/* Lọc theo SĐT */}
            <select
              value={hasPhoneFilter}
              onChange={(e) => {
                setHasPhoneFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#f05a28]"
            >
              <option value="">Tất cả liên hệ</option>
              <option value="yes">🟢 Đã có SĐT</option>
              <option value="no">⚪ Chưa có SĐT</option>
            </select>

            {/* Source select */}
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#f05a28]"
            >
              <option value="">Tất cả nguồn</option>
              <option value="facebook">Facebook Fanpage</option>
              <option value="manual">Tạo thủ công</option>
              <option value="web">Website / Landing</option>
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#f05a28]"
            >
              <option value="updated_at">Mới tương tác nhất</option>
              <option value="created_at">Mới tạo nhất</option>
              <option value="total_spend_amount">Chi tiêu cao nhất</option>
              <option value="total_orders_count">Nhiều đơn hàng nhất</option>
            </select>
          </div>
        </div>

        {/* Quick Tag Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Thẻ gắn:</span>
          <button
            type="button"
            onClick={() => {
              setSelectedTag('');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
              selectedTag === ''
                ? 'bg-[#f05a28] text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTag('VIP');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
              selectedTag === 'VIP'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
            }`}
          >
            ⭐ Khách VIP
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTag('Tiềm năng');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
              selectedTag === 'Tiềm năng' || selectedTag === 'TIEM_NANG'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100'
            }`}
          >
            Tiềm năng
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTag('Khách mới');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
              selectedTag === 'Khách mới' || selectedTag === 'KHACH_MOI'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            Khách mới
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTag('Đã mua hàng');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
              selectedTag === 'Đã mua hàng' || selectedTag === 'DA_MUA'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100'
            }`}
          >
            Đã mua hàng
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTag('BO_BOM');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
              selectedTag === 'BO_BOM' || selectedTag === 'Bom hàng'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            ⚠️ Cảnh giác bom hàng
          </button>
        </div>
      </div>

      {/* 4. Customer Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-[#f05a28]" />
            <span>Đang tải danh sách khách hàng...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Users size={32} />
            </div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Chưa có khách hàng phù hợp</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Khách hàng tương tác qua Facebook Fanpage hoặc được thêm mới sẽ hiển thị tại đây.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#f05a28] text-white rounded-xl text-xs font-bold shadow hover:bg-[#e04d1c] transition"
            >
              <Plus size={15} />
              <span>Thêm khách hàng ngay</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700/80 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-bold min-w-[200px]">Khách hàng</th>
                  <th className="py-3.5 px-4 font-bold">Kênh tiếp cận</th>
                  <th className="py-3.5 px-4 font-bold">Liên hệ</th>
                  <th className="py-3.5 px-4 font-bold">Địa chỉ giao hàng</th>
                  <th className="py-3.5 px-4 font-bold">Thẻ phân loại</th>
                  <th className="py-3.5 px-4 font-bold text-center">Đơn hàng</th>
                  <th className="py-3.5 px-4 font-bold text-right">Tổng chi tiêu</th>
                  <th className="py-3.5 px-4 font-bold text-center">Ngày đăng ký</th>
                  <th className="py-3.5 px-4 font-bold text-center">Tương tác cuối</th>
                  <th className="py-3.5 px-4 font-bold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {customers.map((c) => {
                  const isVip = (c.tags || []).some((t) => t.toUpperCase().includes('VIP'));

                  return (
                    <tr
                      key={c._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition group cursor-pointer"
                      onClick={() => handleOpenDetail(c, 'info')}
                    >
                      {/* Customer Info */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="flex items-center space-x-3">
                          <div className="relative w-11 h-11 shrink-0 aspect-square">
                            <img
                              src={c.avatar || c.profile_pic_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={c.full_name}
                              className="w-11 h-11 shrink-0 aspect-square rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                            />
                            {isVip && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] shadow">
                                <Crown size={9} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <p className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-[#f05a28] transition truncate" title={c.full_name}>
                                {c.full_name}
                              </p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              KH-{c._id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Kênh khách hàng */}
                      <td className="py-3.5 px-4">
                        {renderChannelBadge(c)}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5 font-medium group/phone">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            {c.phone || c.phone_number ? (
                              <div className="flex items-center space-x-1">
                                <span className="font-semibold">{c.phone || c.phone_number}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(c.phone || c.phone_number, 'số điện thoại', e)}
                                  className="p-1 text-slate-400 hover:text-[#f05a28] rounded opacity-0 group-hover/phone:opacity-100 transition"
                                  title="Sao chép SĐT"
                                >
                                  {copiedId === (c.phone || c.phone_number) ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Chưa có SĐT</span>
                            )}
                          </div>
                          {c.email && (
                            <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 text-[11px] group/email">
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate max-w-[140px]">{c.email}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(c.email, 'email', e)}
                                className="p-0.5 text-slate-400 hover:text-[#f05a28] rounded opacity-0 group-hover/email:opacity-100 transition"
                                title="Sao chép email"
                              >
                                <Copy size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-[220px]">
                        {c.address || c.shipping_address ? (
                          <div className="flex items-start justify-between group/addr">
                            <div className="flex items-start space-x-1 truncate">
                              <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                              <span className="truncate" title={c.address || c.shipping_address}>
                                {c.address || c.shipping_address}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(c.address || c.shipping_address, 'địa chỉ', e)}
                              className="p-1 text-slate-400 hover:text-[#f05a28] rounded opacity-0 group-hover/addr:opacity-100 transition shrink-0 ml-1"
                              title="Sao chép địa chỉ"
                            >
                              {copiedId === (c.address || c.shipping_address) ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa cập nhật</span>
                        )}
                      </td>

                      {/* Tags */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                          {c.tags && c.tags.length > 0 ? (
                            c.tags.map((t, idx) => {
                              const isTagVip = t.toUpperCase().includes('VIP');
                              const isTagDanger = t.toUpperCase().includes('BOM');
                              return (
                                <span
                                  key={idx}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    isTagVip
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                      : isTagDanger
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300'
                                  }`}
                                >
                                  {t}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleToggleTag(c, 'VIP', e)}
                            className={`p-1 rounded text-[10px] font-bold transition opacity-60 hover:opacity-100 ${
                              isVip ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-amber-500'
                            }`}
                            title={isVip ? 'Gỡ nhãn VIP' : 'Gắn nhãn VIP nhanh'}
                          >
                            <Crown size={12} className={isVip ? 'fill-amber-500' : ''} />
                          </button>
                        </div>
                      </td>

                      {/* Orders */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {c.total_orders_count || 0}
                        </span>
                      </td>

                      {/* Total Spend */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-extrabold text-[#f05a28] dark:text-[#ff7e54]">
                          {(c.total_spend_amount || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </td>

                      {/* Ngày đăng ký (Created At) */}
                      <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-medium text-[11px] font-mono">
                          <Calendar size={12} className="text-slate-400 shrink-0" />
                          <span>{formatFullDateTime(c.created_at || c.createdAt)}</span>
                        </span>
                      </td>

                      {/* Tương tác lần cuối (Last Interaction) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-[11px] font-semibold text-slate-700 dark:text-slate-200 font-mono">
                          <Clock size={12} className="text-sky-500 shrink-0" />
                          <span>{formatFullDateTime(c.last_interaction_at || c.updated_at || c.updatedAt)}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={(e) => handleGoToChat(c, e)}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition cursor-pointer"
                            title="Mở cuộc trò chuyện trên LiveChat"
                          >
                            <MessageSquare size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(c, 'info')}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                            title="Xem chi tiết & lịch sử đơn"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                            title="Sửa hồ sơ khách"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c._id, c.full_name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            title="Xóa khách hàng"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <div>
              Trang <span className="font-bold text-slate-700 dark:text-slate-200">{pagination.currentPage}</span> / {pagination.totalPages} (Tổng số {pagination.totalItems} khách)
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Customer Detail Modal (Info + Order History tabs) */}
      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative text-slate-800 dark:text-slate-100 max-h-[90vh] flex flex-col">
            {/* Close button */}
            <button
              onClick={() => setDetailCustomer(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <X size={20} />
            </button>

            {/* Modal Header Profile */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <img
                  src={detailCustomer.avatar || detailCustomer.profile_pic_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={detailCustomer.full_name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {detailCustomer.full_name}
                    </h3>
                    {detailCustomer.tags?.some((t) => t.toUpperCase().includes('VIP')) && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                        <Crown size={11} />
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                    <span>Nguồn: <strong>{detailCustomer.source === 'facebook' ? 'Facebook Fanpage' : 'Trực tiếp'}</strong></span>
                    {detailCustomer.psid && (
                      <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        PSID: {detailCustomer.psid}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Chat Jump Button */}
              <button
                type="button"
                onClick={(e) => handleGoToChat(detailCustomer, e)}
                className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 transition flex items-center space-x-1.5 mr-8 cursor-pointer"
              >
                <MessageSquare size={14} />
                <span>Nhắn tin LiveChat</span>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center space-x-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDetailTab('info')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                  detailTab === 'info'
                    ? 'bg-[#f05a28] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Users size={14} />
                <span>Hồ sơ & Ghi chú</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetailTab('orders');
                  loadCustomerOrders(detailCustomer._id);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                  detailTab === 'orders'
                    ? 'bg-[#f05a28] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <ShoppingBag size={14} />
                <span>Lịch sử đơn hàng</span>
              </button>
            </div>

            {/* Tab 1 Content: Info & AI Notes */}
            {detailTab === 'info' && (
              <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1 text-xs">
                {/* Contact grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 group/p">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Số điện thoại liên lạc:</span>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Phone size={13} className="text-[#f05a28]" />
                        <span>{detailCustomer.phone || detailCustomer.phone_number || 'Chưa cung cấp'}</span>
                      </p>
                      {(detailCustomer.phone || detailCustomer.phone_number) && (
                        <button
                          type="button"
                          onClick={(e) => handleCopy(detailCustomer.phone || detailCustomer.phone_number, 'SĐT', e)}
                          className="p-1 text-slate-400 hover:text-[#f05a28] rounded opacity-0 group-hover/p:opacity-100 transition"
                          title="Sao chép"
                        >
                          {copiedId === (detailCustomer.phone || detailCustomer.phone_number) ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 group/e">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Email:</span>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Mail size={13} className="text-[#f05a28]" />
                        <span className="truncate max-w-[150px]">{detailCustomer.email || 'Chưa cung cấp'}</span>
                      </p>
                      {detailCustomer.email && (
                        <button
                          type="button"
                          onClick={(e) => handleCopy(detailCustomer.email, 'email', e)}
                          className="p-1 text-slate-400 hover:text-[#f05a28] rounded opacity-0 group-hover/e:opacity-100 transition"
                          title="Sao chép"
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shipping address */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 group/a">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-400">Địa chỉ giao hàng mặc định:</span>
                    {(detailCustomer.address || detailCustomer.shipping_address) && (
                      <button
                        type="button"
                        onClick={(e) => handleCopy(detailCustomer.address || detailCustomer.shipping_address, 'địa chỉ', e)}
                        className="text-[11px] text-[#f05a28] hover:underline flex items-center gap-1"
                      >
                        <Copy size={11} />
                        <span>Sao chép</span>
                      </button>
                    )}
                  </div>
                  <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#f05a28] shrink-0" />
                    <span>{detailCustomer.address || detailCustomer.shipping_address || 'Chưa cập nhật'}</span>
                  </p>
                </div>

                {/* Quick Tag Manager */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400">Gắn / Gỡ nhãn khách hàng:</span>
                    <span className="text-[10px] text-slate-400 italic">Bấm để gắn / bỏ gắn nhanh</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['VIP', 'Tiềm năng', 'Khách mới', 'Đã mua hàng', 'Bom hàng'].map((tagItem) => {
                      const active = (detailCustomer.tags || []).includes(tagItem);
                      return (
                        <button
                          key={tagItem}
                          type="button"
                          onClick={(e) => handleToggleTag(detailCustomer, tagItem, e)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            active
                              ? tagItem === 'VIP'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : tagItem === 'Bom hàng'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'bg-[#f05a28] text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#f05a28]'
                          }`}
                        >
                          {active && <Check size={11} />}
                          <span>#{tagItem}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Staff / AI Notes with Save button */}
                <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Sparkles size={13} />
                      Ghi chú tư vấn & Lịch sử nhận diện AI:
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      disabled={savingNote}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      <Save size={11} />
                      <span>{savingNote ? 'Đang lưu...' : 'Lưu ghi chú'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Nhập ghi chú quan trọng về khách hàng (thói quen, size, địa chỉ cụ thể, hẹn lịch...)..."
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Lifetime spend & orders summary */}
                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-center">
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold block">Tổng đơn đã mua</span>
                    <span className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5 block">
                      {detailCustomer.total_orders_count || 0} đơn
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">Tổng tiền chi tiêu</span>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                      {(detailCustomer.total_spend_amount || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2 Content: Order History */}
            {detailTab === 'orders' && (
              <div className="overflow-y-auto py-4 space-y-3 flex-1 pr-1 text-xs">
                {ordersLoading ? (
                  <div className="p-12 text-center text-slate-400 space-y-2 flex flex-col items-center justify-center">
                    <RefreshCw size={20} className="animate-spin text-[#f05a28]" />
                    <span>Đang tải lịch sử đơn hàng của khách...</span>
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Package size={36} className="mx-auto text-slate-300" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">Khách hàng chưa phát sinh đơn hàng</p>
                    <p className="text-xs">Khi khách đặt hàng qua Fanpage hoặc tạo đơn bán hàng, các đơn sẽ xuất hiện ở đây.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerOrders.map((order) => (
                      <div
                        key={order._id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between hover:border-[#f05a28]/40 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                              {order.order_code || `#DH_${order._id.slice(-6).toUpperCase()}`}
                            </span>
                            {getOrderStatusBadge(order.order_status || order.status)}
                            {order.extracted_by_ai && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded text-[9px] font-bold flex items-center gap-0.5">
                                <Sparkles size={9} />
                                AI chốt
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 flex items-center space-x-2">
                            <span>{new Date(order.created_at || order.createdAt).toLocaleDateString('vi-VN')}</span>
                            <span>•</span>
                            <span>{order.order_items?.length || 1} sản phẩm</span>
                            <span>•</span>
                            <span className="uppercase text-[10px] font-semibold">{order.payment_method || 'COD'}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[#f05a28] text-sm">
                            {(order.total_amount || 0).toLocaleString('vi-VN')} đ
                          </p>
                          <span className={`text-[10px] font-bold ${
                            order.payment_status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {order.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Action Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  handleOpenEditModal(detailCustomer);
                  setDetailCustomer(null);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Edit2 size={14} />
                <span>Chỉnh sửa thông tin</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailCustomer(null)}
                className="px-5 py-2 bg-[#f05a28] hover:bg-[#e04d1c] text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Add / Edit Customer */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddEditModal(false)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-[#f05a28]/10 text-[#f05a28] flex items-center justify-center">
                <Users size={18} />
              </div>
              <span>{editingCustomer ? 'Chỉnh Sửa Hồ Sơ Khách Hàng' : 'Thêm Khách Hàng Mới'}</span>
            </h3>

            <form onSubmit={handleSubmitCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">Họ và tên khách hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn An"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="VD: 0912345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="khach@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Địa chỉ giao hàng</label>
                <input
                  type="text"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Nguồn khách hàng</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                  >
                    <option value="manual">Tạo thủ công</option>
                    <option value="facebook">Facebook Fanpage</option>
                    <option value="web">Website / Landing Page</option>
                    <option value="zalo">Zalo OA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Thẻ phân loại (cách nhau dấu phẩy)</label>
                  <input
                    type="text"
                    placeholder="VD: VIP, Tiềm năng, Khách mới, Đã mua hàng..."
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Ghi chú tư vấn / Lịch sử khách</label>
                <textarea
                  rows={3}
                  placeholder="Sở thích, lưu ý giao hàng, size số yêu thích..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#f05a28] hover:bg-[#e04d1c] text-white text-xs font-bold rounded-xl shadow disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Đang lưu...' : editingCustomer ? 'Lưu thay đổi' : 'Thêm khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa khách hàng thay thế window.confirm */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        loading={confirmDialog.loading}
      />
    </div>
  );
};

export default CustomerListPage;
