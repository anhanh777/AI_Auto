import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { customerService } from '../../services/customer.service.js';
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
  X
} from 'lucide-react';

const CustomerListPage = () => {
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', address: '', tags: '' });
  const [creating, setCreating] = useState(false);

  const fetchCustomers = async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoading(true);
      const res = await customerService.getCustomers({
        business_id: activeBusiness._id,
        search: search || undefined,
        tag: selectedTag || undefined
      });
      if (res.success && Array.isArray(res.data)) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải khách hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [activeBusiness?._id, search, selectedTag]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    try {
      setCreating(true);
      const tagsArray = form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      const res = await customerService.createCustomer({
        ...form,
        tags: tagsArray,
        business_id: activeBusiness._id
      });
      if (res.success) {
        showToast('success', 'Thêm khách hàng thành công!');
        setShowAddModal(false);
        setForm({ full_name: '', phone: '', email: '', address: '', tags: '' });
        fetchCustomers();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi thêm khách hàng');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khách hàng "${name}"?`)) return;
    try {
      const res = await customerService.deleteCustomer(id, activeBusiness._id);
      if (res.success) {
        showToast('success', 'Đã xóa khách hàng');
        fetchCustomers();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi xóa');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Users className="text-blue-600" />
              <span>Quản lý Khách Hàng</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold">
              {customers.length} khách hàng
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Danh sách khách hàng tương tác từ các kênh Facebook Fanpage của {activeBusiness?.business_name}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, số điện thoại, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedTag('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedTag === ''
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Tất cả thẻ
          </button>
          <button
            type="button"
            onClick={() => setSelectedTag("Sp/L'vento")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedTag === "Sp/L'vento"
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            }`}
          >
            Sp/L'vento
          </button>
          <button
            type="button"
            onClick={() => setSelectedTag('Hot MKT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedTag === 'Hot MKT'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
            }`}
          >
            Hot MKT
          </button>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw size={18} className="animate-spin text-blue-600" />
            <span>Đang tải danh sách khách hàng...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Chưa có khách hàng nào</p>
            <p className="text-xs">Khách hàng nhắn tin qua Fanpage hoặc tạo mới sẽ xuất hiện ở đây</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 font-bold">Khách hàng</th>
                  <th className="py-3 px-4 font-bold">Liên hệ</th>
                  <th className="py-3 px-4 font-bold">Địa chỉ</th>
                  <th className="py-3 px-4 font-bold">Thẻ phân loại</th>
                  <th className="py-3 px-4 font-bold text-center">Đơn hàng</th>
                  <th className="py-3 px-4 font-bold text-right">Tổng chi tiêu</th>
                  <th className="py-3 px-4 font-bold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={c.full_name}
                          className="w-9 h-9 rounded-full object-cover border"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{c.full_name}</p>
                          <span className="text-[10px] text-blue-600 flex items-center space-x-1 mt-0.5">
                            <Facebook size={10} />
                            <span>Facebook Fanpage</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <p className="flex items-center space-x-1.5">
                        <Phone size={12} className="text-slate-400" />
                        <span>{c.phone || 'Chưa có SĐT'}</span>
                      </p>
                      {c.email && (
                        <p className="flex items-center space-x-1.5 text-slate-400 mt-0.5">
                          <Mail size={12} />
                          <span>{c.email}</span>
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate">
                      {c.address || 'Chưa cập nhật'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.tags && c.tags.length > 0 ? (
                          c.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-md text-[10px] font-bold"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-200">
                      {c.total_orders_count || 1}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-blue-600 dark:text-blue-400">
                      {(c.total_spend_amount || 299000).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(c._id, c.full_name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        title="Xóa khách hàng"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm Khách Hàng */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative text-slate-800 dark:text-slate-100">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Users className="text-blue-600" />
              <span>Thêm Khách Hàng Mới</span>
            </h3>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn An"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="khach@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Địa chỉ giao hàng</label>
                <input
                  type="text"
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Thẻ phân loại (ngăn cách dấu phẩy)</label>
                <input
                  type="text"
                  placeholder="VD: Khách VIP, Sp/L'vento, Hot MKT"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {creating ? 'Đang thêm...' : 'Thêm khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerListPage;
