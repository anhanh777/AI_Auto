import React, { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { orderService } from '../../services/order.service.js';
import { channelService } from '../../services/channel.service.js';
import { productService } from '../../services/product.service.js';
import { customerService } from '../../services/customer.service.js';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { socket } from '../../utils/socket.js';
import { resolveChannelAvatar } from '../../utils/media.js';
import {
  ShoppingCart,
  Search,
  Plus,
  RefreshCw,
  Sparkles,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Trash2,
  Eye,
  X,
  Check,
  Ban,
  ArrowRight,
  User,
  Store,
  DollarSign,
  Package,
  Calendar,
  AlertTriangle,
  History,
  FileText
} from 'lucide-react';

const OrderListPage = () => {
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();

  // State danh sách & filter
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    total_orders: 0,
    pending_count: 0,
    confirmed_count: 0,
    shipping_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    total_revenue: 0
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [page, setPage] = useState(1);

  // Danh sách kênh & sản phẩm (dùng cho filter & tạo đơn)
  const [channels, setChannels] = useState([]);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null); // Modal xem chi tiết
  const [cancelModalOrder, setCancelModalOrder] = useState(null); // Modal hủy đơn
  const [cancelReason, setCancelReason] = useState('Khách đổi ý không muốn mua nữa');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
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

  // Modal tạo đơn thủ công
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [newOrderForm, setNewOrderForm] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    shipping_address: '',
    channel_id: '',
    payment_method: 'COD',
    shipping_fee: 0,
    discount_amount: 0,
    notes: '',
    items: []
  });

  // Format ngày giờ: hh:mm dd/mm/yyyy
  const formatDateTime = (dateStr) => {
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

  // Format tiền tệ VNĐ
  const formatCurrency = (amount) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' đ';
  };

  // Tải danh sách kênh kết nối
  const fetchChannels = useCallback(async () => {
    if (!activeBusiness?._id) return;
    try {
      const res = await channelService.getChannels(activeBusiness._id);
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setChannels(list);
      }
    } catch (err) {
      console.warn('[Fetch Channels Warning]', err.message);
    }
  }, [activeBusiness?._id]);

  // Tải danh sách đơn hàng
  const fetchOrders = useCallback(async (showSpinner = true) => {
    if (!activeBusiness?._id) return;
    try {
      if (showSpinner) setLoading(true);
      const res = await orderService.getOrders({
        business_id: activeBusiness._id,
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        channel_id: channelFilter || undefined
      });

      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setOrders(list);
      }
      if (res?.summary) {
        setSummary(res.summary);
      }
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng:', err);
      showToast('error', err.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [activeBusiness?._id, page, search, statusFilter, channelFilter]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  // Lắng nghe Socket.IO thời gian thực khi có đơn hàng mới từ Chat / AI / Staff
  useEffect(() => {
    const handleRealtimeOrder = (data) => {
      // Reload danh sách ngầm không bật spinner toàn trang
      fetchOrders(false);
    };

    socket.on('new_order', handleRealtimeOrder);
    socket.on('order_created', handleRealtimeOrder);
    socket.on('order_updated', handleRealtimeOrder);

    return () => {
      socket.off('new_order', handleRealtimeOrder);
      socket.off('order_created', handleRealtimeOrder);
      socket.off('order_updated', handleRealtimeOrder);
    };
  }, [fetchOrders]);

  // Xử lý chuyển trạng thái đơn hàng (Duyệt đơn, Giao hàng, Hoàn tất)
  const handleUpdateStatus = async (orderId, newStatus, note = '') => {
    if (!activeBusiness?._id) return;
    try {
      const res = await orderService.updateOrderStatus(
        orderId,
        newStatus,
        activeBusiness._id,
        note
      );
      if (res.success || res.data) {
        const statusMap = {
          CONFIRMED: 'Đã duyệt đơn hàng',
          SHIPPING: 'Đã chuyển sang giao hàng',
          COMPLETED: 'Đã hoàn tất đơn hàng',
          CANCELLED: 'Đã hủy đơn hàng'
        };
        showToast('success', statusMap[newStatus] || `Cập nhật trạng thái thành công`);
        fetchOrders(false);

        // Cập nhật lại trong modal chi tiết nếu đang mở
        if (selectedOrder && selectedOrder._id === orderId) {
          const updated = res.data || { ...selectedOrder, status: newStatus, order_status: newStatus };
          setSelectedOrder(updated);
        }
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  // Mở modal hủy đơn
  const handleOpenCancelModal = (order) => {
    setCancelModalOrder(order);
    setCancelReason('Khách đổi ý không muốn mua nữa');
    setCustomCancelReason('');
  };

  // Xác nhận hủy đơn hàng kèm lý do
  const handleConfirmCancelOrder = async () => {
    if (!cancelModalOrder || !activeBusiness?._id) return;
    const finalReason = cancelReason === 'Khác' ? customCancelReason.trim() : cancelReason;
    if (!finalReason) {
      showToast('error', 'Vui lòng cung cấp lý do hủy đơn');
      return;
    }

    try {
      setIsSubmittingCancel(true);
      const res = await orderService.updateOrderStatus(
        cancelModalOrder._id,
        'CANCELLED',
        activeBusiness._id,
        finalReason,
        finalReason
      );
      if (res.success || res.data) {
        showToast('success', `Đã hủy đơn hàng #${cancelModalOrder.order_code}. Tồn kho đã được hoàn lại.`);
        setCancelModalOrder(null);
        fetchOrders(false);
        if (selectedOrder && selectedOrder._id === cancelModalOrder._id) {
          setSelectedOrder(res.data);
        }
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi hủy đơn hàng');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Xóa đơn hàng
  const handleDeleteOrder = (id, code) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa đơn hàng',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng #${code} khỏi hệ thống?`,
      confirmText: 'Xóa đơn hàng',
      cancelText: 'Hủy bỏ',
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          const res = await orderService.deleteOrder(id, activeBusiness._id);
          if (res.success || res.message) {
            showToast('success', 'Đã xóa đơn hàng');
            if (selectedOrder && selectedOrder._id === id) {
              setSelectedOrder(null);
            }
            fetchOrders(false);
          }
        } catch (err) {
          showToast('error', err.message || 'Lỗi khi xóa đơn hàng');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  // Mở modal tạo đơn thủ công
  const handleOpenCreateModal = async () => {
    setIsCreateModalOpen(true);
    try {
      // Tải sản phẩm
      const pRes = await productService.getProducts({ business_id: activeBusiness?._id, limit: 100 });
      const pList = pRes?.data || (Array.isArray(pRes) ? pRes : []);
      setAvailableProducts(Array.isArray(pList) ? pList : []);

      // Tải khách hàng
      const cRes = await customerService.getCustomers({ business_id: activeBusiness?._id, limit: 100 });
      const cList = cRes?.data || (Array.isArray(cRes) ? cRes : []);
      setAvailableCustomers(Array.isArray(cList) ? cList : []);
    } catch (err) {
      console.warn('[Load modal data error]', err.message);
    }
  };

  // Thêm mặt hàng vào form tạo đơn
  const handleAddItemToForm = (product) => {
    const existingIndex = newOrderForm.items.findIndex(
      (it) => it.product_id === product._id
    );
    if (existingIndex >= 0) {
      const updated = [...newOrderForm.items];
      updated[existingIndex].quantity += 1;
      setNewOrderForm({ ...newOrderForm, items: updated });
    } else {
      setNewOrderForm({
        ...newOrderForm,
        items: [
          ...newOrderForm.items,
          {
            product_id: product._id,
            product_name: product.product_name || product.name,
            sku: product.sku || '',
            unit_price: product.price || product.selling_price || 0,
            quantity: 1
          }
        ]
      });
    }
  };

  // Cập nhật số lượng mặt hàng
  const handleUpdateItemQuantity = (index, delta) => {
    const updated = [...newOrderForm.items];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setNewOrderForm({ ...newOrderForm, items: updated });
  };

  // Xử lý submit tạo đơn thủ công
  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    if (!activeBusiness?._id) return;

    if (!newOrderForm.customer_name && !newOrderForm.customer_phone) {
      showToast('error', 'Vui lòng nhập tên hoặc số điện thoại khách hàng');
      return;
    }

    if (newOrderForm.items.length === 0) {
      showToast('error', 'Vui lòng chọn ít nhất 1 sản phẩm cho đơn hàng');
      return;
    }

    try {
      setCreateLoading(true);
      const payload = {
        business_id: activeBusiness._id,
        customer_id: newOrderForm.customer_id || undefined,
        customer_name: newOrderForm.customer_name,
        shipping_customer_name: newOrderForm.customer_name,
        customer_phone: newOrderForm.customer_phone,
        shipping_phone: newOrderForm.customer_phone,
        shipping_address: newOrderForm.shipping_address,
        channel_id: newOrderForm.channel_id || undefined,
        payment_method: newOrderForm.payment_method,
        shipping_fee: Number(newOrderForm.shipping_fee) || 0,
        discount_amount: Number(newOrderForm.discount_amount) || 0,
        notes: newOrderForm.notes,
        order_items: newOrderForm.items,
        extracted_by_ai: false,
        source: 'manual'
      };

      const res = await orderService.createOrder(payload);
      if (res.success || res.data) {
        showToast('success', 'Tạo đơn hàng mới thành công (Đang chờ duyệt)');
        setIsCreateModalOpen(false);
        setNewOrderForm({
          customer_id: '',
          customer_name: '',
          customer_phone: '',
          shipping_address: '',
          channel_id: '',
          payment_method: 'COD',
          shipping_fee: 0,
          discount_amount: 0,
          notes: '',
          items: []
        });
        fetchOrders(false);
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi tạo đơn hàng');
    } finally {
      setCreateLoading(false);
    }
  };

  // Badge trạng thái đơn
  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-[11px]">
            <Clock size={11} />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-[11px]">
            <CheckCircle2 size={11} />
            <span>Đã duyệt</span>
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold text-[11px]">
            <Truck size={11} />
            <span>Đang giao</span>
          </span>
        );
      case 'COMPLETED':
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
            <Check size={11} />
            <span>Hoàn thành</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[11px]">
            <Ban size={11} />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
            <span>{status || 'Không xác định'}</span>
          </span>
        );
    }
  };

  // Tính tiền tạm tính cho modal tạo đơn
  const calcSubtotal = () => {
    return newOrderForm.items.reduce(
      (sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1),
      0
    );
  };
  const calcTotal = () => {
    const sub = calcSubtotal();
    const fee = Number(newOrderForm.shipping_fee) || 0;
    const disc = Number(newOrderForm.discount_amount) || 0;
    return Math.max(0, sub + fee - disc);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Quản Lý Đơn Hàng</span>
                {summary.pending_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-black animate-pulse">
                    {summary.pending_count} chờ duyệt
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Xử lý, duyệt và phân loại đơn hàng tự động bóc tách từ Messenger AI hoặc tạo trực tiếp của <span className="font-bold text-slate-700 dark:text-slate-200">{activeBusiness?.business_name}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={fetchOrders}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Tạo đơn hàng mới</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-400">Tổng đơn hàng</p>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {summary.total_orders.toLocaleString()}
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm flex items-center space-x-3.5 transition ${
          summary.pending_count > 0
            ? 'bg-amber-500/5 border-amber-500/30 dark:bg-amber-500/10'
            : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80'
        }`}>
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={20} className={summary.pending_count > 0 ? 'animate-bounce' : ''} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center space-x-1">
              <span>Chờ duyệt (Cần xử lý)</span>
            </p>
            <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {summary.pending_count.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Truck size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-400">Đang giao hàng</p>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {summary.shipping_count.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-400">Doanh thu hoàn tất</p>
            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
              {formatCurrency(summary.total_revenue)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        {/* Status Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: '', label: 'Tất cả', count: summary.total_orders },
            { id: 'PENDING', label: 'Chờ duyệt', count: summary.pending_count, highlight: true },
            { id: 'CONFIRMED', label: 'Đã xác nhận', count: summary.confirmed_count },
            { id: 'SHIPPING', label: 'Đang giao', count: summary.shipping_count },
            { id: 'COMPLETED', label: 'Hoàn thành', count: summary.completed_count },
            { id: 'CANCELLED', label: 'Đã hủy', count: summary.cancelled_count }
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : tab.highlight && tab.count > 0
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.highlight && tab.count > 0
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.count || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Channel Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-750">
          <div className="relative flex-1 sm:max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn (DH-...), tên khách, số điện thoại, địa chỉ..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium shrink-0">Kênh bán:</span>
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="">Tất cả kênh bán</option>
              {channels.map((ch) => (
                <option key={ch._id} value={ch._id}>
                  {ch.page_name || ch.name || 'Fanpage Facebook'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Orders Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <span className="font-bold">Đang tải danh sách đơn hàng...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400">
              <ShoppingCart size={28} />
            </div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                Chưa có đơn hàng nào phù hợp bộ lọc
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Khi khách hàng chốt đơn qua Messenger AI hoặc nhân viên tạo đơn mới, đơn hàng sẽ tự động hiển thị và đồng bộ theo thời gian thực tại đây.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 font-bold">Mã đơn & Nguồn</th>
                  <th className="py-3 px-4 font-bold">Kênh tiếp cận</th>
                  <th className="py-3 px-4 font-bold">Khách hàng & Giao hàng</th>
                  <th className="py-3 px-4 font-bold">Sản phẩm đặt</th>
                  <th className="py-3 px-4 font-bold text-right">Tổng thanh toán</th>
                  <th className="py-3 px-4 font-bold text-center">Thời gian tạo</th>
                  <th className="py-3 px-4 font-bold text-center">Trạng thái</th>
                  <th className="py-3 px-4 font-bold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {orders.map((o) => {
                  const status = (o.order_status || o.status || 'PENDING').toUpperCase();
                  const customer = o.customer_id;
                  const channel = o.channel_id;
                  const items = o.order_items || [];

                  return (
                    <tr
                      key={o._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition group"
                    >
                      {/* Mã đơn & Nguồn gốc */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col space-y-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(o)}
                            className="font-mono font-black text-blue-600 dark:text-blue-400 hover:underline text-left text-xs"
                          >
                            #{o.order_code}
                          </button>
                          <div>
                            {o.extracted_by_ai ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-bold">
                                <Sparkles size={10} />
                                <span>AI Chat Auto</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md text-[10px] font-medium">
                                <User size={10} />
                                <span>Thủ công</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Kênh tiếp cận */}
                      <td className="py-3.5 px-4">
                        {channel ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs overflow-hidden">
                              {resolveChannelAvatar(channel) ? (
                                <img
                                  src={resolveChannelAvatar(channel)}
                                  alt={channel.page_name}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = 'none';
                                  }}
                                  className="w-full h-full rounded-lg object-cover"
                                />
                              ) : (
                                <span>f</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]" title={channel.page_name}>
                                {channel.page_name}
                              </p>
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Fanpage Meta</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
                            <Store size={14} className="text-slate-400" />
                            <span className="text-[11px] font-medium">Tại quầy / Trực tiếp</span>
                          </div>
                        )}
                      </td>

                      {/* Khách hàng & Giao nhận */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                            <span>{o.shipping_customer_name || o.customer_name || customer?.full_name || 'Khách vãng lai'}</span>
                          </p>
                          {(o.shipping_phone || o.customer_phone || customer?.phone) && (
                            <p className="text-slate-500 dark:text-slate-400 flex items-center space-x-1 text-[11px]">
                              <Phone size={10} className="text-slate-400" />
                              <span className="font-mono">{o.shipping_phone || o.customer_phone || customer?.phone}</span>
                            </p>
                          )}
                          {(o.shipping_address || customer?.shipping_address) && (
                            <p className="text-slate-400 text-[11px] flex items-center space-x-1 truncate max-w-[210px]" title={o.shipping_address || customer?.shipping_address}>
                              <MapPin size={10} className="shrink-0 text-slate-400" />
                              <span className="truncate">{o.shipping_address || customer?.shipping_address}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Mặt hàng đặt */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-[220px]">
                          {items.length > 0 ? (
                            <>
                              {items.slice(0, 2).map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px]">
                                  <span className="font-medium truncate text-slate-800 dark:text-slate-200" title={it.product_name}>
                                    • {it.product_name}
                                  </span>
                                  <span className="text-slate-400 font-mono ml-2 shrink-0">x{it.quantity}</span>
                                </div>
                              ))}
                              {items.length > 2 && (
                                <p className="text-[10px] text-blue-600 font-medium">
                                  + {items.length - 2} sản phẩm khác
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Chưa có thông tin</span>
                          )}
                        </div>
                      </td>

                      {/* Tổng thanh toán */}
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-black text-slate-900 dark:text-white text-xs">
                          {formatCurrency(o.total_amount)}
                        </p>
                        <div className="flex items-center justify-end space-x-1 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                            {o.payment_method || 'COD'}
                          </span>
                          {o.payment_status === 'PAID' ? (
                            <span className="text-[10px] text-emerald-600 font-bold">Đã thu</span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-medium">Chưa thu</span>
                          )}
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {formatDateTime(o.created_at)}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(status)}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {/* Phê duyệt nhanh nếu PENDING */}
                          {status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(o._id, 'CONFIRMED', 'Duyệt đơn tự động')}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center space-x-1"
                              title="Duyệt đơn hàng"
                            >
                              <Check size={11} />
                              <span>Duyệt</span>
                            </button>
                          )}

                          {/* Bắt đầu giao hàng nếu CONFIRMED */}
                          {status === 'CONFIRMED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(o._id, 'SHIPPING', 'Bắt đầu giao hàng')}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center space-x-1"
                              title="Bắt đầu giao hàng"
                            >
                              <Truck size={11} />
                              <span>Giao</span>
                            </button>
                          )}

                          {/* Hoàn tất nếu SHIPPING */}
                          {status === 'SHIPPING' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(o._id, 'COMPLETED', 'Khách đã nhận hàng và thanh toán')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center space-x-1"
                              title="Hoàn tất đơn hàng"
                            >
                              <CheckCircle2 size={11} />
                              <span>Hoàn tất</span>
                            </button>
                          )}

                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(o)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                            title="Xem chi tiết & lịch sử"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Hủy đơn nếu chưa hoàn tất và chưa hủy */}
                          {status !== 'COMPLETED' && status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelModal(o)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                              title="Hủy đơn hàng"
                            >
                              <Ban size={14} />
                            </button>
                          )}

                          {/* Xóa đơn */}
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(o._id, o.order_code)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                            title="Xóa đơn hàng"
                          >
                            <Trash2 size={14} />
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

        {/* Phân trang */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <span>
              Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalItems} đơn hàng)
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. MODAL: CHI TIẾT ĐƠN HÀNG & LỊCH SỬ DUYỆT TRẠNG THÁI */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-scaleIn my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Chi Tiết Đơn Hàng #{selectedOrder.order_code}
                    </h3>
                    {getStatusBadge(selectedOrder.order_status || selectedOrder.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Thời gian tạo: {formatDateTime(selectedOrder.created_at)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Quick Status Bar */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">
                    Chuyển nhanh trạng thái
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Người có quyền có thể chủ động chuyển trạng thái đơn hàng tại đây
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedOrder.order_status || selectedOrder.status || 'PENDING'}
                    onChange={(e) => handleUpdateStatus(selectedOrder._id, e.target.value, 'Cập nhật từ modal chi tiết')}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer shadow-xs"
                  >
                    <option value="PENDING">Chờ duyệt (PENDING)</option>
                    <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
                    <option value="SHIPPING">Đang giao hàng (SHIPPING)</option>
                    <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
                    <option value="CANCELLED">Hủy đơn (CANCELLED)</option>
                  </select>
                </div>
              </div>

              {/* Thông tin người nhận & Kênh */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                    <User size={13} className="text-blue-600" />
                    <span>Thông tin nhận hàng</span>
                  </h4>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedOrder.shipping_customer_name || selectedOrder.customer_name || 'Khách vãng lai'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                      <Phone size={12} className="text-slate-400" />
                      <span className="font-mono">{selectedOrder.shipping_phone || selectedOrder.customer_phone || 'Chưa có SĐT'}</span>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 flex items-start space-x-1.5">
                      <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <span>{selectedOrder.shipping_address || 'Chưa cung cấp địa chỉ'}</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                    <Store size={13} className="text-blue-600" />
                    <span>Nguồn gốc & Thanh toán</span>
                  </h4>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Kênh bán:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {selectedOrder.channel_id?.page_name || 'Bán tại quầy / Khác'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Phương thức:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {selectedOrder.payment_method || 'COD'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Thanh toán:</span>
                      <span className={`font-bold ${selectedOrder.payment_status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selectedOrder.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </div>
                    {selectedOrder.cancellation_reason && (
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-700 text-rose-600 font-bold">
                        Lý do hủy: {selectedOrder.cancellation_reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Danh sách mặt hàng */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                  <Package size={13} className="text-blue-600" />
                  <span>Danh sách sản phẩm trong đơn</span>
                </h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-4 font-bold">Sản phẩm</th>
                        <th className="py-2.5 px-4 font-bold text-right">Đơn giá</th>
                        <th className="py-2.5 px-4 font-bold text-center">Số lượng</th>
                        <th className="py-2.5 px-4 font-bold text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {(selectedOrder.order_items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {it.product_name || it.name}
                            </p>
                            {it.sku && <p className="text-[10px] text-slate-400 font-mono">SKU: {it.sku}</p>}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {formatCurrency(it.unit_price || it.price)}
                          </td>
                          <td className="py-3 px-4 text-center font-bold">
                            x{it.quantity}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400 font-mono">
                            {formatCurrency((it.quantity || 1) * (it.unit_price || it.price || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/70 dark:bg-slate-900/60 font-bold border-t border-slate-200 dark:border-slate-700">
                        <td colSpan={3} className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                          Tổng thanh toán:
                        </td>
                        <td className="py-3 px-4 text-right text-base text-blue-600 dark:text-blue-400 font-black font-mono">
                          {formatCurrency(selectedOrder.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Timeline Lịch sử trạng thái (Audit Trail) */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                  <History size={13} className="text-blue-600" />
                  <span>Lịch sử trạng thái & Phê duyệt (Timeline)</span>
                </h4>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                  {(selectedOrder.status_history && selectedOrder.status_history.length > 0 ? (
                    selectedOrder.status_history.map((step, idx) => (
                      <div key={idx} className="relative flex items-start space-x-3 text-xs">
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                          {idx + 1}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {getStatusBadge(step.status)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatDateTime(step.updated_at)}
                            </span>
                          </div>
                          {step.note && (
                            <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
                              {step.note}
                            </p>
                          )}
                          {step.updated_by && (
                            <p className="text-[10px] text-slate-400">
                              Bởi: {step.updated_by.full_name || step.updated_by.email || 'Nhân viên'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Đơn hàng được khởi tạo ở trạng thái {selectedOrder.order_status || selectedOrder.status || 'PENDING'}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: HỦY ĐƠN HÀNG KÈM LÝ DO & HOÀN KHO */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Xác Nhận Hủy Đơn #{cancelModalOrder.order_code}
                </h3>
                <p className="text-xs text-slate-400">
                  Tồn kho khả dụng sẽ tự động được hoàn trả lại sau khi hủy.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Chọn lý do hủy:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Khách đổi ý không muốn mua nữa">Khách đổi ý không muốn mua nữa</option>
                  <option value="Không liên lạc được với khách hàng">Không liên lạc được với khách hàng</option>
                  <option value="Hết hàng trong kho">Hết hàng trong kho</option>
                  <option value="Sai thông tin sản phẩm / giá tiền">Sai thông tin sản phẩm / giá tiền</option>
                  <option value="Khách muốn đổi sang sản phẩm khác">Khách muốn đổi sang sản phẩm khác</option>
                  <option value="Khác">Lý do khác...</option>
                </select>
              </div>

              {cancelReason === 'Khác' && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Nhập chi tiết lý do:
                  </label>
                  <textarea
                    rows={2}
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    placeholder="Nhập lý do cụ thể..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancelOrder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-rose-600/20"
              >
                {isSubmittingCancel ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Đang hủy...</span>
                  </>
                ) : (
                  <>
                    <Ban size={13} />
                    <span>Xác nhận Hủy Đơn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: TẠO ĐƠN HÀNG MỚI THỦ CÔNG */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-scaleIn my-8">
            <form onSubmit={handleCreateOrderSubmit}>
              {/* Header */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Tạo Đơn Hàng Mới
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tạo đơn bán tại quầy hoặc khách đặt qua điện thoại
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
                {/* Chọn kênh & Khách hàng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Kênh bán hàng:
                    </label>
                    <select
                      value={newOrderForm.channel_id}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, channel_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Bán tại quầy / Trực tiếp</option>
                      {channels.map((ch) => (
                        <option key={ch._id} value={ch._id}>
                          {ch.page_name || ch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Chọn khách hàng có sẵn (Tùy chọn):
                    </label>
                    <select
                      value={newOrderForm.customer_id}
                      onChange={(e) => {
                        const cid = e.target.value;
                        const c = availableCustomers.find((x) => x._id === cid);
                        if (c) {
                          setNewOrderForm({
                            ...newOrderForm,
                            customer_id: c._id,
                            customer_name: c.full_name || '',
                            customer_phone: c.phone || c.phone_number || '',
                            shipping_address: c.shipping_address || c.address || ''
                          });
                        } else {
                          setNewOrderForm({ ...newOrderForm, customer_id: '' });
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">-- Khách mới hoặc nhập tay --</option>
                      {availableCustomers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.full_name} ({c.phone || c.phone_number || 'Chưa có SĐT'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Thông tin người nhận */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Tên khách / Người nhận: *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={newOrderForm.customer_name}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Số điện thoại: *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0912345678"
                      value={newOrderForm.customer_phone}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Địa chỉ nhận hàng:
                  </label>
                  <input
                    type="text"
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                    value={newOrderForm.shipping_address}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, shipping_address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Chọn sản phẩm */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-600 dark:text-slate-300 font-bold">
                      Chọn sản phẩm vào đơn hàng:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {newOrderForm.items.length} sản phẩm đã chọn
                    </span>
                  </div>

                  {/* Dropdown thêm nhanh sản phẩm */}
                  <select
                    onChange={(e) => {
                      const pid = e.target.value;
                      if (!pid) return;
                      const prod = availableProducts.find((p) => p._id === pid);
                      if (prod) handleAddItemToForm(prod);
                      e.target.value = '';
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="">+ Bấm vào đây để chọn thêm sản phẩm...</option>
                    {availableProducts.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.product_name || p.name} — {formatCurrency(p.price || p.selling_price || 0)} (Tồn: {p.stock_available ?? p.stock ?? 'N/A'})
                      </option>
                    ))}
                  </select>

                  {/* Bảng các item đã chọn */}
                  {newOrderForm.items.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden mt-2">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2 px-3">Tên</th>
                            <th className="py-2 px-3 text-right">Đơn giá</th>
                            <th className="py-2 px-3 text-center">SL</th>
                            <th className="py-2 px-3 text-right">Thành tiền</th>
                            <th className="py-2 px-3 text-center">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {newOrderForm.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                                {it.product_name}
                              </td>
                              <td className="py-2 px-3 text-right font-mono">
                                {formatCurrency(it.unit_price)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="inline-flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQuantity(idx, -1)}
                                    className="w-5 h-5 flex items-center justify-center font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-200 rounded"
                                  >
                                    -
                                  </button>
                                  <span className="font-bold px-1.5">{it.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQuantity(idx, 1)}
                                    className="w-5 h-5 flex items-center justify-center font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-200 rounded"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-blue-600">
                                {formatCurrency(it.quantity * it.unit_price)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQuantity(idx, -it.quantity)}
                                  className="text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Tài chính & Thanh toán */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Phương thức:
                    </label>
                    <select
                      value={newOrderForm.payment_method}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, payment_method: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    >
                      <option value="COD">COD (Thu hộ khi giao)</option>
                      <option value="BANK_TRANSFER">Chuyển khoản</option>
                      <option value="CASH">Tiền mặt tại quầy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Phí giao hàng:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newOrderForm.shipping_fee}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, shipping_fee: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Giảm giá:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newOrderForm.discount_amount}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, discount_amount: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Tổng thanh toán */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900 dark:text-blue-300">
                    Tổng cộng thanh toán:
                  </span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                    {formatCurrency(calcTotal())}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-blue-600/20"
                >
                  {createLoading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Đang tạo đơn...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Tạo Đơn Hàng</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa đơn hàng thay thế window.confirm */}
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

export default OrderListPage;
