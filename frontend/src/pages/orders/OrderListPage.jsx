import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { orderService } from '../../services/order.service.js';
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
  X
} from 'lucide-react';

const OrderListPage = () => {
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoading(true);
      const res = await orderService.getOrders({
        business_id: activeBusiness._id,
        search: search || undefined,
        status: statusFilter || undefined
      });
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeBusiness?._id, search, statusFilter]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await orderService.updateOrderStatus(orderId, newStatus, activeBusiness._id);
      if (res.success) {
        showToast('success', `Đã chuyển trạng thái sang "${newStatus}"`);
        fetchOrders();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleDeleteOrder = async (id, code) => {
    if (!window.confirm(`Bạn có chắc muốn xóa đơn hàng #${code}?`)) return;
    try {
      const res = await orderService.deleteOrder(id, activeBusiness._id);
      if (res.success) {
        showToast('success', 'Đã xóa đơn hàng');
        fetchOrders();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi xóa đơn');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold text-[10px]">Đã xác nhận</span>;
      case 'SHIPPING':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 font-bold text-[10px]">Đang giao</span>;
      case 'COMPLETED':
      case 'DELIVERED':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-bold text-[10px]">Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 font-bold text-[10px]">Đã hủy</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px]">Chờ xử lý</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <ShoppingCart className="text-blue-600" />
              <span>Quản lý Đơn Hàng</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold">
              {orders.length} đơn hàng
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi và xử lý đơn hàng bóc tách tự động từ hội thoại AI hoặc tạo thủ công của {activeBusiness?.business_name}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, người nhận, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: '', label: 'Tất cả' },
            { id: 'PENDING', label: 'Chờ xử lý' },
            { id: 'CONFIRMED', label: 'Đã duyệt' },
            { id: 'SHIPPING', label: 'Đang giao' },
            { id: 'COMPLETED', label: 'Thành công' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw size={18} className="animate-spin text-blue-600" />
            <span>Đang tải danh sách đơn hàng...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ShoppingCart size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Chưa có đơn hàng nào</p>
            <p className="text-xs">Khi khách hàng đặt mua qua Messenger AI hoặc nhân viên tạo đơn, đơn hàng sẽ hiển thị tại đây</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 font-bold">Mã đơn</th>
                  <th className="py-3 px-4 font-bold">Khách hàng / Nhận hàng</th>
                  <th className="py-3 px-4 font-bold">Sản phẩm đặt</th>
                  <th className="py-3 px-4 font-bold text-right">Tổng thanh toán</th>
                  <th className="py-3 px-4 font-bold text-center">Nguồn gốc</th>
                  <th className="py-3 px-4 font-bold text-center">Trạng thái</th>
                  <th className="py-3 px-4 font-bold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      #{o.order_code}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200">
                      <p className="font-bold">{o.customer_name}</p>
                      <p className="text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Phone size={11} />
                        <span>{o.customer_phone}</span>
                      </p>
                      <p className="text-slate-400 text-[11px] truncate max-w-[200px] mt-0.5">
                        {o.shipping_address}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 max-w-[240px]">
                        {o.order_items && o.order_items.length > 0 ? (
                          o.order_items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="font-medium truncate text-slate-800 dark:text-slate-200">
                                • {item.product_name} ({item.variant || 'Tiêu chuẩn'})
                              </span>
                              <span className="text-slate-400 font-mono ml-2">x{item.quantity}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400">1 sản phẩm</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <p className="font-extrabold text-blue-600 dark:text-blue-400">
                        {o.total_amount.toLocaleString('vi-VN')} đ
                      </p>
                      <span className="text-[10px] text-slate-400">{o.payment_method}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {o.extracted_by_ai ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-extrabold">
                          <Sparkles size={10} />
                          <span>AI Chat Auto</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Thủ công</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(o.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateStatus(o._id, e.target.value)}
                          className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                        >
                          <option value="PENDING">Chờ xử lý</option>
                          <option value="CONFIRMED">Duyệt đơn</option>
                          <option value="SHIPPING">Đang giao</option>
                          <option value="COMPLETED">Hoàn thành</option>
                          <option value="CANCELLED">Hủy đơn</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(o._id, o.order_code)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Xóa đơn hàng"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderListPage;
