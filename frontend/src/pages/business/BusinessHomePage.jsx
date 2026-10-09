import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { channelService } from '../../services/channel.service.js';
import ConnectChannelModal from '../../components/modals/ConnectChannelModal.jsx';
import {
  MessageSquare,
  Package,
  Plus,
  Facebook,
  Store,
  Sparkles,
  Radio,
  Trash2,
  RefreshCw,
  Layers,
  ArrowLeft
} from 'lucide-react';

const BusinessHomePage = () => {
  const { user } = useAuth();
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [channels, setChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Tải danh sách Channels của Business hiện tại
  const fetchChannels = async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoadingChannels(true);
      const res = await channelService.getChannels(activeBusiness._id);
      if (res.success && Array.isArray(res.data)) {
        setChannels(res.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải kênh:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [activeBusiness?._id]);

  const handleDeleteChannel = async (channelId, channelName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa Fanpage "${channelName}" khỏi hệ thống?`)) return;
    try {
      const res = await channelService.deleteChannel(channelId);
      if (res.success) {
        showToast('success', 'Đã xóa kênh Fanpage thành công');
        fetchChannels();
      }
    } catch (error) {
      showToast('error', error.message || 'Lỗi khi xóa kênh');
    }
  };

  if (!activeBusiness) {
    return (
      <div className="text-center py-20">
        <Store size={48} className="mx-auto text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Chưa chọn Business nào</h2>
        <p className="text-xs text-slate-400 mt-1 mb-4">Vui lòng chọn một doanh nghiệp từ danh sách</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700"
        >
          ← Về Danh Sách Business
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* 1. BUSINESS HERO CARD */}
      <div className="bg-gradient-to-r from-[#17234e] via-[#1e2f69] to-[#25397f] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/3 w-60 h-60 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4">
            {activeBusiness.logo_url ? (
              <img
                src={activeBusiness.logo_url}
                alt={activeBusiness.business_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/20 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-2xl flex items-center justify-center shadow-lg shrink-0">
                {activeBusiness.code?.substring(0, 2) || 'BM'}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Đang hoạt động</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 text-[11px] font-mono font-bold">
                  Mã: {activeBusiness.code}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold">
                  {activeBusiness.industry || 'Bán lẻ & May mặc'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                {activeBusiness.business_name}
              </h1>

              <p className="text-xs text-slate-300 mt-1 flex items-center space-x-3 flex-wrap">
                <span>Chủ sở hữu: <strong>{user?.full_name}</strong></span>
                {activeBusiness.phone && <span>• Hotline: {activeBusiness.phone}</span>}
                {activeBusiness.email && <span>• Email: {activeBusiness.email}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => navigate('/livechat')}
              className="px-5 py-3 bg-[#f05a28] hover:bg-[#d94a1d] text-white rounded-2xl text-xs font-bold shadow-lg transition flex items-center space-x-2 cursor-pointer"
            >
              <MessageSquare size={16} />
              <span>Vào Hộp Thư Live Chat</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              title="Quay lại danh sách toàn bộ Business"
            >
              <ArrowLeft size={16} />
              <span>Đổi Business</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SECTION: CÁC KÊNH FANPAGE FACEBOOK CỦA BUSINESS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Facebook className="text-blue-600" size={22} />
                <span>Kênh Fanpage Facebook của Cửa Hàng</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold">
                {channels.length} Fanpage
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kết nối Fanpage Facebook để AI Bot tự động tiếp nhận tin nhắn Messenger, trả lời khách hàng và bóc tách đơn
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Kết nối Fanpage mới</span>
          </button>
        </div>

        {/* Danh sách Facebook Channels Grid */}
        {loadingChannels ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold flex items-center justify-center space-x-2">
            <RefreshCw size={16} className="animate-spin text-blue-600" />
            <span>Đang tải các Fanpage kết nối...</span>
          </div>
        ) : channels.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-3">
            <Facebook size={36} className="mx-auto text-blue-600" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chưa có Fanpage Facebook nào được kết nối cho {activeBusiness.business_name}
            </p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700"
            >
              + Kết nối Fanpage Facebook ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((ch) => (
                <div
                  key={ch._id}
                  onClick={() => navigate(`/livechat?channel_id=${ch._id}`)}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4 group cursor-pointer hover:border-blue-300 dark:hover:border-blue-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0 shadow-sm border border-blue-200 dark:border-blue-800">
                        <Facebook size={26} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition">
                          {ch.page_name}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                          Page ID: {ch.page_id}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChannel(ch._id, ch.page_name);
                      }}
                      className="text-slate-300 hover:text-red-500 p-1 rounded-lg transition"
                      title="Xóa Fanpage"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Trạng thái & Chế độ vận hành */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Chế độ AI:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                        <Sparkles size={13} />
                        <span>{ch.operating_mode === 'AI_AUTO' ? 'AI Tự Động 24/7' : ch.operating_mode === 'HYBRID' ? 'Chế độ Lai (Hybrid)' : 'Thủ công'}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Trạng thái:</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Sẵn sàng tiếp nhận tin nhắn</span>
                      </span>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/livechat?channel_id=${ch._id}`);
                      }}
                      className="flex-1 py-2 bg-blue-50 dark:bg-blue-950/60 group-hover:bg-blue-600 text-blue-600 group-hover:text-white dark:text-blue-300 dark:group-hover:text-white border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                    >
                      <MessageSquare size={14} />
                      <span>Xem Tin Nhắn Fanpage</span>
                    </button>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL KẾT NỐI FANPAGE FACEBOOK MỚI */}
      <ConnectChannelModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        businessId={activeBusiness._id}
        onChannelCreated={() => fetchChannels()}
      />
    </div>
  );
};

export default BusinessHomePage;
