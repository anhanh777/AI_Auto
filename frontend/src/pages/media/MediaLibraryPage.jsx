import React, { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { mediaService } from '../../services/media.service.js';
import {
  Image as ImageIcon,
  UploadCloud,
  Search,
  Check,
  RefreshCw,
  Folder,
  Tag,
  Trash2,
  Copy,
  ExternalLink,
  Edit2,
  HardDrive,
  Layers,
  Sparkles,
  Maximize2,
  X,
  AlertCircle,
  CheckCircle2,
  Plus,
  SlidersHorizontal
} from 'lucide-react';

const FOLDER_CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'products', label: 'Ảnh Sản phẩm' },
  { id: 'bot', label: 'Kịch bản Bot' },
  { id: 'size_charts', label: 'Bảng size & Thông số' },
  { id: 'vouchers', label: 'Voucher & Giảm giá' },
  { id: 'banners', label: 'Banner & Quảng cáo' },
  { id: 'feedback', label: 'Feedback khách hàng' },
  { id: 'general', label: 'Tài liệu chung' }
];

const MediaLibraryPage = () => {
  const { activeBusiness } = useBusiness();

  // State danh sách & filter
  const [mediaList, setMediaList] = useState([]);
  const [stats, setStats] = useState({ totalFiles: 0, totalSizeMB: '0.00', byFolder: {} });
  const [loading, setLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals & Popups
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Upload Form State
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadFolder, setUploadFolder] = useState('bot');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  // Toast notification
  const [toast, setToast] = useState(null);
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Tải danh sách ảnh
  const fetchMedia = useCallback(async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoading(true);
      const [mediaRes, statsRes] = await Promise.all([
        mediaService.getMedia({
          business_id: activeBusiness._id,
          folder: currentFolder === 'all' ? undefined : currentFolder,
          search: search.trim() || undefined,
          page,
          limit: 24
        }),
        mediaService.getStats({ business_id: activeBusiness._id })
      ]);

      if (mediaRes.success && mediaRes.data) {
        setMediaList(mediaRes.data.assets || []);
        setPagination(mediaRes.data.pagination || { total: 0, totalPages: 1 });
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải Kho Media:', err);
      showToast('error', err.message || 'Lỗi khi tải Kho Media');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?._id, currentFolder, search, page]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Quét đồng bộ ảnh từ Sản phẩm
  const handleSyncProducts = async () => {
    if (!activeBusiness?._id) return;
    try {
      setSyncing(true);
      const res = await mediaService.syncProductMedia(activeBusiness._id);
      if (res.success) {
        showToast('success', res.message || 'Đồng bộ ảnh sản phẩm thành công');
        fetchMedia();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi đồng bộ ảnh sản phẩm');
    } finally {
      setSyncing(false);
    }
  };

  // Upload ảnh mới
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      showToast('error', 'Vui lòng chọn ít nhất 1 file ảnh');
      return;
    }

    try {
      setUploading(true);
      const tagsArray = uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await mediaService.uploadMedia(
        uploadFiles,
        uploadFolder,
        tagsArray,
        uploadCaption,
        activeBusiness._id
      );

      if (res.success) {
        showToast('success', `Đã tải lên ${res.data.length} ảnh vào kho thành công`);
        setShowUploadModal(false);
        setUploadFiles([]);
        setUploadTags('');
        setUploadCaption('');
        fetchMedia();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setUploading(false);
    }
  };

  // Cập nhật thông tin ảnh
  const handleUpdateAsset = async (e) => {
    e.preventDefault();
    if (!editingAsset) return;

    try {
      const tagsArray = typeof editingAsset.tags === 'string'
        ? editingAsset.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : editingAsset.tags;

      const res = await mediaService.updateMedia(
        editingAsset._id,
        {
          file_name: editingAsset.file_name,
          folder: editingAsset.folder,
          tags: tagsArray,
          caption: editingAsset.caption
        },
        activeBusiness._id
      );

      if (res.success) {
        showToast('success', 'Đã cập nhật thông tin ảnh');
        setEditingAsset(null);
        fetchMedia();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi cập nhật ảnh');
    }
  };

  // Xóa 1 ảnh
  const handleDeleteSingle = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ảnh "${name}" khỏi kho?`)) return;

    try {
      const res = await mediaService.deleteMedia(id, activeBusiness._id);
      if (res.success) {
        showToast('success', 'Đã xóa ảnh thành công');
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        fetchMedia();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi xóa ảnh');
    }
  };

  // Xóa hàng loạt
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} ảnh đã chọn khỏi kho?`)) return;

    try {
      setDeletingBulk(true);
      const res = await mediaService.bulkDeleteMedia(selectedIds, activeBusiness._id);
      if (res.success) {
        showToast('success', res.message || `Đã xóa ${selectedIds.length} ảnh`);
        setSelectedIds([]);
        fetchMedia();
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi xóa nhiều ảnh');
    } finally {
      setDeletingBulk(false);
    }
  };

  // Toggle tick chọn
  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Chọn tất cả ảnh trang hiện tại
  const toggleSelectAll = () => {
    if (selectedIds.length === mediaList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(mediaList.map((m) => m._id));
    }
  };

  // Copy URL
  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    showToast('success', 'Đã sao chép link ảnh vào clipboard');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-slide-up border ${
            toast.type === 'error'
              ? 'bg-red-500 text-white border-red-600'
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
            <ImageIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Kho Tư liệu & Media Doanh Nghiệp
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full">
                Multi-Tenant Media Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quản lý tập trung hình ảnh sản phẩm, bảng size, voucher, banner phục vụ cho Bot tin nhắn, AI Gemini và LiveChat
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleSyncProducts}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
            {syncing ? 'Đang quét...' : 'Quét ảnh từ Sản phẩm'}
          </button>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deletingBulk}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-xl transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa ({selectedIds.length}) ảnh đã chọn
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            Tải ảnh lên Kho
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tổng số ảnh</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalFiles}</h3>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Dung lượng sử dụng</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalSizeMB} MB</h3>
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Ảnh Sản phẩm</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.byFolder?.products?.count || 0}
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
            <ImageIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Kịch bản Bot & Size</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {(stats.byFolder?.bot?.count || 0) + (stats.byFolder?.size_charts?.count || 0)}
            </h3>
          </div>
          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Folder Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {FOLDER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCurrentFolder(cat.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  currentFolder === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm kiếm theo tên file, tag..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sub-toolbar (Select All checkbox) */}
        {mediaList.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedIds.length === mediaList.length && mediaList.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Chọn tất cả {mediaList.length} ảnh trên trang này</span>
            </label>

            <span>
              Trang {pagination.page} / {pagination.totalPages} ({pagination.total} ảnh)
            </span>
          </div>
        )}
      </div>

      {/* Main Media Grid */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm">Đang tải kho ảnh doanh nghiệp...</p>
          </div>
        ) : mediaList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <ImageIcon className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              Chưa có ảnh nào trong thư mục này
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Bắt đầu thêm ảnh vào kho để Bot tự động và AI Gemini có thể gửi cho khách hàng.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
              >
                Tải ảnh mới ngay
              </button>
              <button
                type="button"
                onClick={handleSyncProducts}
                disabled={syncing}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
              >
                {syncing ? 'Đang quét...' : 'Quét ảnh từ Sản phẩm'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mediaList.map((item) => {
              const isSelected = selectedIds.includes(item._id);

              return (
                <div
                  key={item._id}
                  className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 bg-slate-50 dark:bg-slate-800/60 flex flex-col ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-900/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                  }`}
                >
                  {/* Aspect Square Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer">
                    <img
                      src={item.file_url}
                      alt={item.file_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onClick={() => setPreviewImage(item)}
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://placehold.co/300x300/e2e8f0/64748b?text=Image+Error';
                      }}
                    />

                    {/* Top Checkbox overlay */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item._id);
                      }}
                      className="absolute top-2 left-2 p-1 rounded-lg bg-black/40 backdrop-blur-sm cursor-pointer transition-opacity"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </div>

                    {/* Quick action buttons on hover */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(item);
                        }}
                        title="Phóng to ảnh"
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyUrl(item.file_url);
                        }}
                        title="Copy link ảnh"
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Folder Badge */}
                    <div className="absolute bottom-2 left-2">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm rounded-md uppercase">
                        {item.folder}
                      </span>
                    </div>
                  </div>

                  {/* Card Info Details */}
                  <div className="p-3 flex flex-col justify-between flex-1 gap-1.5 text-xs">
                    <p
                      className="font-semibold text-slate-800 dark:text-slate-200 truncate"
                      title={item.file_name}
                    >
                      {item.file_name}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatFileSize(item.file_size)}</span>
                      <span>{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingAsset({
                            ...item,
                            tags: Array.isArray(item.tags) ? item.tags.join(', ') : ''
                          })
                        }
                        className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Edit2 className="w-3 h-3" />
                        Sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(item._id, item.file_name)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Hiển thị {mediaList.length} trên tổng số {pagination.total} ảnh
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
              >
                Trang trước
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: TẢI ẢNH MỚI */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Tải ảnh mới vào Kho Doanh Nghiệp
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
              {/* Drop area */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/30">
                <ImageIcon className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Chọn ảnh từ máy tính để tải lên
                </p>
                <p className="text-[11px] text-slate-400 mb-3">
                  Tải tối đa 20 file cùng lúc (JPG, PNG, WEBP, GIF)
                </p>
                <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl inline-block shadow-sm">
                  <span>Duyệt file</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setUploadFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                </label>

                {uploadFiles.length > 0 && (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-left">
                    ✓ Đã chọn {uploadFiles.length} file: {uploadFiles.map((f) => f.name).slice(0, 2).join(', ')}
                    {uploadFiles.length > 2 ? ` và ${uploadFiles.length - 2} file khác...` : ''}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-blue-500" />
                    Thư mục phân loại
                  </label>
                  <select
                    value={uploadFolder}
                    onChange={(e) => setUploadFolder(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  >
                    <option value="bot">Kịch bản Bot</option>
                    <option value="size_charts">Bảng size & Thông số</option>
                    <option value="vouchers">Voucher & Khuyến mãi</option>
                    <option value="products">Ảnh Sản phẩm</option>
                    <option value="banners">Banner & Quảng cáo</option>
                    <option value="feedback">Feedback khách hàng</option>
                    <option value="general">Tài liệu chung</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    Tags gợi nhớ
                  </label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="size_polo, voucher_50k..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả / Chú thích ảnh (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Ví dụ: Bảng chọn size chuẩn form nam mùa hè 2026"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading || uploadFiles.length === 0}
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                >
                  <UploadCloud className="w-4 h-4" />
                  {uploading ? 'Đang tải lên...' : `Xác nhận tải (${uploadFiles.length}) ảnh`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SỬA THÔNG TIN ẢNH */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Chỉnh sửa thông tin ảnh
              </h3>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAsset} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên file hiển thị
                </label>
                <input
                  type="text"
                  value={editingAsset.file_name}
                  onChange={(e) =>
                    setEditingAsset({ ...editingAsset, file_name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thư mục phân loại
                </label>
                <select
                  value={editingAsset.folder}
                  onChange={(e) =>
                    setEditingAsset({ ...editingAsset, folder: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                >
                  <option value="bot">Kịch bản Bot</option>
                  <option value="size_charts">Bảng size & Thông số</option>
                  <option value="vouchers">Voucher & Khuyến mãi</option>
                  <option value="products">Ảnh Sản phẩm</option>
                  <option value="banners">Banner & Quảng cáo</option>
                  <option value="feedback">Feedback khách hàng</option>
                  <option value="general">Tài liệu chung</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tags tìm kiếm (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={editingAsset.tags || ''}
                  onChange={(e) =>
                    setEditingAsset({ ...editingAsset, tags: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chú thích / Mô tả
                </label>
                <input
                  type="text"
                  value={editingAsset.caption || ''}
                  onChange={(e) =>
                    setEditingAsset({ ...editingAsset, caption: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-colors"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LIGHTBOX PREVIEW FULLSIZE */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={previewImage.file_url}
              alt={previewImage.file_name}
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
            />

            <div className="w-full px-4 py-3 text-white flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-sm">{previewImage.file_name}</p>
                <p className="text-slate-400 text-[11px]">
                  Thư mục: <span className="uppercase font-semibold text-blue-400">{previewImage.folder}</span> •{' '}
                  Kích thước: {formatFileSize(previewImage.file_size)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copyUrl(previewImage.file_url)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy URL
                </button>
                <a
                  href={previewImage.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở tab mới
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibraryPage;
