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
  X
} from 'lucide-react';

const KnowledgeBasePage = () => {
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'GENERAL',
    content: '',
    keywords: ''
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
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải kho tri thức:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, [activeBusiness?._id, search, categoryFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      setCreating(true);
      const kw = form.keywords
        ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [];
      const res = await knowledgeService.createKnowledge({
        ...form,
        keywords: kw,
        business_id: activeBusiness._id
      });
      if (res.success) {
        showToast('success', 'Đã thêm tài liệu tri thức cho AI!');
        setShowModal(false);
        setForm({ title: '', category: 'GENERAL', content: '', keywords: '' });
        fetchKnowledge();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi lưu');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tài liệu "${title}"?`)) return;
    try {
      const res = await knowledgeService.deleteKnowledge(id, activeBusiness._id);
      if (res.success) {
        showToast('success', 'Đã xóa tài liệu tri thức');
        fetchKnowledge();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi xóa');
    }
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
      default:
        return '📑 Thông tin chung';
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

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>+ Thêm tài liệu tri thức</span>
        </button>
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
          {[
            { id: '', label: 'Tất cả' },
            { id: 'SHIPPING', label: 'Vận chuyển' },
            { id: 'RETURN_POLICY', label: 'Đổi trả' },
            { id: 'FAQ', label: 'FAQ' },
            { id: 'GENERAL', label: 'Chung' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
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
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700"
          >
            + Nạp tài liệu tri thức đầu tiên
          </button>
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
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 text-[10px] font-extrabold border border-blue-200 dark:border-blue-800">
                    {getCategoryLabel(item.category)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id, item.title)}
                    className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition"
                    title="Xóa tài liệu"
                  >
                    <Trash2 size={15} />
                  </button>
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

      {/* Modal Thêm tài liệu */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative text-slate-800 dark:text-slate-100">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Brain className="text-blue-600" />
              <span>Thêm Tài Liệu Tri Thức Mới</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-3.5">
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
                  <option value="GENERAL">📑 Thông tin chung</option>
                  <option value="SHIPPING">🚚 Chính sách vận chuyển & Phí ship</option>
                  <option value="RETURN_POLICY">🔄 Chính sách đổi trả & Bảo hành</option>
                  <option value="SIZE_GUIDE">📏 Bảng hướng dẫn chọn size</option>
                  <option value="PROMOTION">🎁 Khuyến mãi & Ưu đãi</option>
                  <option value="FAQ">❓ Câu hỏi thường gặp</option>
                </select>
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
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {creating ? 'Đang lưu...' : 'Lưu tài liệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBasePage;
