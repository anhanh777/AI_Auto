import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { channelService } from '../../services/channel.service.js';
import { conversationService } from '../../services/conversation.service.js';
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
  RefreshCw
} from 'lucide-react';

const LiveChatPage = () => {
  const { user } = useAuth();
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
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
  useEffect(() => {
    const fetchChannels = async () => {
      if (!activeBusiness?._id) return;
      try {
        const res = await channelService.getChannels(activeBusiness._id);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setChannels(res.data);
          const paramChanId = searchParams.get('channel_id');
          const found = res.data.find(c => c._id === paramChanId);
          setActiveChannel(found || res.data[0]);
        }
      } catch (err) {
        console.error('Lỗi khi tải kênh:', err);
      }
    };
    fetchChannels();
  }, [activeBusiness?._id]);

  // 2. Tải danh sách Cuộc trò chuyện theo Business & Channel
  const fetchConversations = async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoadingConv(true);
      const params = {
        business_id: activeBusiness._id,
        channel_id: activeChannel?._id || undefined,
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
    fetchConversations();
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
        setMessages(prev => [...prev, res.data]);
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

  return (
    <div className="h-[calc(100vh-4rem)] -m-3 sm:-m-6 lg:-m-8 flex bg-[#f0f2f5] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 overflow-hidden select-none">
      {/* ================= 1. CỘT ICON BAR TRÁI (MINI SIDEBAR CHUẨN ẢNH) ================= */}
      <aside className="w-14 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between py-3 shrink-0 z-10 shadow-sm">
        <div className="flex flex-col items-center space-y-4">
          {/* Fanpage Avatar */}
          <div className="relative group cursor-pointer" title={activeChannel?.page_name || 'Fanpage Facebook'}>
            {activeChannel?.avatar_url ? (
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

          {/* Navigation icons */}
          <button
            type="button"
            className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold transition shadow-sm"
            title="Tin nhắn Messenger"
          >
            <MessageCircle size={18} />
          </button>

          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Trang Facebook"
          >
            <Facebook size={18} />
          </button>

          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Lịch hẹn tư vấn"
          >
            <Calendar size={18} />
          </button>

          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Khách hàng CRM"
          >
            <Users size={18} />
          </button>

          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Đánh dấu quan trọng"
          >
            <Star size={18} />
          </button>

          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Lịch sử cuộc gọi"
          >
            <Phone size={18} />
          </button>

          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Giám sát & Tracking"
          >
            <Eye size={18} />
          </button>
        </div>

        {/* Bottom Settings Icon */}
        <div className="flex flex-col items-center space-y-2">
          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Cài đặt kênh"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </aside>

      {/* ================= 2. CỘT DANH SÁCH HỘI THOẠI (CONVERSATIONS LIST) ================= */}
      <div className="w-80 sm:w-88 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        {/* Header Search & Nhãn Filter */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2">
          {/* Search box */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Nhãn filter button */}
          <div className="relative">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="">Nhãn ⌵</option>
              <option value="Sp/L'vento">Sp/L'vento</option>
              <option value="Hot MKT">Hot MKT</option>
              <option value="Khách mới">Khách mới</option>
              <option value="Hỏi giá">Hỏi giá</option>
            </select>
          </div>
        </div>

        {/* Danh sách hội thoại cuộn dọc */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar">
          {loadingConv ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
              <RefreshCw size={18} className="animate-spin mx-auto text-blue-600" />
              <p>Đang tải danh sách hội thoại...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs px-4">
              <MessageSquare size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="font-semibold">Chưa có tin nhắn nào</p>
              <p className="text-[11px] text-slate-400 mt-1">Tin nhắn mới từ Fanpage sẽ tự động xuất hiện tại đây</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = selectedConv?._id === conv._id;
              const customerName = conv.customer_id?.full_name || 'Khách hàng Facebook';
              const customerAvatar = conv.customer_id?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

              return (
                <div
                  key={conv._id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-3 cursor-pointer transition flex items-start space-x-3 group relative ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* Customer Avatar with Facebook badge */}
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src={customerAvatar}
                      alt={customerName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[9px] ring-2 ring-white dark:ring-slate-900 shadow">
                      <Facebook size={9} />
                    </span>
                  </div>

                  {/* Customer details & Last message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600">
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
                                ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200/50'
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
        {/* Trường hợp chưa chọn cuộc hội thoại nào: Hiển thị "Have a good day 😊" như ảnh mẫu */}
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
                      <span>{activeChannel?.page_name || 'Messenger'}</span>
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
                      {/* Avatar if Customer */}
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
    </div>
  );
};

export default LiveChatPage;
