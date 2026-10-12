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
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  ArrowLeft,
  Video,
  FileText,
  Headphones,
  Megaphone,
  ArrowUpDown,
  PanelLeftClose,
  CornerDownLeft,
  X,
  Store,
  Tag,
  Check,
  CheckCheck,
  ShoppingBag,
  Clock
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
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCustomerCrm, setShowCustomerCrm] = useState(false);

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
        } else if (res.data.length > 0 && !activeChannel) {
          // Tự động chọn kênh đầu tiên nếu chỉ có 1 kênh hoặc chưa chọn
          setActiveChannel(res.data[0]);
          setSearchParams({ channel_id: res.data[0]._id });
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
    } else if (!paramChanId && channels.length > 0) {
      setActiveChannel(channels[0]);
      setSearchParams({ channel_id: channels[0]._id });
    }
  }, [searchParams, channels]);

  // Chọn kênh
  const handleSelectChannel = (channel) => {
    setActiveChannel(channel);
    setSelectedConv(null);
    setSearchParams({ channel_id: channel._id });
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

  // Format thời gian hiển thị (ví dụ 16:22)
  const formatMsgTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Danh sách thẻ phân loại chuẩn của dự án AI_Auto
  const tagOptions = [
    { label: 'Tất cả nhãn', value: '' },
    { label: '⭐ Khách VIP', value: 'VIP' },
    { label: 'Tiềm năng', value: 'Tiềm năng' },
    { label: 'Khách mới', value: 'Khách mới' },
    { label: 'Đã mua hàng', value: 'Đã mua hàng' },
    { label: '⚠️ Cảnh giác bom hàng', value: 'BO_BOM' }
  ];

  if (!activeBusiness) {
    return (
      <div className="text-center py-20">
        <Store size={48} className="mx-auto text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Chưa chọn Doanh nghiệp nào</h2>
        <p className="text-xs text-slate-400 mt-1 mb-4">Vui lòng chọn một doanh nghiệp từ danh sách</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700"
        >
          Đến Trang Quản Trị
        </button>
      </div>
    );
  }

  // Trường hợp chưa có kênh nào được kết nối
  if (!loadingChannels && channels.length === 0) {
    return (
      <div className="h-[calc(100vh-3.5rem)] -m-3 sm:-m-6 lg:-m-8 flex items-center justify-center bg-[#f0f2f5] dark:bg-[#0f172a] p-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-700 text-center space-y-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1877F2] flex items-center justify-center mx-auto shadow-md">
            <Facebook size={36} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Chưa Có Kênh Fanpage Nào
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Hãy kết nối Fanpage Facebook để bắt đầu nhận tin nhắn thời gian thực và tự động chốt đơn bằng AI.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="w-full py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-bold shadow-md shadow-[#1877F2]/25 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Kết Nối Fanpage Facebook Mới</span>
          </button>
        </div>

        <ConnectChannelModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          businessId={activeBusiness._id}
          onChannelCreated={() => fetchChannels()}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] -m-3 sm:-m-6 lg:-m-8 flex bg-[#f0f2f5] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 overflow-hidden select-none animate-fadeIn font-sans">
      {/* =========================================================================
          CỘT 1: NARROW ICON NAVIGATION BAR (BÊN TRÁI CÙNG - 56PX)
          ========================================================================= */}
      <aside className="w-14 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 flex flex-col items-center justify-between py-3 shrink-0 z-20 shadow-[1px_0_3px_rgba(0,0,0,0.03)]">
        {/* Nhóm Icon trên cùng */}
        <div className="flex flex-col items-center space-y-2.5">
          {/* Logo Shop / Avatar Channel */}
          <div
            className="relative group cursor-pointer mb-1"
            title={`${activeBusiness?.business_name || 'Cửa hàng'} • Kênh: ${activeChannel?.page_name || ''}`}
          >
            {activeChannel?.avatar_url || activeBusiness?.logo_url ? (
              <img
                src={activeChannel?.avatar_url || activeBusiness?.logo_url}
                alt="Logo"
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f05a28] to-[#ff7e54] text-white font-black text-xs flex items-center justify-center shadow-sm">
                AI
              </div>
            )}
          </div>

          {/* Dấu phân cách nhỏ */}
          <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-0.5"></div>

          {/* Icon 1: Tin nhắn Messenger (Active) */}
          <button
            type="button"
            className="p-2 text-[#1877F2] bg-blue-50 dark:bg-blue-950/60 rounded-xl transition cursor-pointer shadow-xs"
            title="Hộp thư Messenger Fanpage"
          >
            <Facebook size={18} fill="#1877F2" />
          </button>

          {/* Icon 2: Khách hàng / CRM */}
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Quản lý khách hàng (CRM)"
          >
            <Users size={18} />
          </button>

          {/* Icon 3: Sản phẩm & Kho */}
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Sản phẩm & Kho hàng"
          >
            <ShoppingBag size={18} />
          </button>

          {/* Icon 4: Video / Media */}
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Quản lý Media & Video"
          >
            <Video size={18} />
          </button>

          {/* Icon 5: AI Bot Auto */}
          <button
            type="button"
            onClick={() => navigate('/bot-auto')}
            className="p-2 text-slate-400 hover:text-[#f05a28] hover:bg-orange-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Cấu hình AI Bot Trực Page"
          >
            <Bot size={18} />
          </button>

          {/* Icon 6: Đánh dấu / Ưa thích */}
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Hội thoại quan trọng"
          >
            <Star size={18} />
          </button>

          {/* Icon 7: Báo cáo / Đơn hàng */}
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Quản lý đơn hàng"
          >
            <FileText size={18} />
          </button>

          {/* Icon 8: Lịch hẹn */}
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Lịch hẹn tư vấn"
          >
            <Calendar size={18} />
          </button>

          {/* Icon 9: Chiến dịch Marketing */}
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Chiến dịch tiếp thị"
          >
            <Megaphone size={18} />
          </button>

          {/* Icon 10: Hỗ trợ kỹ thuật */}
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Trợ giúp"
          >
            <Headphones size={18} />
          </button>
        </div>

        {/* Nhóm Icon dưới cùng */}
        <div className="flex flex-col items-center space-y-2">
          {/* Nút Thêm Fanpage mới */}
          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="p-2 text-slate-400 hover:text-[#1877F2] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Kết nối thêm Fanpage mới"
          >
            <Plus size={18} />
          </button>

          {/* Nút Thu nhỏ / Cài đặt */}
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Thu gọn menu"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </aside>

      {/* =========================================================================
          CỘT 2: CONVERSATION LIST (DANH SÁCH CUỘC TRÒ CHUYỆN - ~340PX)
          ========================================================================= */}
      <section className="w-80 sm:w-[350px] bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 flex flex-col shrink-0 z-10 shadow-xs">
        {/* Top Search & Filter Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2">
          {/* Input Tìm kiếm với icon kính lúp bên phải */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
            />
            <Search
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Dropdown Nhãn */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1 cursor-pointer transition ${
                selectedTag
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 text-[#1877F2]'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="truncate max-w-[70px]">
                {selectedTag ? tagOptions.find((t) => t.value === selectedTag)?.label || 'Nhãn' : 'Nhãn'}
              </span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {/* Menu Popover Nhãn */}
            {showTagDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 py-1.5 text-xs animate-fadeIn">
                {tagOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedTag(opt.value);
                      setShowTagDropdown(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer ${
                      selectedTag === opt.value
                        ? 'font-bold text-[#1877F2] bg-blue-50/50 dark:bg-blue-950/40'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedTag === opt.value && <Check size={14} className="text-[#1877F2]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Danh sách Hội thoại (Scrollable) */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar">
          {loadingConv ? (
            <div className="p-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <RefreshCw size={18} className="animate-spin text-[#1877F2]" />
              <span>Đang tải tin nhắn Fanpage...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <MessageSquare size={22} />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300">Chưa có hội thoại nào</p>
              <p className="text-[11px] leading-relaxed max-w-[220px] mx-auto">
                Khi khách hàng nhắn tin vào Fanpage {activeChannel?.page_name}, cuộc trò chuyện sẽ tự động xuất hiện ở đây.
              </p>
            </div>
          ) : (
            conversations.map((conv, index) => {
              const isSelected = selectedConv?._id === conv._id;
              const customerName = conv.customer_id?.full_name || 'Khách hàng Facebook';
              const customerAvatar =
                conv.customer_id?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

              // Tin nhắn mẫu unread mềm mại ở dòng cuối giống hình
              const isUnread = index === conversations.length - 1 && !isSelected;

              return (
                <div
                  key={conv._id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-3.5 transition flex items-start space-x-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 border-l-4 border-[#1877F2]'
                      : isUnread
                      ? 'bg-[#ffe8e8] dark:bg-rose-950/30 hover:bg-[#fedcdc]'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Avatar Khách Hàng + Huy hiệu Facebook xanh ở góc */}
                  <div className="relative shrink-0">
                    <img
                      src={customerAvatar}
                      alt={customerName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                    {/* Facebook Icon Badge nhỏ ở góc dưới */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-xs">
                      <Facebook size={9} fill="white" />
                    </span>
                  </div>

                  {/* Nội dung hội thoại */}
                  <div className="flex-1 min-w-0">
                    {/* Dòng 1: Tên khách hàng & Thời gian */}
                    <div className="flex items-center justify-between mb-1">
                      <h4
                        className={`text-xs truncate ${
                          isUnread
                            ? 'font-black text-rose-700 dark:text-rose-400'
                            : isSelected
                            ? 'font-bold text-[#1877F2]'
                            : 'font-bold text-slate-900 dark:text-white'
                        }`}
                      >
                        {customerName}
                        {isUnread && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                            1
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-normal shrink-0 ml-1">
                        {formatMsgTime(conv.last_message_at) || '16:22'}
                      </span>
                    </div>

                    {/* Dòng 2: Tin nhắn xem trước (có biểu tượng ↩ + avatar nhỏ của shop/AI) */}
                    <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="text-slate-400 text-xs">↩</span>
                      <img
                        src={activeChannel?.avatar_url || activeBusiness?.logo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                        alt="Shop"
                        className="w-3.5 h-3.5 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <span className="truncate">
                        - {conv.last_message_text || 'Xin chào bạn! Cảm ơn bạn đã quan tâm đến sản phẩm...'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* =========================================================================
          CỘT 3: KHUNG CHÍNH (MAIN CHAT AREA / EMPTY STATE "Have a good day ☺")
          ========================================================================= */}
      <main className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-[#0b1120] relative overflow-hidden">
        {/* TRƯỜNG HỢP A: CHƯA CHỌN CUỘC HỘI THOẠI NÀO (HIỂN THỊ Y HỆT ẢNH MẪU) */}
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 select-none animate-fadeIn">
            <h2 className="text-2xl sm:text-3xl font-normal text-slate-500 dark:text-slate-400 tracking-wide font-sans">
              Have a good day ☺
            </h2>
          </div>
        ) : (
          /* TRƯỜNG HỢP B: ĐÃ CHỌN CUỘC HỘI THOẠI -> KHUNG NHẮN TIN CHI TIẾT */
          <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 animate-fadeIn">
            {/* Top Bar of Active Conversation */}
            <div className="h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs z-10">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={selectedConv.customer_id?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt="Customer"
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute bottom-0 right-0"></span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedConv.customer_id?.full_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-[#1877F2] text-[10px] font-bold flex items-center space-x-1">
                      <Facebook size={10} fill="#1877F2" />
                      <span>{activeChannel?.page_name}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    SĐT: {selectedConv.customer_id?.phone || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              {/* Bot AI Status Toggle & CRM toggle */}
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={handleToggleBot}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border cursor-pointer ${
                    selectedConv.is_bot_active
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                  title="Bật/Tắt Bot AI tự động trả lời cho hội thoại này"
                >
                  <Sparkles size={13} className={selectedConv.is_bot_active ? 'animate-pulse text-emerald-500' : ''} />
                  <span>{selectedConv.is_bot_active ? '🤖 Bot AI Đang Bật' : '👤 Nhân Viên Tiếp Quản'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomerCrm(!showCustomerCrm)}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    showCustomerCrm
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 text-[#1877F2]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700'
                  }`}
                  title="Thông tin chi tiết khách hàng"
                >
                  <User size={16} />
                </button>
              </div>
            </div>

            {/* Khung Tin Nhắn (Messages Stream) */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#f8fafc] dark:bg-[#0b1120] no-scrollbar flex flex-col">
                {loadingMessages ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium flex items-center justify-center space-x-2">
                    <RefreshCw size={16} className="animate-spin text-[#1877F2]" />
                    <span>Đang nạp tin nhắn...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs space-y-2 m-auto">
                    <Bot size={32} className="mx-auto text-slate-300" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">
                      Bắt đầu cuộc trò chuyện với {selectedConv.customer_id?.full_name}
                    </p>
                    <p className="text-[11px]">
                      Gõ tin nhắn bên dưới hoặc để AI Bot tự động tư vấn sản phẩm và chốt đơn
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.sender_type === 'STAFF';
                    const isBot = msg.sender_type === 'AI_BOT' || msg.sender_type === 'BOT';

                    return (
                      <div
                        key={msg._id}
                        className={`flex items-end space-x-2 ${
                          isStaff || isBot ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {/* Avatar khách nếu là tin nhắn khách */}
                        {!isStaff && !isBot && (
                          <img
                            src={
                              selectedConv.customer_id?.avatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'
                            }
                            alt="Customer"
                            className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                          />
                        )}

                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                            isStaff
                              ? 'bg-[#1877F2] text-white rounded-br-xs'
                              : isBot
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-700'
                          }`}
                        >
                          {/* Label người gửi nếu là Bot */}
                          {isBot && (
                            <div className="text-[10px] font-bold text-blue-200 flex items-center space-x-1 mb-1">
                              <Sparkles size={11} />
                              <span>AI Tư Vấn Tự Động</span>
                            </div>
                          )}

                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          <div
                            className={`text-[9px] mt-1 text-right ${
                              isStaff || isBot ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            {formatMsgTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* CRM Drawer (Bên phải khung chat nếu mở) */}
              {showCustomerCrm && (
                <aside className="w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 overflow-y-auto text-xs space-y-4 animate-fadeIn">
                  <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
                    <img
                      src={selectedConv.customer_id?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt="Avatar"
                      className="w-16 h-16 rounded-2xl object-cover mx-auto mb-2 border shadow-sm"
                    />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {selectedConv.customer_id?.full_name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Kênh: {activeChannel?.page_name}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Thông tin liên hệ</span>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5">
                      <p className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                        <Phone size={13} className="text-[#1877F2]" />
                        <span>{selectedConv.customer_id?.phone || 'Chưa có SĐT'}</span>
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Địa chỉ: {selectedConv.customer_id?.address || 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Thẻ khách hàng</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedConv.customer_id?.tags?.length > 0 ? (
                        selectedConv.customer_id.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-[#1877F2] rounded-md text-[10px] font-bold"
                          >
                            #{t}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa gắn thẻ</span>
                      )}
                    </div>
                  </div>
                </aside>
              )}
            </div>

            {/* Bottom Input Message Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2"
            >
              <button
                type="button"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Đính kèm hình ảnh"
              >
                <Image size={18} />
              </button>

              <button
                type="button"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Đính kèm tệp"
              >
                <Paperclip size={18} />
              </button>

              <button
                type="button"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Biểu tượng cảm xúc"
              >
                <Smile size={18} />
              </button>

              <input
                type="text"
                placeholder="Nhập tin nhắn tư vấn khách hàng..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
              />

              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="p-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl shadow-md transition disabled:opacity-40 cursor-pointer"
                title="Gửi tin nhắn"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Modal Kết nối Kênh Fanpage mới nếu cần */}
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
