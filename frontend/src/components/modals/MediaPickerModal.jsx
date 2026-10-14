import React, { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { mediaService } from '../../services/media.service.js';
import {
  X,
  Image as ImageIcon,
  UploadCloud,
  Search,
  Check,
  RefreshCw,
  Folder,
  Tag,
  Plus,
  AlertCircle
} from 'lucide-react';

const FOLDER_CATEGORIES = [
  { id: 'all', label: 'Tất cả ảnh' },
  { id: 'products', label: 'Ảnh Sản phẩm' },
  { id: 'bot', label: 'Kịch bản Bot' },
  { id: 'size_charts', label: 'Bảng size & Thông số' },
  { id: 'vouchers', label: 'Voucher & Giảm giá' },
  { id: 'banners', label: 'Banner & Quảng cáo' },
  { id: 'feedback', label: 'Feedback khách hàng' },
  { id: 'general', label: 'Tài liệu chung' }
];

const MediaPickerModal = ({
  isOpen,
  onClose,
  onSelect,
  multiple = true,
  initialFolder = 'all'
}) => {
  const { activeBusiness } = useBusiness();

  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'upload'
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(initialFolder);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // State upload mới
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadFolder, setUploadFolder] = useState('bot');
  const [uploadTags, setUploadTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Tải danh sách ảnh từ Kho Media
  const fetchMedia = useCallback(async () => {
    if (!activeBusiness?._id || !isOpen) return;
    try {
      setLoading(true);
      const res = await mediaService.getMedia({
        business_id: activeBusiness._id,
        folder: currentFolder === 'all' ? undefined : currentFolder,
        search: search.trim() || undefined,
        page,
        limit: 28
      });

      if (res.success && res.data) {
        setMediaList(res.data.assets || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Lỗi khi tải Kho Media:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?._id, isOpen, currentFolder, search, page]);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    } else {
      setSelectedUrls([]);
      setUploadFiles([]);
      setUploadError('');
    }
  }, [isOpen, fetchMedia]);

  // Xử lý tick chọn ảnh
  const toggleSelect = (url) => {
    if (!multiple) {
      setSelectedUrls([url]);
      return;
    }

    if (selectedUrls.includes(url)) {
      setSelectedUrls(selectedUrls.filter((u) => u !== url));
    } else {
      setSelectedUrls([...selectedUrls, url]);
    }
  };

  // Xác nhận chèn ảnh
  const handleConfirm = () => {
    if (selectedUrls.length > 0) {
      onSelect(selectedUrls);
      onClose();
    }
  };

  // Quét đồng bộ ảnh từ danh mục Sản phẩm
  const handleSyncProducts = async () => {
    if (!activeBusiness?._id) return;
    try {
      setSyncing(true);
      const res = await mediaService.syncProductMedia(activeBusiness._id);
      if (res.success) {
        fetchMedia();
      }
    } catch (err) {
      console.error('Lỗi khi quét ảnh sản phẩm:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Upload ảnh mới
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      setUploadError('Vui lòng chọn ít nhất 1 file ảnh');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      const tagsArray = uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await mediaService.uploadMedia(
        uploadFiles,
        uploadFolder,
        tagsArray,
        '',
        activeBusiness._id
      );

      if (res.success && res.data) {
        const newUrls = res.data.map((item) => item.file_url);
        // Tự động chọn các ảnh vừa upload
        if (multiple) {
          setSelectedUrls((prev) => [...prev, ...newUrls]);
        } else if (newUrls.length > 0) {
          setSelectedUrls([newUrls[0]]);
        }

        setUploadFiles([]);
        setUploadTags('');
        setActiveTab('library');
        fetchMedia();
      }
    } catch (err) {
      setUploadError(err.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Kho Tư liệu & Media Doanh nghiệp
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeBusiness?.business_name || 'Business'} • Chọn ảnh để nạp vào kịch bản Bot, sản phẩm hoặc chat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl mr-2">
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'library'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Thư viện ảnh ({pagination.total})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Tải ảnh mới
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: THƯ VIỆN ẢNH */}
        {activeTab === 'library' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
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
                    className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                      currentFolder === cat.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search & Sync Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm tên ảnh, tag..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSyncProducts}
                  disabled={syncing}
                  title="Tự động quét và gom tất cả ảnh sản phẩm vào Kho"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
                  {syncing ? 'Đang quét...' : 'Quét ảnh SP'}
                </button>
              </div>
            </div>

            {/* Media Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950/30">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                  <p className="text-sm">Đang tải Kho ảnh doanh nghiệp...</p>
                </div>
              ) : mediaList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chưa có ảnh nào trong thư mục này
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4">
                    Bạn có thể tải ảnh mới lên hoặc bấm nút &quot;Quét ảnh SP&quot; để tự động gom toàn bộ ảnh sản phẩm của shop vào đây.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Tải ảnh mới ngay
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncProducts}
                      disabled={syncing}
                      className="px-4 py-2 text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      {syncing ? 'Đang quét...' : 'Quét ảnh từ Sản phẩm'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
                  {mediaList.map((item) => {
                    const isSelected = selectedUrls.includes(item.file_url);
                    const selectedIndex = selectedUrls.indexOf(item.file_url) + 1;

                    return (
                      <div
                        key={item._id}
                        onClick={() => toggleSelect(item.file_url)}
                        className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-200 bg-white dark:bg-slate-800 shadow-sm ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-500/30 scale-[0.98]'
                            : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                        }`}
                      >
                        <img
                          src={item.file_url}
                          alt={item.file_name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src =
                              'https://placehold.co/300x300/e2e8f0/64748b?text=Image+Error';
                          }}
                        />

                        {/* Selection Badge */}
                        <div
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                            isSelected
                              ? 'bg-blue-600 text-white scale-100'
                              : 'bg-black/40 text-white opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {isSelected ? (multiple ? selectedIndex : <Check className="w-3.5 h-3.5" />) : ''}
                        </div>

                        {/* Bottom Tag / Name Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[11px] font-medium truncate leading-tight">
                            {item.file_name}
                          </p>
                          <span className="text-[9px] text-slate-300 uppercase font-semibold">
                            {item.folder}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination if multiple pages */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-white dark:bg-slate-900">
                <span>
                  Trang {pagination.page} / {pagination.totalPages} ({pagination.total} ảnh)
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: TẢI ẢNH MỚI LÊN KHO */}
        {activeTab === 'upload' && (
          <form onSubmit={handleUploadSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-white dark:bg-slate-900">
            {uploadError && (
              <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Drag & Drop Area */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors bg-slate-50/50 dark:bg-slate-800/30">
              <UploadCloud className="w-12 h-12 text-blue-500 mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                Kéo thả hoặc duyệt file ảnh từ máy tính
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Hỗ trợ JPG, PNG, WEBP, GIF (Tải tối đa 20 ảnh cùng lúc)
              </p>

              <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors">
                <span>Chọn ảnh từ máy</span>
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
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                  Đã chọn {uploadFiles.length} file: {uploadFiles.map((f) => f.name).slice(0, 3).join(', ')}
                  {uploadFiles.length > 3 ? ` và ${uploadFiles.length - 3} file khác...` : ''}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-blue-500" />
                  Lưu vào Thư mục
                </label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  Gắn thẻ tìm kiếm (cách nhau bởi dấu phẩy)
                </label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="Ví dụ: size_ao, polo, giam_gia_20k"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={uploading || uploadFiles.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                <UploadCloud className={`w-4 h-4 ${uploading ? 'animate-bounce' : ''}`} />
                {uploading ? 'Đang tải lên...' : `Tải lên ${uploadFiles.length} ảnh`}
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {selectedUrls.length > 0 ? (
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Đã chọn {selectedUrls.length} ảnh
              </span>
            ) : (
              <span>Chưa chọn ảnh nào</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={selectedUrls.length === 0}
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Xác nhận chèn ({selectedUrls.length}) ảnh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPickerModal;
