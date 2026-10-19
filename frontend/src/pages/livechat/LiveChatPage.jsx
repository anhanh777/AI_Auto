import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { channelService } from '../../services/channel.service.js';
import { conversationService } from '../../services/conversation.service.js';
import { businessService } from '../../services/business.service.js';
import ConnectChannelModal from '../../components/modals/ConnectChannelModal.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import { uploadService } from '../../services/upload.service.js';
import { socket } from '../../utils/socket.js';
import { resolveMediaUrl, resolveChannelAvatar, getInitials } from '../../utils/media.js';
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
  PhoneOff,
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
  Clock,
  Mail,
  RotateCcw,
  Filter,
  AlertTriangle
} from 'lucide-react';

// Danh sách Thẻ Hệ Thống Căn Bản (Khởi tạo mặc định)
const DEFAULT_BUSINESS_TAGS = [
  { name: 'Có SĐT', icon: '📞', color: '#0D9488', bg_color: '#F0FDFA', text_color: '#0F766E', border_color: '#2DD4BF' },
  { name: 'Đã đặt hàng', icon: '🛒', color: '#16A34A', bg_color: '#F0FDF4', text_color: '#15803D', border_color: '#4ADE80' },
  { name: 'Khách mới', icon: '✨', color: '#2563EB', bg_color: '#EFF6FF', text_color: '#1D4ED8', border_color: '#93C5FD' },
  { name: 'Mua lại', icon: '🎁', color: '#7C3AED', bg_color: '#F5F3FF', text_color: '#6D28D9', border_color: '#C4B5FD' },
  { name: 'Check lại', icon: '⚠️', color: '#D97706', bg_color: '#FFFBEB', text_color: '#B45309', border_color: '#FCD34D' }
];

const TAG_COLOR_PALETTE = [
  { name: 'Đỏ Ruby', hex: '#DC2626' },
  { name: 'Hồng Fuchsia', hex: '#C026D3' },
  { name: 'Hồng Phấn', hex: '#DB2777' },
  { name: 'Cam Tươi', hex: '#EA580C' },
  { name: 'Hổ Phách', hex: '#D97706' },
  { name: 'Xanh Lá', hex: '#16A34A' },
  { name: 'Xanh Ngọc', hex: '#0D9488' },
  { name: 'Xanh Dương', hex: '#2563EB' },
  { name: 'Xanh Chàm', hex: '#4F46E5' },
  { name: 'Tím Đậm', hex: '#7C3AED' },
  { name: 'Xám Slate', hex: '#475569' }
];

const QUICK_TAG_EMOJIS = [
  '📞', '👁️', '🌡️', '🧍', '🎁', '📄', '👌', '✨', '⚡', '🔥', '⭐', '❤️', '⚠️', '🛒', '💰', '🏷️', '✅', '❌'
];

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
  const [channelAvatarFailed, setChannelAvatarFailed] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    setChannelAvatarFailed(false);
  }, [activeChannel?._id, activeChannel?.page_id]);

  const channelAvatarUrl = useMemo(() => {
    return resolveChannelAvatar(activeChannel, activeBusiness);
  }, [activeChannel, activeBusiness]);

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

  // Pancake Tags state
  const [availableTags, setAvailableTags] = useState(DEFAULT_BUSINESS_TAGS);
  const [showNewTagModal, setShowNewTagModal] = useState(false);
  const [newTagForm, setNewTagForm] = useState({ name: '', color: '#DC2626', icon: '🏷️' });
  const [submittingNewTag, setSubmittingNewTag] = useState(false);

  // Attachment & Emoji states
  const [selectedAttachment, setSelectedAttachment] = useState(null); // { file, previewUrl, type, name, size }
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('emoji'); // 'emoji' | 'sticker'
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [syncingCustomer, setSyncingCustomer] = useState(false);

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Danh sách emoji thông dụng
  const COMMON_EMOJIS = [
    '😊', '😂', '🥰', '😍', '👍', '🔥', '❤️', '👋',
    '🙏', '✨', '🛍️', '📦', '💯', '📞', '📍', '🎉',
    '💐', '💬', '🤩', '👏', '⚡', '⭐', '🤝', '😉',
    '🆗', '🛒', '💰', '🏷️', '🚚', '✅', '❌', '👀'
  ];

  // Danh sách nhãn dán Facebook phổ biến (Stickers)
  const STICKERS_LIST = [
    { id: 'like', name: 'Thích', url: '/stickers/like.png' },
    { id: 'heart', name: 'Thả tim', url: '/stickers/heart.png' },
    { id: 'hello', name: 'Xin chào', url: '/stickers/hello.png' },
    { id: 'thank_you', name: 'Cảm ơn', url: '/stickers/thank_you.png' },
    { id: 'order_ok', name: 'Chốt đơn', url: '/stickers/order_ok.png' },
    { id: 'cute_cat', name: 'Mèo cưng', url: '/stickers/cute_cat.png' },
    { id: 'happy', name: 'Vui vẻ', url: '/stickers/happy.png' },
    { id: 'wow', name: 'Ngạc nhiên', url: '/stickers/wow.png' }
  ];

  const handleSendSticker = async (sticker) => {
    if (!selectedConv?._id || sending) return;
    setShowEmojiPicker(false);
    setSending(true);

    try {
      const res = await conversationService.sendMessage(selectedConv._id, {
        content: '[Nhãn dán]',
        attachments: [
          {
            type: 'sticker',
            url: sticker.url,
            name: sticker.name
          }
        ],
        sender_type: 'STAFF'
      });
      if (res.success && res.data) {
        setMessages((prev) => {
          const newMsgId = (res.data._id || res.data.id)?.toString();
          if (newMsgId && prev.some((m) => (m._id || m.id)?.toString() === newMsgId)) {
            return prev;
          }
          return [...prev, res.data];
        });
        fetchConversations();
      }
    } catch (err) {
      showToast('error', 'Lỗi khi gửi nhãn dán');
    } finally {
      setSending(false);
    }
  };

  // Đóng emoji picker khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Kích thước ảnh không được vượt quá 10MB');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setSelectedAttachment({
      file,
      previewUrl,
      type: 'image',
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB'
    });
    e.target.value = '';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Kích thước tệp không được vượt quá 10MB');
      return;
    }
    setSelectedAttachment({
      file,
      type: 'file',
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB'
    });
    e.target.value = '';
  };

  const handleRemoveAttachment = () => {
    if (selectedAttachment?.previewUrl) {
      URL.revokeObjectURL(selectedAttachment.previewUrl);
    }
    setSelectedAttachment(null);
  };

  const handleSelectEmoji = (emoji) => {
    setInputMessage((prev) => prev + emoji);
  };

  // 9 TIỆN ÍCH LỌC HỘI THOẠI TRÊN THANH CÔNG CỤ BÊN TRÁI
  const [filterInbox, setFilterInbox] = useState(false); // 1. Lọc theo inbox
  const [filterComment, setFilterComment] = useState(false); // 2. Lọc theo comment
  const [sortUnreadFirst, setSortUnreadFirst] = useState(false); // 3. Chưa đọc lên trên
  const [sortTimeDesc, setSortTimeDesc] = useState(true); // 4. Lọc theo thời gian (mới nhất/cũ nhất)
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false); // 5. Lọc hội thoại chưa đọc
  const [filterUnansweredOnly, setFilterUnansweredOnly] = useState(false); // 6. Lọc hội thoại chưa trả lời
  const [filterHasPhone, setFilterHasPhone] = useState(false); // 7. Lọc hội thoại có số điện thoại
  const [filterNoPhone, setFilterNoPhone] = useState(false); // 8. Lọc hội thoại không có số điện thoại
  const [filterCustomerSeen, setFilterCustomerSeen] = useState(false); // 9. Lọc hội thoại khách đã xem tin nhắn

  const handleResetFilters = () => {
    setFilterInbox(false);
    setFilterComment(false);
    setSortUnreadFirst(false);
    setSortTimeDesc(true);
    setFilterUnreadOnly(false);
    setFilterUnansweredOnly(false);
    setFilterHasPhone(false);
    setFilterNoPhone(false);
    setFilterCustomerSeen(false);
  };

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

  // 1.1 Tải danh sách Thẻ nhãn Pancake của Doanh nghiệp
  const fetchBusinessTags = async () => {
    if (!activeBusiness?._id) return;
    try {
      const res = await businessService.getTags(activeBusiness._id);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAvailableTags(res.data);
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách thẻ nhãn:', err);
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchBusinessTags();
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
    setConversations([]);
    setMessages([]);
    setSearchParams({ channel_id: channel._id });
  };

  // Quay lại danh sách kênh (Giao diện khi chưa chọn kênh)
  const handleBackToChannelList = () => {
    setActiveChannel(null);
    setSelectedConv(null);
    setConversations([]);
    setMessages([]);
    setSearchParams({});
  };

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

  // Xóa kênh Fanpage
  const handleDeleteChannel = (channelId, channelName) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa kết nối Fanpage',
      message: `Bạn có chắc chắn muốn ngắt kết nối và xóa Fanpage "${channelName}" khỏi hệ thống?`,
      confirmText: 'Xóa Fanpage',
      cancelText: 'Hủy bỏ',
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
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
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
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

        // Tự động chọn cuộc hội thoại nếu có tham số từ trang Khách hàng
        const targetConvId = searchParams.get('conversation_id');
        const targetCustId = searchParams.get('customer_id');
        if (targetConvId) {
          const found = res.data.find((c) => c._id === targetConvId);
          if (found) setSelectedConv(found);
        } else if (targetCustId) {
          const found = res.data.find((c) => {
            const cId = c.customer_id?._id ? c.customer_id._id.toString() : (c.customer_id ? c.customer_id.toString() : '');
            return cId === targetCustId;
          });
          if (found) setSelectedConv(found);
        }
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
          // Đánh dấu hội thoại đã đọc trên danh sách bên trái
          setConversations((prev) =>
            prev.map((c) =>
              c._id === selectedConv._id ? { ...c, unread_count: 0 } : c
            )
          );
        }
      } catch (err) {
        console.error('Lỗi khi tải tin nhắn:', err);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [selectedConv?._id]);

  // Đồng bộ lại tên thật & avatar của khách hàng từ Meta Graph API
  const handleSyncCustomerProfile = async () => {
    if (!activeChannel?._id) return;
    try {
      setSyncingCustomer(true);
      const res = await channelService.syncCustomers(activeChannel._id);
      if (res.data?.success || res.success) {
        showToast('success', res.data?.message || res.message || 'Đã đồng bộ thông tin khách hàng thành công!');
        fetchConversations();
        // Cập nhật selectedConv
        if (selectedConv?._id) {
          const convRes = await conversationService.getConversations({
            business_id: activeBusiness._id,
            channel_id: activeChannel._id
          });
          if (convRes.success && Array.isArray(convRes.data)) {
            const found = convRes.data.find((c) => c._id === selectedConv._id);
            if (found) setSelectedConv(found);
          }
        }
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Lỗi khi đồng bộ khách hàng');
    } finally {
      setSyncingCustomer(false);
    }
  };

  // Cuộn xuống tin nhắn cuối cùng
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Lắng nghe sự kiện Socket.IO thời gian thực khi có tin nhắn mới hoặc cập nhật hội thoại
  useEffect(() => {
    if (!socket) return;

    // Tham gia phòng của cuộc hội thoại, phòng business và phòng channel
    if (selectedConv?._id) {
      socket.emit('join_conversation', selectedConv._id);
    }
    if (activeBusiness?._id) {
      socket.emit('join_business', activeBusiness._id);
    }
    if (activeChannel?._id) {
      socket.emit('join_channel', activeChannel._id);
    }

    const handleNewMessage = (msg) => {
      if (!msg) return;
      const msgConvId = (msg.conversation_id?._id || msg.conversation_id)?.toString();
      const currentConvId = (selectedConv?._id || selectedConv?.id)?.toString();

      if (msgConvId && currentConvId && msgConvId === currentConvId) {
        setMessages((prev) => {
          const msgId = (msg._id || msg.id)?.toString();
          if (msgId && prev.some((m) => (m._id || m.id)?.toString() === msgId)) {
            return prev;
          }
          return [...prev, msg];
        });
      }
    };

    const handleConversationUpdated = (updatedConv) => {
      if (!updatedConv?._id) return;

      // Chỉ cập nhật nếu hội thoại thuộc đúng kênh Fanpage đang mở
      const convChanId = (updatedConv.channel_id?._id || updatedConv.channel_id)?.toString();
      const curChanId = (activeChannel?._id || activeChannel?.id)?.toString();
      if (curChanId && convChanId && convChanId !== curChanId) {
        return;
      }

      setConversations((prev) => {
        const targetId = (updatedConv._id || updatedConv.id)?.toString();
        const index = prev.findIndex((c) => (c._id || c.id)?.toString() === targetId);
        if (index > -1) {
          const newList = [...prev];
          newList[index] = { ...newList[index], ...updatedConv };
          const [moved] = newList.splice(index, 1);
          return [moved, ...newList];
        }
        return [updatedConv, ...prev];
      });

      setSelectedConv((prev) => {
        const targetId = (updatedConv._id || updatedConv.id)?.toString();
        if ((prev?._id || prev?.id)?.toString() === targetId) {
          return { ...prev, ...updatedConv };
        }
        return prev;
      });
    };

    const handleConversationTagsUpdated = (data) => {
      if (!data?.conversation_id) return;
      const targetId = data.conversation_id.toString();
      const updatedTags = data.tags || [];

      setConversations((prev) =>
        prev.map((c) => {
          if ((c._id || c.id)?.toString() === targetId) {
            return { ...c, tags: updatedTags };
          }
          return c;
        })
      );

      setSelectedConv((prev) => {
        if ((prev?._id || prev?.id)?.toString() === targetId) {
          return { ...prev, tags: updatedTags };
        }
        return prev;
      });
    };

    const handleBusinessTagsUpdated = (data) => {
      if (!data) return;
      const tagObj = data.tag || data;
      if (tagObj?.name) {
        setAvailableTags((prev) => {
          if (prev.some((t) => t.name.toLowerCase() === tagObj.name.toLowerCase())) {
            return prev;
          }
          return [...prev, tagObj];
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('new_incoming_message', ({ conversation }) => {
      if (conversation) handleConversationUpdated(conversation);
    });
    socket.on('conversation_tags_updated', handleConversationTagsUpdated);
    socket.on('business_tags_updated', handleBusinessTagsUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('new_incoming_message');
      socket.off('conversation_tags_updated', handleConversationTagsUpdated);
      socket.off('business_tags_updated', handleBusinessTagsUpdated);
    };
  }, [selectedConv?._id, activeChannel?._id, activeBusiness?._id]);

  // 4. Gửi tin nhắn (hỗ trợ văn bản, hình ảnh, tài liệu đính kèm và deduplicate message)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !selectedAttachment) || !selectedConv?._id || sending) return;

    let textToSend = inputMessage.trim();
    const currentAttachment = selectedAttachment;
    setInputMessage('');
    setSelectedAttachment(null);
    setShowEmojiPicker(false);
    setSending(true);

    try {
      let attachmentsPayload = [];

      // Xử lý upload tệp đính kèm (ảnh hoặc tài liệu) nếu có
      if (currentAttachment?.file) {
        setUploadingAttachment(true);
        const folder = currentAttachment.type === 'image' ? 'chat-images' : 'chat-files';
        try {
          const uploadRes = await uploadService.uploadSingle(currentAttachment.file, folder);
          if (uploadRes.success && (uploadRes.data?.url || uploadRes.data?.path)) {
            attachmentsPayload.push({
              type: currentAttachment.type,
              url: uploadRes.data.url || uploadRes.data.path,
              name: currentAttachment.name
            });
            if (!textToSend) {
              textToSend = currentAttachment.type === 'image'
                ? '[Hình ảnh]'
                : `[Tệp: ${currentAttachment.name}]`;
            }
          }
        } catch (uploadErr) {
          console.error('Lỗi khi tải tệp đính kèm:', uploadErr);
          showToast('error', 'Không thể tải lên tệp đính kèm: ' + (uploadErr.message || 'Lỗi mạng'));
          setSending(false);
          setUploadingAttachment(false);
          return;
        }
      }

      const res = await conversationService.sendMessage(selectedConv._id, {
        content: textToSend,
        attachments: attachmentsPayload,
        sender_type: 'STAFF'
      });
      if (res.success && res.data) {
        setMessages((prev) => {
          const newMsgId = (res.data._id || res.data.id)?.toString();
          if (newMsgId && prev.some((m) => (m._id || m.id)?.toString() === newMsgId)) {
            return prev;
          }
          return [...prev, res.data];
        });
        fetchConversations();
      }
    } catch (err) {
      showToast('error', 'Lỗi khi gửi tin nhắn');
    } finally {
      setSending(false);
      setUploadingAttachment(false);
    }
  };

  // 5. Bật/Tắt Bot AI cho hội thoại này
  const handleToggleBot = async () => {
    if (!selectedConv?._id) return;
    try {
      const res = await conversationService.toggleBot(selectedConv._id);
      if (res.success && res.data) {
        setSelectedConv(res.data);
        setConversations((prev) =>
          prev.map((c) =>
            (c._id || c.id) === (res.data._id || res.data.id)
              ? { ...c, is_bot_active: res.data.is_bot_active }
              : c
          )
        );
        showToast('info', `Đã ${res.data.is_bot_active ? 'bật' : 'tạm dừng'} AI Bot cho khách hàng này`);
      }
    } catch (err) {
      showToast('error', 'Lỗi khi chuyển đổi trạng thái AI');
    }
  };

  // 6. Bật / Tắt thẻ nhãn cho cuộc hội thoại đang chọn (Pancake style)
  const handleToggleTag = async (tagName) => {
    if (!selectedConv?._id) return;
    const currentTags = Array.isArray(selectedConv.tags) ? [...selectedConv.tags] : [];
    const exists = currentTags.includes(tagName);
    const nextTags = exists
      ? currentTags.filter((t) => t !== tagName)
      : [...currentTags, tagName];

    // Optimistic UI update
    setSelectedConv((prev) => (prev ? { ...prev, tags: nextTags } : prev));
    setConversations((prev) =>
      prev.map((c) => ((c._id || c.id) === (selectedConv._id || selectedConv.id) ? { ...c, tags: nextTags } : c))
    );

    try {
      const res = await conversationService.updateTags(selectedConv._id, {
        action: 'TOGGLE',
        tag: tagName
      });
      if (res.success && res.data) {
        setSelectedConv((prev) => (prev ? { ...prev, tags: res.data.tags } : prev));
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật nhãn:', err);
      showToast('error', 'Không thể cập nhật thẻ nhãn');
      // Revert on error
      setSelectedConv((prev) => (prev ? { ...prev, tags: currentTags } : prev));
      setConversations((prev) =>
        prev.map((c) => ((c._id || c.id) === (selectedConv._id || selectedConv.id) ? { ...c, tags: currentTags } : c))
      );
    }
  };

  // 7. Tạo Thẻ Nhãn Mới cho Cửa Hàng
  const handleCreateNewTag = async (e) => {
    e?.preventDefault();
    if (!newTagForm.name.trim()) {
      showToast('error', 'Vui lòng nhập tên thẻ nhãn');
      return;
    }
    if (!activeBusiness?._id) return;

    try {
      setSubmittingNewTag(true);
      const res = await businessService.createTag(activeBusiness._id, {
        name: newTagForm.name.trim(),
        icon: newTagForm.icon,
        color: newTagForm.color
      });
      if (res.success && res.data) {
        showToast('success', `Đã tạo thẻ "${res.data.name}" thành công!`);
        setAvailableTags((prev) => {
          if (prev.some((t) => t.name.toLowerCase() === res.data.name.toLowerCase())) {
            return prev;
          }
          return [...prev, res.data];
        });
        if (selectedConv?._id) {
          handleToggleTag(res.data.name);
        }
        setShowNewTagModal(false);
        setNewTagForm({ name: '', color: '#DC2626', icon: '🏷️' });
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Lỗi khi tạo thẻ mới');
    } finally {
      setSubmittingNewTag(false);
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

  // Format văn bản tin nhắn (hỗ trợ in đậm **bold** hoặc *bold* tương tự Messenger)
  const renderFormattedMessageText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|\*[^*\n]+?\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={idx} className="font-semibold text-inherit">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <strong key={idx} className="font-semibold text-inherit">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  // Danh sách cuộc trò chuyện đã áp dụng 9 bộ lọc
  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    // 1. Tìm kiếm (searchQuery)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) =>
        c.customer_id?.full_name?.toLowerCase().includes(q) ||
        c.last_message_text?.toLowerCase().includes(q) ||
        c.last_message_content?.toLowerCase().includes(q) ||
        c.customer_id?.phone?.includes(q)
      );
    }

    // 2. Lọc theo Nhãn (selectedTag)
    if (selectedTag) {
      result = result.filter((c) =>
        c.tags?.includes(selectedTag) ||
        c.customer_id?.tags?.includes(selectedTag)
      );
    }

    // 3. Lọc theo Inbox
    if (filterInbox) {
      result = result.filter((c) =>
        !c.channel_type || c.channel_type === 'INBOX' || c.channel === 'facebook_messenger' || !c.channel?.includes('comment')
      );
    }

    // 4. Lọc theo Comment
    if (filterComment) {
      result = result.filter((c) =>
        c.channel_type === 'COMMENT' || c.channel?.includes('comment') || c.source_type === 'comment'
      );
    }

    // 5. Lọc hội thoại chưa đọc (Chỉ hiện chưa đọc)
    if (filterUnreadOnly) {
      result = result.filter((c) => (c.unread_count || 0) > 0);
    }

    // 6. Lọc hội thoại chưa trả lời (tin nhắn cuối cùng là từ khách)
    if (filterUnansweredOnly) {
      result = result.filter((c) => {
        const isStaffLast = c.last_message_sender === 'STAFF' || c.last_message_sender === 'AI_BOT' || c.is_replied === true;
        return !isStaffLast;
      });
    }

    // 7. Lọc hội thoại có số điện thoại
    if (filterHasPhone) {
      result = result.filter((c) => {
        const phone = c.customer_id?.phone || c.customer_id?.phone_number;
        return !!phone && phone.trim().length >= 8;
      });
    }

    // 8. Lọc hội thoại không có số điện thoại
    if (filterNoPhone) {
      result = result.filter((c) => {
        const phone = c.customer_id?.phone || c.customer_id?.phone_number;
        return !phone || phone.trim().length < 8;
      });
    }

    // 9. Lọc hội thoại khách đã xem tin nhắn
    if (filterCustomerSeen) {
      result = result.filter((c) => c.is_seen_by_customer || c.seen_at || (c.unread_count === 0 && c.last_message_text));
    }

    // 10. Sắp xếp theo thời gian (Mới nhất trước / Cũ nhất trước)
    result.sort((a, b) => {
      const timeA = new Date(a.last_message_at || a.updated_at || 0).getTime();
      const timeB = new Date(b.last_message_at || b.updated_at || 0).getTime();
      return sortTimeDesc ? (timeB - timeA) : (timeA - timeB);
    });

    // 11. Chưa đọc lên trên (Đưa hội thoại có unread_count > 0 lên đầu tiên)
    if (sortUnreadFirst) {
      result.sort((a, b) => {
        const unreadA = (a.unread_count || 0) > 0 ? 1 : 0;
        const unreadB = (b.unread_count || 0) > 0 ? 1 : 0;
        return unreadB - unreadA;
      });
    }

    return result;
  }, [
    conversations,
    searchQuery,
    selectedTag,
    filterInbox,
    filterComment,
    filterUnreadOnly,
    filterUnansweredOnly,
    filterHasPhone,
    filterNoPhone,
    filterCustomerSeen,
    sortTimeDesc,
    sortUnreadFirst
  ]);

  // Danh sách thẻ phân loại động theo Pancake / Business Tags
  const tagOptions = useMemo(() => {
    const list = [{ label: 'Tất cả nhãn', value: '' }];
    availableTags.forEach((t) => {
      list.push({
        label: `${t.icon ? t.icon + ' ' : ''}${t.name}`,
        value: t.name
      });
    });
    return list;
  }, [availableTags]);

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

  // =========================================================================
  // TRƯỜNG HỢP 1: CHƯA CHỌN KÊNH -> GIAO DIỆN QUẢN LÝ & CHỌN KÊNH FANPAGE
  // =========================================================================
  if (!activeChannel) {
    return (
      <div className="space-y-6 animate-fadeIn pb-16">
        {/* 1. BUSINESS HERO BANNER */}
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
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Quản lý các kênh tương tác khách hàng thời gian thực, tự động hóa phản hồi tư vấn và chốt đơn bán hàng bằng Trí tuệ Nhân tạo.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 self-end lg:self-center shrink-0">
              <button
                type="button"
                onClick={() => fetchChannels()}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition flex items-center space-x-1.5 border border-white/10"
                title="Làm mới danh sách kênh"
              >
                <RefreshCw size={15} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center space-x-2 cursor-pointer"
              >
                <Plus size={16} />
                <span>Kết nối Fanpage mới</span>
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
                  <Facebook className="text-[#1877F2]" size={22} />
                  <span>Kênh Fanpage Facebook của Cửa Hàng</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#1877F2] dark:text-blue-300 text-xs font-extrabold">
                  {channels.length} Fanpage
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chọn một kênh Fanpage dưới đây để vào phòng chat trực tiếp, tiếp nhận tin nhắn Messenger và quản lý khách hàng
              </p>
            </div>
          </div>

          {/* Danh sách Facebook Channels Grid hoặc Trạng thái trống */}
          {loadingChannels ? (
            <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center space-x-2">
              <RefreshCw size={16} className="animate-spin text-blue-600" />
              <span>Đang tải các Fanpage kết nối...</span>
            </div>
          ) : channels.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-[#1877F2] flex items-center justify-center mx-auto shadow-sm">
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
                className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-bold shadow transition cursor-pointer inline-flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Kết nối Fanpage Facebook ngay</span>
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
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-[#1877F2] flex items-center justify-center shrink-0 shadow-sm border border-blue-200 dark:border-blue-800">
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
                      {ch.token_valid === false ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-[10px] flex items-center space-x-1" title={ch.token_error || 'Token Fanpage hết hạn'}>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>Token hết hạn</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Sẵn sàng tiếp nhận tin nhắn</span>
                        </span>
                      )}
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
                      className="flex-1 py-2.5 bg-blue-50 dark:bg-blue-950/60 group-hover:bg-[#1877F2] text-[#1877F2] group-hover:text-white dark:text-blue-300 dark:group-hover:text-white border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                    >
                      <MessageSquare size={14} />
                      <span>Xem Tin Nhắn Fanpage</span>
                    </button>
                    {ch.token_valid === false && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowConnectModal(true);
                        }}
                        className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer shadow-sm shrink-0"
                        title="Kết nối lại Fanpage để gia hạn Token"
                      >
                        <RefreshCw size={13} />
                        <span>Kết nối lại</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Kết nối Fanpage Facebook Mới */}
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
  // TRƯỜNG HỢP 2: ĐÃ CHỌN KÊNH -> GIAO DIỆN NHẮN TIN TRỰC TIẾP (LIVECHAT)
  // =========================================================================
  return (
    <div className="h-[calc(100vh-3.5rem)] -m-3 sm:-m-6 lg:-m-8 flex bg-[#f0f2f5] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 overflow-hidden select-none animate-fadeIn font-sans">
      {/* =========================================================================
          CỘT 1: NARROW ICON NAVIGATION BAR (BÊN TRÁI CÙNG - 56PX)
          ========================================================================= */}
      <aside className="w-14 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 flex flex-col items-center justify-between py-3 shrink-0 z-20 shadow-[1px_0_3px_rgba(0,0,0,0.03)]">
        {/* Nhóm Icon trên cùng: Avatar Kênh + 9 Bộ lọc tiện ích */}
        <div className="flex flex-col items-center space-y-1.5 w-full px-1">
          {/* Logo Shop / Avatar Channel (Bấm vào để đổi kênh Fanpage) */}
          <div
            onClick={handleBackToChannelList}
            className="relative group cursor-pointer mb-1"
            title={`${activeBusiness?.business_name || 'Cửa hàng'} • Kênh: ${activeChannel?.page_name || ''} (Bấm để đổi kênh)`}
          >
            {channelAvatarUrl && !channelAvatarFailed ? (
              <img
                src={channelAvatarUrl}
                alt={activeChannel?.page_name || activeBusiness?.business_name || 'Logo'}
                onError={() => setChannelAvatarFailed(true)}
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-[#1877F2] shadow-sm transition-all"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1877F2] to-[#00C6FF] text-white font-black text-xs flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform uppercase tracking-wider">
                {getInitials(activeChannel?.page_name || activeBusiness?.business_name || 'AI')}
              </div>
            )}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                activeChannel?.token_valid === false || activeChannel?.is_connected === false
                  ? 'bg-rose-500 animate-pulse'
                  : 'bg-emerald-500'
              }`}
              title={
                activeChannel?.token_valid === false || activeChannel?.is_connected === false
                  ? 'Token Fanpage đã hết hạn! Bấm vào để kết nối lại'
                  : 'Đang kết nối Facebook bình thường'
              }
            ></span>
          </div>

          {/* Dấu phân cách nhỏ */}
          <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-0.5"></div>

          {/* 1. Tiện ích: Lọc theo Inbox */}
          <button
            type="button"
            onClick={() => setFilterInbox((prev) => !prev)}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              filterInbox
                ? 'bg-[#1877F2] text-white shadow-sm ring-2 ring-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Lọc theo Inbox (Tin nhắn Messenger)"
          >
            <MessageSquare size={17} />
            {filterInbox && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>

          {/* 2. Tiện ích: Lọc theo Comment */}
          <button
            type="button"
            onClick={() => setFilterComment((prev) => !prev)}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              filterComment
                ? 'bg-[#1877F2] text-white shadow-sm ring-2 ring-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Lọc theo Comment (Bình luận bài viết)"
          >
            <Facebook size={17} />
            {filterComment && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>

          {/* 3. Tiện ích: Chưa đọc lên trên */}
          <button
            type="button"
            onClick={() => setSortUnreadFirst((prev) => !prev)}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              sortUnreadFirst
                ? 'bg-[#1877F2] text-white shadow-sm ring-2 ring-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Ưu tiên tin chưa đọc lên trên cùng"
          >
            <ArrowUpDown size={17} />
            {sortUnreadFirst && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>

          {/* 4. Tiện ích: Lọc theo thời gian */}
          <button
            type="button"
            onClick={() => setSortTimeDesc((prev) => !prev)}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              !sortTimeDesc
                ? 'bg-[#1877F2] text-white shadow-sm ring-2 ring-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={sortTimeDesc ? "Thời gian: Mới nhất trước (Bấm để xem cũ nhất)" : "Thời gian: Cũ nhất trước (Bấm để xem mới nhất)"}
          >
            <Clock size={17} />
            {!sortTimeDesc && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>

          {/* 5. Tiện ích: Lọc hội thoại chưa đọc */}
          <button
            type="button"
            onClick={() => setFilterUnreadOnly((prev) => !prev)}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              filterUnreadOnly
                ? 'bg-[#1877F2] text-white shadow-sm ring-2 ring-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Lọc hội thoại chưa đọc"
          >
            <Mail size={17} />
            {filterUnreadOnly && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>

          {/* 6. Tiện ích: Lọc hội thoại chưa trả lời */}
          <button
            type="button"
            onClick={() => setFilterUnansweredOnly((prev) => !prev)}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              filterUnansweredOnly
                ? 'bg-[#1877F2] text-white shadow-sm ring-2 ring-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Lọc hội thoại chưa trả lời"
          >
            <CornerDownLeft size={17} />
            {filterUnansweredOnly && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>

          {/* 7. Tiện ích: Lọc hội thoại có số điện thoại */}
          <button
            type="button"
            onClick={() => {
              setFilterHasPhone((prev) => !prev);
              if (!filterHasPhone) setFilterNoPhone(false);
            }}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              filterHasPhone
                ? 'bg-[#1877F2] text-white shadow-sm ring-2 ring-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Lọc hội thoại có số điện thoại"
          >
            <Phone size={17} />
            {filterHasPhone && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>

          {/* 8. Tiện ích: Lọc hội thoại không có số điện thoại */}
          <button
            type="button"
            onClick={() => {
              setFilterNoPhone((prev) => !prev);
              if (!filterNoPhone) setFilterHasPhone(false);
            }}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              filterNoPhone
                ? 'bg-[#1877F2] text-white shadow-sm ring-2 ring-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Lọc hội thoại không có số điện thoại"
          >
            <PhoneOff size={17} />
            {filterNoPhone && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>

          {/* 9. Tiện ích: Lọc hội thoại khách đã xem tin nhắn */}
          <button
            type="button"
            onClick={() => setFilterCustomerSeen((prev) => !prev)}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              filterCustomerSeen
                ? 'bg-[#1877F2] text-white shadow-sm ring-2 ring-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Lọc hội thoại khách đã xem tin nhắn"
          >
            <Eye size={17} />
            {filterCustomerSeen && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>
        </div>

        {/* Nhóm Icon dưới cùng */}
        <div className="flex flex-col items-center space-y-2 w-full px-1">
          {/* Nút Đặt lại toàn bộ bộ lọc nếu có lọc active */}
          {(filterInbox || filterComment || sortUnreadFirst || !sortTimeDesc || filterUnreadOnly || filterUnansweredOnly || filterHasPhone || filterNoPhone || filterCustomerSeen) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer animate-pulse"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw size={16} />
            </button>
          )}

          {/* Nút Đổi kênh Fanpage */}
          <button
            type="button"
            onClick={handleBackToChannelList}
            className="p-2 text-slate-400 hover:text-[#1877F2] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="← Đổi sang Fanpage khác"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Nút Kết nối Fanpage mới */}
          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="p-2 text-slate-400 hover:text-[#1877F2] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Kết nối thêm Fanpage mới"
          >
            <Plus size={18} />
          </button>
        </div>
      </aside>

      {/* =========================================================================
          CỘT 2: CONVERSATION LIST (DANH SÁCH CUỘC TRÒ CHUYỆN - ~340PX)
          ========================================================================= */}
      <section className="w-80 sm:w-[350px] bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 flex flex-col shrink-0 z-10 shadow-xs">
        {/* Top Search & Filter Bar (Nằm ngay trên cùng giống mockup) */}
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
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Filter size={18} />
              </div>
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300">Không có hội thoại phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Không tìm thấy cuộc trò chuyện nào khớp với các bộ lọc đang chọn.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-[#1877F2] rounded-xl text-xs font-semibold transition"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConv?._id === conv._id;
              const customerName = conv.customer_id?.full_name || 'Khách hàng Facebook';
              const customerAvatar =
                conv.customer_id?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

              const unreadCount = Number(conv.unread_count || 0);
              const isUnread = unreadCount > 0 && !isSelected;

              return (
                <div
                  key={conv._id}
                  onClick={() => {
                    setSelectedConv(conv);
                    setConversations((prev) =>
                      prev.map((c) => (c._id === conv._id ? { ...c, unread_count: 0 } : c))
                    );
                  }}
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
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                      }}
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
                            {unreadCount}
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-normal shrink-0 ml-1">
                        {formatMsgTime(conv.last_message_at) || 'Vừa xong'}
                      </span>
                    </div>

                    {/* Dòng 2: Tin nhắn xem trước (có biểu tượng ↩ + avatar nhỏ của shop/AI) */}
                    <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="text-slate-400 text-xs">↩</span>
                      <img
                        src={channelAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                        alt="Shop"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50';
                        }}
                        className="w-3.5 h-3.5 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <span className="truncate">
                        - {conv.last_message_text || 'Chưa có nội dung tin nhắn'}
                      </span>
                    </div>

                    {/* Dòng 3: Thẻ nhãn Pancake Style (Hiển thị ngay dưới tin nhắn như mẫu media_1791974689974_a7231e43.png) */}
                    {Array.isArray(conv.tags) && conv.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                        {conv.tags.map((tagName) => {
                          const tagMeta = availableTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
                          const bg = tagMeta?.bg_color || '#F1F5F9';
                          const textColor = tagMeta?.text_color || '#334155';
                          const borderColor = tagMeta?.border_color || '#CBD5E1';
                          const icon = tagMeta?.icon || '';
                          return (
                            <span
                              key={tagName}
                              style={{
                                backgroundColor: bg,
                                color: textColor,
                                borderColor: borderColor
                              }}
                              className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border leading-tight shrink-0 shadow-2xs"
                              title={tagName}
                            >
                              {icon && <span className="mr-0.5">{icon}</span>}
                              <span className="truncate max-w-[110px]">{tagName}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
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
          <div className="flex-1 flex h-full overflow-hidden animate-fadeIn">
            {/* CỘT CHAT CHÍNH (Bao gồm Header, Tin nhắn và Thanh nhập liệu - Tự co giãn linh động khi mở CRM) */}
            <div className="flex-1 flex flex-col h-full min-w-0 bg-[#f8fafc] dark:bg-[#0b1120]">
              {/* Top Bar of Active Conversation */}
              <div className="h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs z-10">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={selectedConv.customer_id?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt="Customer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                      }}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute bottom-0 right-0"></span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {selectedConv.customer_id?.full_name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-[#1877F2] text-[10px] font-bold flex items-center space-x-1 shrink-0">
                        <Facebook size={10} fill="#1877F2" />
                        <span>{activeChannel?.page_name}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      SĐT: {selectedConv.customer_id?.phone || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>

                {/* Bot AI Status Toggle & CRM toggle */}
                <div className="flex items-center space-x-2.5 shrink-0">
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

              {/* Cảnh báo Token Fanpage hết hạn */}
              {(activeChannel?.token_valid === false || activeChannel?.is_connected === false) && (
                <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 px-4 py-2.5 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 shrink-0 z-10 animate-fadeIn">
                  <div className="flex items-center space-x-2 min-w-0">
                    <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                    <span className="truncate">
                      <strong>Token Fanpage "{activeChannel?.page_name}" đã hết hạn:</strong> Tin nhắn trả lời sẽ không tới được Messenger của khách. Vui lòng kết nối lại để tiếp tục.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(true)}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow transition cursor-pointer shrink-0 ml-3 flex items-center space-x-1"
                  >
                    <RefreshCw size={12} />
                    <span>Kết nối lại Fanpage</span>
                  </button>
                </div>
              )}

              {/* Khung Tin Nhắn (Messages Stream) */}
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
                  messages.map((msg, idx) => {
                    const isStaff = msg.sender_type === 'STAFF';
                    const isBot = msg.sender_type === 'AI_BOT' || msg.sender_type === 'BOT';
                    const msgKey = (msg._id || msg.id)?.toString() || `msg-${idx}`;

                    return (
                      <div
                        key={msgKey}
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
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50';
                            }}
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

                          {/* 1. Hiển thị nội dung văn bản TRƯỚC (khớp thứ tự đọc và tin nhắn Messenger) */}
                          {msg.content &&
                            msg.content !== '[Hình ảnh]' &&
                            msg.content !== '[Hình ảnh sản phẩm]' &&
                            msg.content !== '[Nhãn dán]' &&
                            !msg.content.startsWith('[Tệp:') && (
                              <div className="whitespace-pre-wrap leading-relaxed select-text font-normal text-[12px]">
                                {renderFormattedMessageText(msg.content)}
                              </div>
                            )}

                          {/* 2. Hiển thị tệp đính kèm (ảnh / file / nhãn dán) BÊN DƯỚI văn bản */}
                          {msg.attachments && msg.attachments.length > 0 && (() => {
                            const images = msg.attachments.filter(
                              (att) => att.type === 'image' || att.url?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)
                            );
                            const stickers = msg.attachments.filter((att) => att.type === 'sticker');
                            const files = msg.attachments.filter(
                              (att) =>
                                att.type !== 'image' &&
                                att.type !== 'sticker' &&
                                !att.url?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)
                            );

                            return (
                              <div className="mt-2 space-y-2">
                                {/* Lưới hiển thị ảnh thông minh (Photo Grid) */}
                                {images.length > 0 && (
                                  <div
                                    className={
                                      images.length === 1
                                        ? 'max-w-[280px]'
                                        : images.length === 2
                                        ? 'grid grid-cols-2 gap-1.5 max-w-[340px]'
                                        : images.length === 3
                                        ? 'grid grid-cols-3 gap-1.5 max-w-[380px]'
                                        : 'grid grid-cols-2 gap-1.5 max-w-[340px]'
                                    }
                                  >
                                    {images.map((att, attIdx) => {
                                      const mediaUrl = resolveMediaUrl(att.url);
                                      const heightClass =
                                        images.length === 1
                                          ? 'max-h-[240px] w-auto'
                                          : images.length === 2
                                          ? 'h-32 w-full'
                                          : images.length === 3
                                          ? 'h-24 sm:h-28 w-full'
                                          : 'h-28 w-full';

                                      return (
                                        <div
                                          key={attIdx}
                                          className="relative group overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-black/5"
                                        >
                                          <img
                                            src={mediaUrl}
                                            alt={att.name || 'Ảnh sản phẩm'}
                                            onClick={() => window.open(mediaUrl, '_blank')}
                                            className={`${heightClass} object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200`}
                                            title={att.name ? `${att.name} - Bấm để mở ảnh lớn` : 'Bấm để mở ảnh kích thước gốc'}
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Nhãn dán (Stickers) */}
                                {stickers.map((att, attIdx) => {
                                  const mediaUrl = resolveMediaUrl(att.url);
                                  return (
                                    <div key={attIdx} className="my-1">
                                      <img
                                        src={mediaUrl}
                                        alt={att.name || 'Nhãn dán'}
                                        className="w-24 h-24 sm:w-28 sm:h-28 object-contain hover:scale-105 transition-transform"
                                        title={att.name || 'Nhãn dán'}
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  );
                                })}

                                {/* Tệp tin tài liệu (Files) */}
                                {files.map((att, attIdx) => {
                                  const mediaUrl = resolveMediaUrl(att.url);
                                  return (
                                    <a
                                      key={attIdx}
                                      href={mediaUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-[11px] transition ${
                                        isStaff || isBot
                                          ? 'bg-white/20 hover:bg-white/30 text-white'
                                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                      }`}
                                    >
                                      <FileText size={15} className="shrink-0" />
                                      <span className="truncate max-w-[160px] font-medium">
                                        {att.name || 'Tệp đính kèm'}
                                      </span>
                                    </a>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          <div
                            className={`text-[9px] mt-1 text-right flex items-center justify-end space-x-1.5 ${
                              isStaff || isBot ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatMsgTime(msg.created_at)}</span>
                          </div>

                          {msg.metadata?.send_status === 'FAILED' && (
                            <div
                              className="flex items-center space-x-1 text-[10px] text-amber-200 mt-1 justify-end font-medium bg-rose-900/40 px-2 py-0.5 rounded-lg border border-rose-400/30"
                              title={msg.metadata?.error_message || 'Không thể gửi đến Messenger'}
                            >
                              <AlertTriangle size={11} className="text-amber-300 shrink-0" />
                              <span>Chưa gửi được sang Messenger (Token Fanpage hết hạn)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* =========================================================================
                  PANCAKE-STYLE TAG BAR (THANH THẺ NHÃN NẰM Ở DƯỚI - NGAY TRÊN KHUNG NHẬP TIN NHẮN)
                  ========================================================================= */}
              <div className="px-3.5 py-1.5 bg-[#f8fafc] dark:bg-slate-900/90 border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 z-10 shadow-2xs">
                {/* Danh sách thẻ cuộn ngang */}
                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                  {availableTags.map((tag) => {
                    const isApplied = (selectedConv.tags || []).includes(tag.name);
                    return (
                      <button
                        key={tag.name}
                        type="button"
                        onClick={() => handleToggleTag(tag.name)}
                        style={{
                          backgroundColor: isApplied ? tag.color : (tag.bg_color || '#FFFFFF'),
                          borderColor: tag.border_color || tag.color,
                          color: isApplied ? '#FFFFFF' : (tag.text_color || tag.color)
                        }}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition cursor-pointer shrink-0 select-none shadow-2xs hover:opacity-90 active:scale-95 ${
                          isApplied
                            ? 'ring-2 ring-offset-1 ring-slate-400/30 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={`Click để ${isApplied ? 'gỡ' : 'gắn'} nhãn "${tag.name}"`}
                      >
                        {tag.icon && <span>{tag.icon}</span>}
                        <span>{tag.name}</span>
                        {isApplied && <Check size={12} className="ml-0.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Nút + Thêm thẻ mới */}
                <button
                  type="button"
                  onClick={() => setShowNewTagModal(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-bold text-[#1877F2] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0 transition cursor-pointer shadow-2xs"
                  title="Tạo thêm thẻ nhãn mới cho cửa hàng"
                >
                  <Plus size={13} className="stroke-[2.5]" />
                  <span className="whitespace-nowrap">Thêm thẻ mới</span>
                </button>
              </div>

              {/* Bottom Input Message Bar (NẰM GỌN TRONG CỘT CHAT, CO GIÃN LINH ĐỘNG THEO CỘT CHAT) */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 relative">
                {/* 1. Preview Tệp / Hình ảnh đính kèm trước khi gửi */}
                {selectedAttachment && (
                  <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700 flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {selectedAttachment.type === 'image' ? (
                        <img
                          src={selectedAttachment.previewUrl}
                          alt="Preview"
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-[#1877F2] flex items-center justify-center shrink-0">
                          <FileText size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                          {selectedAttachment.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {selectedAttachment.size} • {selectedAttachment.type === 'image' ? 'Hình ảnh' : 'Tài liệu'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                      title="Hủy đính kèm"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* 2. Popover Bộ chọn Biểu tượng cảm xúc (Emoji) & Nhãn dán (Sticker) */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-16 left-3 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn"
                  >
                    {/* Header Tabs: Biểu tượng vs Nhãn dán */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setPickerTab('emoji')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            pickerTab === 'emoji'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-[#1877F2]'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                          }`}
                        >
                          Biểu tượng
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerTab('sticker')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            pickerTab === 'sticker'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-[#1877F2]'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                          }`}
                        >
                          Nhãn dán
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {pickerTab === 'emoji' ? (
                      /* Tab 1: Emoji Grid */
                      <div className="grid grid-cols-8 gap-1.5 max-h-52 overflow-y-auto no-scrollbar">
                        {COMMON_EMOJIS.map((emoji, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectEmoji(emoji)}
                            className="text-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer text-center flex items-center justify-center hover:scale-125 transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : (
                      /* Tab 2: Stickers Grid (Nhãn dán sinh động) */
                      <div className="grid grid-cols-4 gap-2.5 max-h-52 overflow-y-auto p-1 no-scrollbar">
                        {STICKERS_LIST.map((sticker) => (
                          <button
                            key={sticker.id}
                            type="button"
                            onClick={() => handleSendSticker(sticker)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition cursor-pointer flex flex-col items-center group"
                            title={sticker.name}
                          >
                            <img
                              src={sticker.url}
                              alt={sticker.name}
                              className="w-12 h-12 object-contain group-hover:scale-110 transition-transform"
                            />
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate max-w-full font-medium">
                              {sticker.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Hidden File Inputs cho Ảnh và Tệp đính kèm */}
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="*/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* 3. Form nhập liệu tin nhắn */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center space-x-2"
                >
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      selectedAttachment?.type === 'image'
                        ? 'bg-blue-50 text-[#1877F2]'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Đính kèm hình ảnh"
                  >
                    <Image size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      selectedAttachment?.type === 'file'
                        ? 'bg-blue-50 text-[#1877F2]'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Đính kèm tệp / tài liệu"
                  >
                    <Paperclip size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      showEmojiPicker
                        ? 'bg-blue-50 text-[#1877F2]'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Biểu tượng cảm xúc (Emoji)"
                  >
                    <Smile size={18} />
                  </button>

                  <input
                    type="text"
                    placeholder={
                      uploadingAttachment
                        ? 'Đang tải tệp đính kèm lên...'
                        : 'Nhập tin nhắn tư vấn khách hàng...'
                    }
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={sending}
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1877F2] transition"
                  />

                  <button
                    type="submit"
                    disabled={sending || (!inputMessage.trim() && !selectedAttachment)}
                    className="p-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl shadow-md transition disabled:opacity-40 cursor-pointer flex items-center justify-center shrink-0"
                    title="Gửi tin nhắn"
                  >
                    {sending ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* CỘT CRM KHÁCH HÀNG BÊN PHẢI (NẾU MỞ) - CHIỀU CAO 100% CỦA CỘT, ĐỘC LẬP */}
            {showCustomerCrm && (
              <aside className="w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 overflow-y-auto text-xs space-y-4 shrink-0 animate-fadeIn">
                <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <img
                    src={selectedConv.customer_id?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt="Avatar"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                    }}
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
                      selectedConv.customer_id.tags.map((t, idx) => {
                        const tagMeta = availableTags.find((tag) => tag.name.toLowerCase() === t.toLowerCase());
                        const bg = tagMeta?.bg_color || '#EEF2FF';
                        const text = tagMeta?.text_color || '#1877F2';
                        const border = tagMeta?.border_color || '#C7D2FE';
                        const icon = tagMeta?.icon || '';
                        return (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: bg,
                              color: text,
                              borderColor: border
                            }}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center space-x-1 shadow-2xs"
                          >
                            {icon && <span>{icon}</span>}
                            <span>{t}</span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Chưa gắn thẻ</span>
                    )}
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>

      {/* Modal Thêm Thẻ Nhãn Mới (Pancake Style) */}
      {showNewTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-[#1877F2] flex items-center justify-center">
                  <Tag size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thêm Thẻ Nhãn Mới
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Phong cách Pancake / Fchat cho phân loại tin nhắn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTagModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewTag} className="p-5 space-y-4">
              {/* Tên Thẻ */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>Tên thẻ nhãn <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Tối đa 30 ký tự</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  placeholder="Ví dụ: Đã thanh toán, Cần gọi gấp, Hẹn giao..."
                  value={newTagForm.name}
                  onChange={(e) => setNewTagForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  autoFocus
                />
              </div>

              {/* Biểu tượng Emoji nhanh */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Biểu tượng (Icon / Emoji)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 max-h-24 overflow-y-auto no-scrollbar">
                  {QUICK_TAG_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewTagForm((prev) => ({ ...prev, icon: emoji }))}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition cursor-pointer hover:scale-110 ${
                        newTagForm.icon === emoji
                          ? 'bg-blue-100 dark:bg-blue-900 border border-blue-400 scale-105'
                          : 'hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bảng màu chủ đạo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Màu sắc nhận diện
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {TAG_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewTagForm((prev) => ({ ...prev, color: c.hex }))}
                      style={{ backgroundColor: c.hex }}
                      className={`h-7 rounded-lg transition cursor-pointer flex items-center justify-center shadow-xs ${
                        newTagForm.color === c.hex ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white scale-105' : 'hover:scale-105 opacity-90'
                      }`}
                      title={c.name}
                    >
                      {newTagForm.color === c.hex && <Check size={14} className="text-white drop-shadow-sm" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Xem trước mẫu thẻ */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Xem trước hiển thị:</span>
                <div className="flex items-center space-x-3">
                  {/* Dạng Active (Đã gắn) */}
                  <span
                    style={{
                      backgroundColor: newTagForm.color,
                      color: '#ffffff',
                      borderColor: newTagForm.color
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-bold border shadow-xs"
                  >
                    {newTagForm.icon && <span>{newTagForm.icon}</span>}
                    <span>{newTagForm.name || 'Tên thẻ'}</span>
                    <Check size={12} className="ml-0.5 stroke-[3]" />
                  </span>

                  {/* Dạng Badge nhỏ ở danh sách chat */}
                  <span
                    style={{
                      backgroundColor: `${newTagForm.color}15`,
                      color: newTagForm.color,
                      borderColor: `${newTagForm.color}40`
                    }}
                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border shadow-2xs"
                  >
                    {newTagForm.icon && <span>{newTagForm.icon}</span>}
                    <span>{newTagForm.name || 'Tên thẻ'}</span>
                  </span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTagModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingNewTag || !newTagForm.name.trim()}
                  className="px-4 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  {submittingNewTag ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Tạo Thẻ Nhãn</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kết nối Kênh Fanpage mới nếu cần */}
      <ConnectChannelModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        businessId={activeBusiness._id}
        onChannelCreated={() => fetchChannels()}
      />

      {/* Modal xác nhận xóa Fanpage thay thế window.confirm */}
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

export default LiveChatPage;
