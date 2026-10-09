import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { channelService } from '../../services/channel.service.js';
import { conversationService } from '../../services/conversation.service.js';
import ConnectChannelModal from '../../components/modals/ConnectChannelModal.jsx';
import {
  Search,
  ChevronDown,
  Facebook,
  MessageCircle,
  MessageSquare,
  Sparkles,
  Send,
  Image,
  Paperclip,
  Smile,
  Bot,
  User,
  Calendar,
  Users,
  Star,
  Phone,
  Eye,
  SlidersHorizontal,
  Settings,
  MoreVertical,
  CheckCheck,
  Tag,
  Radio,
  RefreshCw,
  Plus,
  Trash2,
  ArrowLeft,
  Store,
  Layers,
  LayoutGrid
} from 'lucide-react';

const LiveChatPage = () => {
  const { user } = useAuth();
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Channels state
  const [channels, setChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Conversations & Chat state
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  // 1. Tải danh sách Channels của Business
  const fetchChannels = async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoadingChannels(true);
      const res = await channelService.getChannels(activeBusiness._id);
      if (res.success && Array.isArray(res.data)) {
        setChannels(res.data);
        const paramChanId = searchParams.get('channel_id');
        if (paramChanId) {
          const found = res.data.find((c) => c._id === paramChanId);
          if (found) setActiveChannel(found);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải kênh:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [activeBusiness?._id]);

  // Đồng bộ activeChannel khi URL search param thay đổi
  useEffect(() => {
    const paramChanId = searchParams.get('channel_id');
    if (paramChanId && channels.length > 0) {
      const found = channels.find((c) => c._id === paramChanId);
      if (found) {
        setActiveChannel(found);
      }
    } else if (!paramChanId) {
      setActiveChannel(null);
    }
  }, [searchParams, channels]);

  // Chọn kênh -> Chuyển sang giao diện nhắn tin của kênh đó
  const handleSelectChannel = (channel) => {
    setActiveChannel(channel);
    setSelectedConv(null);
    setSearchParams({ channel_id: channel._id });
  };

  // Quay lại danh sách kênh (Giao diện khi chưa chọn kênh)
  const handleBackToChannelList = () => {
    setActiveChannel(null);
    setSelectedConv(null);
    setSearchParams({});
  };

  // Xóa kênh Fanpage
  const handleDeleteChannel = async (channelId, channelName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa Fanpage "${channelName}" khỏi hệ thống?`)) return;
    try {
      const res = await channelService.deleteChannel(channelId);
      if (res.success) {
        showToast('success', 'Đã xóa kênh Fanpage thành công');
        if (activeChannel?._id === channelId) {
          handleBackToChannelList();
        }
        fetchChannels();
      }
    } catch (error) {
      showToast('error', error.message || 'Lỗi khi xóa kênh');
    }
  };

  // 2. Tải danh sách Cuộc trò chuyện theo Business & Channel
  const fetchConversations = async () => {
    if (!activeBusiness?._id || !activeChannel) return;
    try {
      setLoadingConv(true);
      const params = {
        business_id: activeBusiness._id,
        channel_id: activeChannel._id,
        search: searchQuery || undefined,
        tag: selectedTag || undefined
      };
      const res = await conversationService.getConversations(params);
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải cuộc trò chuyện:', err);
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    if (activeChannel) {
      fetchConversations();
    }
  }, [activeBusiness?._id, activeChannel?._id, searchQuery, selectedTag]);

  // 3. Tải tin nhắn khi chọn cuộc trò chuyện
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConv?._id) {
        setMessages([]);
        return;
      }
      try {
        setLoadingMessages(true);
        const res = await conversationService.getMessages(selectedConv._id);
        if (res.success && Array.isArray(res.data)) {
          setMessages(res.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải tin nhắn:', err);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [selectedConv?._id]);

  // Cuộn xuống tin nhắn cuối cùng
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Gửi tin nhắn
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedConv?._id) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const res = await conversationService.sendMessage(selectedConv._id, {
        content: textToSend,
        sender_type: 'STAFF'
      });
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data]);
        fetchConversations();
      }
    } catch (err) {
      showToast('error', 'Lỗi khi gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  // 5. Bật/Tắt Bot AI cho hội thoại này
  const handleToggleBot = async () => {
    if (!selectedConv?._id) return;
    try {
      const res = await conversationService.toggleBot(selectedConv._id);
      if (res.success && res.data) {
        setSelectedConv(res.data);
        showToast('info', `Đã ${res.data.is_bot_active ? 'bật' : 'tạm dừng'} AI Bot cho khách hàng này`);
      }
    } catch (err) {
      showToast('error', 'Lỗi khi chuyển đổi trạng thái AI');
    }
  };

  // Format thời gian hiển thị (ví dụ 16:15 7/10)
  const formatMsgTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const day = d.getDate();
    const month = d.getMonth() + 1;
    return `${h}:${m} ${day}/${month}`;
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

  // =========================================================================
  // TRƯỜNG HỢP 1: CHƯA CHỌN KÊNH (GIAO DIỆN NHẮN TIN KHI CHƯA CHỌN KÊNH - KHỚP ẢNH)
  // =========================================================================
  if (!activeChannel) {
    return (
      <div className="space-y-6 animate-fadeIn pb-16">
        {/* 1. BUSINESS HERO BANNER (KHỚP 100% ẢNH CHỤP) */}
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
                  {activeBusiness.code?.substring(0, 2) || 'AO'}
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
                    {activeBusiness.industry || 'Bán lẻ - Thời trang & Phụ kiện'}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                  {activeBusiness.business_name}
                </h1>

                <p className="text-xs text-slate-300 mt-1 flex items-center space-x-3 flex-wrap">
                  <span>Chủ sở hữu: <strong>{user?.full_name || 'Anh Trần'}</strong></span>
                  {activeBusiness.phone && <span>• Hotline: {activeBusiness.phone}</span>}
                  {activeBusiness.email && <span>• Email: {activeBusiness.email}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              {channels.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectChannel(channels[0])}
                  className="px-5 py-3 bg-[#f05a28] hover:bg-[#d94a1d] text-white rounded-2xl text-xs font-bold shadow-lg transition flex items-center space-x-2 cursor-pointer"
                >
                  <MessageSquare size={16} />
                  <span>Vào Hộp Thư Live Chat</span>
                </button>
              )}
              <button
                type="button"
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

        {/* 2. SECTION: CÁC KÊNH FANPAGE FACEBOOK CỦA BUSINESS (KHỚP ẢNH) */}
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

          {/* Danh sách Facebook Channels Grid hoặc Trạng thái trống */}
          {loadingChannels ? (
            <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center space-x-2">
              <RefreshCw size={16} className="animate-spin text-blue-600" />
              <span>Đang tải các Fanpage kết nối...</span>
            </div>
          ) : channels.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                <Facebook size={36} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Chưa có Fanpage Facebook nào được kết nối cho {activeBusiness.business_name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Hãy kết nối một trang Fanpage Facebook để bắt đầu trò chuyện và kích hoạt Trợ lý AI
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer inline-flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>+ Kết nối Fanpage Facebook ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((ch) => (
                <div
                  key={ch._id}
                  onClick={() => handleSelectChannel(ch)}
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
                      className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg transition hover:bg-red-50 dark:hover:bg-red-950/40"
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
                        <span>
                          {ch.operating_mode === 'AI_AUTO'
                            ? 'AI Tự Động 24/7'
                            : ch.operating_mode === 'HYBRID'
                            ? 'Chế độ Lai (Hybrid)'
                            : 'Thủ công'}
                        </span>
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
                        handleSelectChannel(ch);
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
  }

  // =========================================================================
  // TRƯỜNG HỢP 2: ĐÃ CHỌN KÊNH (GIAO DIỆN NHẮN TIN CHI TIẾT CỦA KÊNH ĐÓ)
  // =========================================================================
  return (
    <div className="h-[calc(100vh-3.5rem)] -m-3 sm:-m-6 lg:-m-8 flex bg-[#f0f2f5] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 overflow-hidden select-none animate-fadeIn">
      {/* ================= 1. CỘT ICON BAR TRÁI (MINI SIDEBAR) ================= */}
      <aside className="w-14 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between py-3 shrink-0 z-10 shadow-sm">
        <div className="flex flex-col items-center space-y-3">
          {/* Nút Quay lại danh sách Fanpage */}
          <button
            type="button"
            onClick={handleBackToChannelList}
            className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="← Quay lại danh sách kênh Fanpage"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="w-6 h-px bg-slate-200 dark:bg-slate-800"></div>

          {/* Fanpage Avatar */}
          <div className="relative group cursor-pointer" title={`Đang xem: ${activeChannel.page_name}`}>
            {activeChannel.avatar_url ? (
              <img
                src={activeChannel.avatar_url}
                alt="Page Avatar"
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-blue-500 shadow"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow">
                FB
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] shadow">
              <Facebook size={10} />
            </span>
          </div>

          <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1"></div>

          {/* Menu Icons */}
          <button
            type="button"
            className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-950/60 rounded-xl transition cursor-pointer"
            title="Hộp thư tin nhắn"
          >
            <MessageSquare size={18} />
          </button>

          <button
            type="button"
            onClick={fetchConversations}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Làm mới hội thoại"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Bottom Icons */}
        <div className="flex flex-col items-center space-y-2">
          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Thêm Fanpage mới"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={handleBackToChannelList}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Danh sách kênh"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </aside>

      {/* ================= 2. CỘT DANH SÁCH HỘI THOẠI (CONVERSATION LIST) ================= */}
      <div className="w-80 lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        {/* Header kênh đang chọn & Dropdown chuyển kênh */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 min-w-0">
              <button
                type="button"
                onClick={handleBackToChannelList}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition cursor-pointer"
                title="Đổi kênh khác"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <h2 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {activeChannel.page_name}
                </h2>
                <span className="text-[10px] text-slate-400 font-mono">
                  ID: {activeChannel.page_id}
                </span>
              </div>
            </div>

            {/* Dropdown switch nhanh kênh khác */}
            {channels.length > 1 && (
              <select
                value={activeChannel._id}
                onChange={(e) => {
                  const target = channels.find((c) => c._id === e.target.value);
                  if (target) handleSelectChannel(target);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 max-w-[110px] truncate"
              >
                {channels.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.page_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Ô Tìm kiếm hội thoại */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên khách, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Filter Tags (Sp/L'vento, Hot MKT) */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedTag('')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer ${
                selectedTag === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setSelectedTag('Sp/L\'vento')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer flex items-center space-x-1 ${
                selectedTag === 'Sp/L\'vento'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50'
              }`}
            >
              <span>Sp/L'vento</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTag('Hot MKT')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer flex items-center space-x-1 ${
                selectedTag === 'Hot MKT'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/50'
              }`}
            >
              <span>Hot MKT</span>
            </button>
          </div>
        </div>

        {/* Danh sách các luồng hội thoại */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 no-scrollbar">
          {loadingConv ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold flex items-center justify-center space-x-2">
              <RefreshCw size={15} className="animate-spin text-blue-600" />
              <span>Đang tải tin nhắn...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-1">
              <p className="font-bold text-slate-600 dark:text-slate-300">Chưa có hội thoại nào</p>
              <p className="text-[11px]">Tin nhắn khách gửi từ Fanpage sẽ hiển thị tại đây</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = selectedConv?._id === conv._id;
              const customerName = conv.customer_id?.full_name || 'Khách hàng Facebook';
              const customerAvatar =
                conv.customer_id?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

              return (
                <div
                  key={conv._id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-3 transition flex items-start space-x-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={customerAvatar}
                      alt={customerName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute bottom-0 right-0"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {customerName}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatMsgTime(conv.last_message_at)}
                      </span>
                    </div>

                    {/* Tag badges */}
                    {conv.tags && conv.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {conv.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold ${
                              tag.includes('vento') || tag.includes('Sp')
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50'
                                : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/50'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Last message preview */}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {conv.last_message_text || 'Bắt đầu cuộc trò chuyện...'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= 3. KHU VỰC CHAT CHÍNH (MAIN CHAT WINDOW) ================= */}
      <div className="flex-1 flex flex-col bg-[#e5e7eb]/40 dark:bg-[#0b1120] relative">
        {/* Trường hợp chưa chọn cuộc hội thoại nào: Hiển thị "Have a good day 😊" */}
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 space-y-4 animate-fadeIn">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-600 dark:text-slate-300 tracking-tight">
              Have a good day 😊
            </h2>
            <p className="text-xs text-slate-400 max-w-sm text-center">
              Chọn một khách hàng từ danh sách bên trái để xem lịch sử trò chuyện và bắt đầu tư vấn
            </p>
          </div>
        ) : (
          /* Khung chat hội thoại */
          <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 animate-fadeIn">
            {/* Top Bar of Active Conversation */}
            <div className="h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedConv.customer_id?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt="Customer"
                  className="w-9 h-9 rounded-full object-cover border"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedConv.customer_id?.full_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 text-[10px] font-bold flex items-center space-x-1">
                      <Facebook size={10} />
                      <span>{activeChannel.page_name}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    SĐT: {selectedConv.customer_id?.phone || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              {/* Bot AI Status Toggle */}
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleToggleBot}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border ${
                    selectedConv.is_bot_active
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                  title="Bật/Tắt Bot AI tự động trả lời cho hội thoại này"
                >
                  <Sparkles size={14} className={selectedConv.is_bot_active ? 'animate-pulse text-emerald-500' : ''} />
                  <span>{selectedConv.is_bot_active ? 'Bot AI Đang Bật' : 'Bot AI Đã Tắt'}</span>
                </button>
              </div>
            </div>

            {/* Messages Timeline */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fafc] dark:bg-[#0b1120] no-scrollbar">
              {loadingMessages ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium flex items-center justify-center space-x-2">
                  <RefreshCw size={16} className="animate-spin text-blue-600" />
                  <span>Đang nạp tin nhắn...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Bắt đầu cuộc trò chuyện với khách hàng ngay bây giờ
                </div>
              ) : (
                messages.map((msg) => {
                  const isCustomer = msg.sender_type === 'CUSTOMER';
                  const isBot = msg.sender_type === 'AI_BOT';

                  return (
                    <div
                      key={msg._id}
                      className={`flex items-end space-x-2 ${isCustomer ? 'justify-start' : 'justify-end'}`}
                    >
                      {isCustomer && (
                        <img
                          src={selectedConv.customer_id?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt="Customer"
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      )}

                      <div
                        className={`max-w-[70%] sm:max-w-md p-3 rounded-2xl text-xs space-y-1 shadow-sm ${
                          isCustomer
                            ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/80 dark:border-slate-700'
                            : isBot
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                            : 'bg-blue-600 text-white rounded-br-none'
                        }`}
                      >
                        {isBot && (
                          <div className="flex items-center space-x-1 text-[10px] font-bold text-blue-200 pb-0.5">
                            <Sparkles size={11} />
                            <span>AI Sales Assistant</span>
                          </div>
                        )}
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className={`text-[9px] flex justify-end ${isCustomer ? 'text-slate-400' : 'text-blue-100'}`}>
                          {formatMsgTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Message Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-slate-400 shrink-0">
                <button type="button" className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Gửi ảnh">
                  <Image size={18} />
                </button>
                <button type="button" className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Đính kèm tệp">
                  <Paperclip size={18} />
                </button>
                <button type="button" className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Biểu tượng cảm xúc">
                  <Smile size={18} />
                </button>
              </div>

              <input
                type="text"
                placeholder="Nhập tin nhắn trả lời khách hàng..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />

              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow transition cursor-pointer shrink-0 flex items-center justify-center"
              >
                <Send size={16} />
              </button>
            </form>
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

export default LiveChatPage;
