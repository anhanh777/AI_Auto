import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { businessService } from '../../services/business.service.js';
import JoinOrCreateBusinessModal from '../../components/modals/JoinOrCreateBusinessModal.jsx';
import {
  Building2,
  Plus,
  Search,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Store,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Archive,
  RotateCcw
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const { businesses, activeBusiness, switchBusiness, loading, fetchBusinesses } = useBusiness();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalDefaultStep, setModalDefaultStep] = useState('select');
  const [actionLoading, setActionLoading] = useState(false);

  // Lọc doanh nghiệp theo từ khóa
  const filteredBusinesses = businesses.filter((b) => {
    const name = b.business_name || b.name || '';
    const code = b.code || '';
    const industry = b.industry || b.category || '';
    const query = search.toLowerCase();
    return (
      name.toLowerCase().includes(query) ||
      code.toLowerCase().includes(query) ||
      industry.toLowerCase().includes(query)
    );
  });

  // State cho Custom Modal xác nhận Lưu trữ / Khôi phục
  const [archiveModal, setArchiveModal] = useState({
    isOpen: false,
    biz: null,
    isArchiving: true,
  });

  // Tách biệt danh sách đang hoạt động và danh sách đã lưu trữ
  const activeList = filteredBusinesses.filter((b) => b.is_active !== false);
  const archivedList = filteredBusinesses.filter((b) => b.is_active === false);

  // Khi chọn truy cập vào 1 business -> Vào Trang Nhắn tin của Business đó
  const handleEnterBusiness = (biz, targetPath = '/chat') => {
    switchBusiness(biz);
    navigate(targetPath);
  };

  // Mở modal xác nhận
  const openArchiveConfirm = (biz, isArchiving, e) => {
    if (e) e.stopPropagation();
    setArchiveModal({
      isOpen: true,
      biz,
      isArchiving,
    });
  };

  // Xử lý thực hiện Lưu trữ hoặc Khôi phục hoạt động mượt mà
  const handleConfirmArchive = async () => {
    const { biz, isArchiving } = archiveModal;
    if (!biz) return;

    try {
      setActionLoading(true);
      const res = await businessService.toggleArchiveBusiness(biz._id);
      
      // Đóng modal ngay và thông báo thành công
      setArchiveModal({ isOpen: false, biz: null, isArchiving: true });
      showToast(
        'success',
        isArchiving
          ? `Đã lưu trữ "${biz.business_name || biz.name}"`
          : `Đã khôi phục hoạt động cho "${biz.business_name || biz.name}"`
      );

      // Cập nhật lại danh sách doanh nghiệp
      if (fetchBusinesses) {
        await fetchBusinesses();
      }
    } catch (err) {
      const msg = err?.message || err?.response?.data?.message || 'Lỗi khi cập nhật trạng thái';
      showToast('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. THANH CÔNG CỤ & TIÊU ĐỀ (PORTAL HEADER) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Danh sách Business
          </h1>
          <span className="text-slate-400 font-semibold text-base sm:text-lg">
            ({activeList.length})
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Ô Tìm kiếm */}
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm transition"
            />
          </div>

          {/* Nút Thêm Business */}
          <button
            type="button"
            onClick={() => {
              setModalDefaultStep('select');
              setShowModal(true);
            }}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-[#f05a28] hover:bg-[#d94a1d] active:scale-98 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Thêm doanh nghiệp mới</span>
          </button>
        </div>
      </div>

      {/* 2. DANH SÁCH CARDS DOANH NGHIỆP ĐANG HOẠT ĐỘNG */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <RefreshCw size={28} className="animate-spin text-blue-600" />
          <p className="text-xs font-semibold">Đang tải danh sách không gian kinh doanh...</p>
        </div>
      ) : activeList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
            <Store size={32} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Chưa có Business nào đang hoạt động
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Bạn có thể tham gia vào một Business có sẵn bằng mã định danh hoặc tự khởi tạo một cửa hàng mới hoàn toàn.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center space-x-3">
            <button
              onClick={() => {
                setModalDefaultStep('join');
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition"
            >
              Nhập mã tham gia
            </button>
            <button
              onClick={() => {
                setModalDefaultStep('create');
                setShowModal(true);
              }}
              className="px-4 py-2 bg-[#f05a28] hover:bg-[#d94a1d] text-white rounded-xl text-xs font-bold shadow transition"
            >
              + Tạo Business mới
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {activeList.map((biz) => {
            const bizName = biz.business_name || biz.name;
            const bizCode = biz.code || 'BM';
            const bizIndustry = biz.industry || 'Bán lẻ - Thời trang & Phụ kiện';
            const ownerName = biz.owner_user_id?.full_name || biz.owner_id?.full_name || user?.full_name || 'Admin';
            const ownerAvatar =
              biz.owner_user_id?.avatar ||
              biz.owner_id?.avatar ||
              user?.avatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

            return (
              <div
                key={biz._id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition duration-200 space-y-3.5 group"
              >
                {/* Hàng trên: Logo + Tên + Mã Code + Kênh + Owner + Nút vào Cửa hàng + Nút Lưu trữ */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Bên trái: Avatar + Tên Shop + Ngành Hàng */}
                  <div
                    onClick={() => handleEnterBusiness(biz)}
                    className="flex items-center space-x-3.5 cursor-pointer min-w-0"
                  >
                    {biz.logo_url ? (
                      <img
                        src={biz.logo_url}
                        alt={bizName}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-base sm:text-lg flex items-center justify-center shrink-0 shadow-sm">
                        {bizCode.substring(0, 2)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition truncate">
                          {bizName}
                        </h2>
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 rounded-lg text-[10px] font-mono font-bold shrink-0">
                          {bizCode}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 mt-0.5 truncate">
                        {bizIndustry}
                      </p>
                    </div>
                  </div>

                  {/* Bên phải: Kênh/Channels + Owner + Nút Vào Chat + Nút Lưu trữ */}
                  <div className="flex items-center justify-between md:justify-end space-x-4 sm:space-x-5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700 shrink-0">
                    {/* Số lượng kênh Fanpage thực tế (Sửa triệt để bug 3 channels) */}
                    <div className="text-center px-2">
                      <span className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white">
                        {biz.channels_count ?? 0}
                      </span>
                      <p className="text-[11px] text-slate-400 font-medium">Channels</p>
                    </div>

                    {/* Owner info */}
                    <div className="text-center flex flex-col items-center px-2">
                      <img
                        src={ownerAvatar}
                        alt={ownerName}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 max-w-[90px] truncate">
                        {ownerName}
                      </p>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEnterBusiness(biz, '/chat')}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-300 dark:group-hover:text-white border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-sm"
                        title="Vào Nhắn tin của Doanh nghiệp"
                      >
                        <MessageSquare size={14} />
                        <span>Nhắn tin</span>
                      </button>

                      {/* Nút Lưu trữ (Archive) */}
                      <button
                        type="button"
                        onClick={(e) => openArchiveConfirm(biz, true, e)}
                        disabled={actionLoading}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer shrink-0"
                        title="Lưu trữ Business"
                      >
                        <Archive size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hàng dưới: Thanh cảnh báo / Trạng thái AI màu vàng nhạt */}
                <div className="p-2.5 sm:p-3 bg-[#fff8e6] dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl flex items-center space-x-2 text-xs text-amber-900 dark:text-amber-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                  <p className="line-clamp-1">
                    ✨ AI Bot đang tự động tư vấn, chốt deal và phân tích tri thức RAG trên các kênh của {bizName}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. MỤC DOANH NGHIỆP ĐÃ LƯU TRỮ */}
      <div className="pt-3">
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition cursor-pointer py-1"
        >
          <Archive size={16} className="text-amber-500" />
          <span>Danh sách Business đã lưu trữ</span>
          <span className="px-2 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
            {archivedList.length}
          </span>
          {showArchived ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showArchived && (
          <div className="mt-3 space-y-3 animate-fadeIn">
            {archivedList.length === 0 ? (
              <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                Hiện chưa có doanh nghiệp nào trong mục lưu trữ.
              </div>
            ) : (
              archivedList.map((biz) => {
                const bizName = biz.business_name || biz.name;
                const bizCode = biz.code || 'BM';

                return (
                  <div
                    key={biz._id}
                    className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-4 opacity-80 hover:opacity-100 transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center shrink-0">
                        {bizCode.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {bizName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center space-x-1">
                            <Archive size={10} />
                            <span>Đã lưu trữ</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Mã: {bizCode} • {biz.channels_count ?? 0} Channels
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => openArchiveConfirm(biz, false, e)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5 shrink-0 cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Khôi phục hoạt động</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* CUSTOM MODAL XÁC NHẬN LƯU TRỮ HOẶC KHÔI PHỤC */}
      {archiveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-scaleUp">
            <div className="flex items-center space-x-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  archiveModal.isArchiving
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                }`}
              >
                {archiveModal.isArchiving ? <Archive size={24} /> : <RotateCcw size={24} />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {archiveModal.isArchiving ? 'Lưu trữ Business' : 'Khôi phục Business'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Doanh nghiệp: <strong className="text-slate-800 dark:text-slate-200">{archiveModal.biz?.business_name || archiveModal.biz?.name}</strong>
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 leading-relaxed">
              {archiveModal.isArchiving ? (
                <span>
                  Khi chuyển sang trạng thái <strong>Lưu trữ</strong>, mọi hoạt động của bot AI, xử lý tin nhắn và dữ liệu của Business này sẽ tạm ngưng. Bạn có thể khôi phục lại bất kỳ lúc nào ở danh sách lưu trữ bên dưới.
                </span>
              ) : (
                <span>
                  Business sẽ được <strong>kích hoạt lại</strong> ngay lập tức. Các kênh kết nối và AI Bot sẽ hoạt động trở lại bình thường.
                </span>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setArchiveModal({ isOpen: false, biz: null, isArchiving: true })}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={actionLoading}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5 cursor-pointer ${
                  archiveModal.isArchiving
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionLoading && <RefreshCw size={14} className="animate-spin" />}
                <span>
                  {archiveModal.isArchiving ? 'Đồng ý Lưu trữ' : 'Đồng ý Khôi phục'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THAM GIA HOẶC TẠO BUSINESS MỚI (MULTI-TENANT) */}
      <JoinOrCreateBusinessModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultStep={modalDefaultStep}
      />
    </div>
  );
};

export default DashboardPage;
