import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { knowledgeService } from '../../services/knowledge.service.js';
import {
  Brain,
  Search,
  Plus,
  RefreshCw,
  Sparkles,
  BookOpen,
  Trash2,
  Edit2,
  FileText,
  Tag,
  X,
  FileSpreadsheet
} from 'lucide-react';
import ImportKnowledgeModal from '../../components/modals/ImportKnowledgeModal.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';

const DEFAULT_CATEGORIES = [
  'Thông tin chung',
  'Chính sách vận chuyển & Phí ship',
  'Chính sách đổi trả & Bảo hành',
  'Bảng hướng dẫn chọn size',
  'Khuyến mãi & Ưu đãi',
  'Câu hỏi thường gặp'
];

export const ACTION_TYPE_MAP = {
  NONE: {
    label: 'Chỉ tư vấn & giải đáp',
    badge: '💬 Chỉ tư vấn',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
    desc: 'AI chỉ đọc hiểu để tư vấn và giải đáp khách hàng, tuyệt đối không chỉnh sửa dữ liệu CSDL.'
  },
  CANCEL_ORDER: {
    label: 'Tự động hủy đơn hàng',
    badge: '⚡ Tự động hủy đơn',
    color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    desc: 'Khi khách thỏa mãn điều kiện và xác nhận hủy đơn (đang Chờ duyệt), AI tự động chuyển đơn sang Đã hủy và hoàn lại tồn kho.'
  },
  UPDATE_ORDER: {
    label: 'Tự động cập nhật đơn hàng',
    badge: '⚡ Cập nhật đơn',
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    desc: 'Khi khách muốn đổi địa chỉ, SĐT, tăng/giảm sản phẩm của đơn chờ duyệt, AI tự cập nhật đơn hàng.'
  },
  UPDATE_CUSTOMER: {
    label: 'Tự động cập nhật thông tin khách hàng',
    badge: '⚡ Cập nhật khách',
    color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    desc: 'Khi khách cung cấp hoặc cập nhật thông tin cá nhân, AI tự động lưu vào hồ sơ khách hàng.'
  }
};

const KnowledgeBasePage = () => {
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [creating, setCreating] = useState(false);
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
  const [form, setForm] = useState({
    title: '',
    category: DEFAULT_CATEGORIES[0],
    content: '',
    keywords: '',
    action_type: 'NONE'
  });

  const fetchKnowledge = async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoading(true);
      const res = await knowledgeService.getKnowledgeList({
        business_id: activeBusiness._id,
        search: search || undefined,
        category: categoryFilter || undefined
      });
      const dataList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setItems(dataList);
    } catch (err) {
      console.error('Lỗi khi tải kho tri thức:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, [activeBusiness?._id, search, categoryFilter]);

  // Gom các danh mục độc nhất của shop
  const customCategoriesFromItems = React.useMemo(() => {
    const setCats = new Set();
    items.forEach((it) => {
      const c = it.category;
      if (
        c &&
        !DEFAULT_CATEGORIES.includes(c) &&
        !['SHIPPING', 'RETURN_POLICY', 'SIZE_GUIDE', 'PROMOTION', 'FAQ', 'GENERAL'].includes(c)
      ) {
        setCats.add(c);
      }
    });
    return Array.from(setCats);
  }, [items]);

  // Bộ lọc danh mục động theo thực tế dữ liệu của shop
  const filterCategories = React.useMemo(() => {
    const cats = new Set();
    items.forEach((it) => {
      if (it.category) cats.add(it.category);
    });
    return Array.from(cats);
  }, [items]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ title: '', category: DEFAULT_CATEGORIES[0], content: '', keywords: '', action_type: 'NONE' });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item._id);
    const rawCat = item.category || 'Thông tin chung';
    const mapped =
      rawCat === 'SHIPPING'
        ? 'Chính sách vận chuyển & Phí ship'
        : rawCat === 'RETURN_POLICY'
        ? 'Chính sách đổi trả & Bảo hành'
        : rawCat === 'SIZE_GUIDE'
        ? 'Bảng hướng dẫn chọn size'
        : rawCat === 'PROMOTION'
        ? 'Khuyến mãi & Ưu đãi'
        : rawCat === 'FAQ'
        ? 'Câu hỏi thường gặp'
        : rawCat === 'GENERAL'
        ? 'Thông tin chung'
        : rawCat;

    setForm({
      title: item.title || '',
      category: mapped,
      content: item.content || '',
      keywords: Array.isArray(item.keywords) ? item.keywords.join(', ') : (item.keywords || ''),
      action_type: item.action_type || 'NONE'
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    try {
      setCreating(true);
      const kw = form.keywords
        ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [];

      let res;
      if (editingId) {
        res = await knowledgeService.updateKnowledge(editingId, {
          ...form,
          keywords: kw,
          business_id: activeBusiness._id
        });
      } else {
        res = await knowledgeService.createKnowledge({
          ...form,
          keywords: kw,
          business_id: activeBusiness._id
        });
      }

      if (res?.success || res?._id || res?.data?._id) {
        showToast(
          'success',
          editingId
            ? 'Đã cập nhật tài liệu tri thức thành công!'
            : 'Đã thêm tài liệu tri thức cho AI thành công!'
        );
        setShowModal(false);
        setEditingId(null);
        setForm({ title: '', category: DEFAULT_CATEGORIES[0], content: '', keywords: '' });
        fetchKnowledge();
      } else {
        throw new Error(res?.message || 'Không thể lưu tài liệu');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Lỗi khi lưu tài liệu');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id, title) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa tài liệu tri thức',
      message: `Bạn có chắc chắn muốn xóa tài liệu "${title}" khỏi kho tri thức của AI?`,
      confirmText: 'Xóa tài liệu',
      cancelText: 'Hủy bỏ',
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          const res = await knowledgeService.deleteKnowledge(id, activeBusiness._id);
          if (res?.success !== false) {
            showToast('success', 'Đã xóa tài liệu tri thức');
            fetchKnowledge();
          }
        } catch (err) {
          showToast('error', err.response?.data?.message || err.message || 'Lỗi khi xóa');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'SHIPPING':
        return '🚚 Giao hàng & Vận chuyển';
      case 'RETURN_POLICY':
        return '🔄 Chính sách Đổi trả';
      case 'SIZE_GUIDE':
        return '📏 Tư vấn Bảng Size';
      case 'PROMOTION':
        return '🎁 Khuyến mãi & Voucher';
      case 'FAQ':
        return '❓ Câu hỏi thường gặp';
      case 'GENERAL':
        return '📑 Thông tin chung';
      default:
        return cat ? `🏷️ ${cat}` : '📑 Thông tin chung';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Brain className="text-blue-600" />
              <span>Kho Tri Thức RAG (Knowledge Base)</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold">
              {items.length} tài liệu
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Nạp chính sách, quy định và FAQ để AI tự động tra cứu (RAG) và trả lời khách hàng chính xác cho {activeBusiness?.business_name}
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <span>Nhập từ file</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Thêm tài liệu tri thức</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu, từ khóa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              categoryFilter === ''
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Tất cả ({items.length})
          </button>
          {filterCategories.map((cat) => {
            const count = items.filter((it) => it.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center space-x-1.5 ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <span>{getCategoryLabel(cat)}</span>
                <span className="opacity-75 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
          <RefreshCw size={18} className="animate-spin text-blue-600" />
          <span>Đang nạp kho tri thức AI...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center space-y-3">
          <Brain size={36} className="mx-auto text-blue-600" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Chưa có tài liệu tri thức nào</p>
          <p className="text-xs text-slate-400">
            Nạp các chính sách đổi trả, ship hàng hoặc câu hỏi thường gặp để AI tự động tư vấn
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700 cursor-pointer"
            >
              + Nạp tài liệu tri thức đầu tiên
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-650 cursor-pointer"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" />
              <span>Nhập từ file Excel / CSV</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 text-[10px] font-extrabold border border-blue-200 dark:border-blue-800">
                      {getCategoryLabel(item.category)}
                    </span>
                    {(() => {
                      const meta = ACTION_TYPE_MAP[item.action_type] || ACTION_TYPE_MAP.NONE;
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${meta.color}`}>
                          {meta.badge}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Chỉnh sửa tài liệu"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item._id, item.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Xóa tài liệu"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {item.content}
                </p>
              </div>

              {/* Keywords */}
              {item.keywords && item.keywords.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 flex-wrap">
                  <Tag size={12} className="text-slate-400 shrink-0" />
                  {item.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-mono"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Thêm / Chỉnh sửa tài liệu */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative text-slate-800 dark:text-slate-100">
            <button
              onClick={() => {
                setShowModal(false);
                setEditingId(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Brain className="text-blue-600" />
              <span>{editingId ? 'Chỉnh Sửa Tài Liệu Tri Thức' : 'Thêm Tài Liệu Tri Thức Mới'}</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">Tiêu đề tài liệu *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chính sách đổi trả sản phẩm trong 7 ngày"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Phân loại danh mục</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <optgroup label="Danh mục phổ biến">
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                  {customCategoriesFromItems.length > 0 && (
                    <optgroup label="Danh mục riêng của shop">
                      {customCategoriesFromItems.map((c) => (
                        <option key={c} value={c}>
                          🏷️ {c}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 flex items-center justify-between">
                  <span>Cơ chế can thiệp hệ thống (AI Action) *</span>
                  <span className="text-[10px] font-normal text-slate-400">Quyền tác động vào CSDL</span>
                </label>
                <select
                  value={form.action_type || 'NONE'}
                  onChange={(e) => setForm({ ...form, action_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                >
                  <option value="NONE">💬 Chỉ tư vấn & giải đáp (Không can thiệp CSDL)</option>
                  <option value="CANCEL_ORDER">⚡ Tự động hủy đơn hàng (Khi thỏa điều kiện & khách xác nhận)</option>
                  <option value="UPDATE_ORDER">⚡ Tự động cập nhật đơn hàng (Đổi địa chỉ, SĐT, số lượng, mẫu)</option>
                  <option value="UPDATE_CUSTOMER">⚡ Tự động cập nhật thông tin khách hàng (Tên, SĐT, Địa chỉ)</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 italic">
                  {(ACTION_TYPE_MAP[form.action_type] || ACTION_TYPE_MAP.NONE).desc}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Nội dung chi tiết cho AI học *</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Nhập nội dung đầy đủ để AI nắm bắt ngữ cảnh và trả lời khách hàng chính xác..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Từ khóa kích hoạt (ngăn cách dấu phẩy)</label>
                <input
                  type="text"
                  placeholder="VD: đổi hàng, trả hàng, lỗi, hoàn tiền"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {creating ? 'Đang lưu...' : (editingId ? 'Cập nhật tài liệu' : 'Lưu tài liệu')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nhập file Excel/CSV */}
      <ImportKnowledgeModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        businessId={activeBusiness?._id}
        onImportSuccess={() => fetchKnowledge()}
      />

      {/* Modal xác nhận xóa thay thế window.confirm */}
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

export default KnowledgeBasePage;
