import axios from 'axios';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { Customer } from '../models/customer.model.js';
import { getIO } from '../config/socket.config.js';

export const getConversationsService = async ({ business_id, channel_id, search, tag }) => {
  const query = {};
  if (business_id) query.business_id = business_id;
  if (channel_id) query.channel_id = channel_id;
  if (tag) query.tags = tag;

  let conversations = await Conversation.find(query)
    .populate('customer_id')
    .populate('channel_id')
    .sort({ last_message_at: -1 });

  // Nếu lọc theo channel_id mà chưa có hội thoại nào, lấy các hội thoại của business đó
  if (conversations.length === 0 && channel_id && business_id) {
    const fallbackQuery = { business_id };
    if (tag) fallbackQuery.tags = tag;
    conversations = await Conversation.find(fallbackQuery)
      .populate('customer_id')
      .populate('channel_id')
      .sort({ last_message_at: -1 });
  }

  if (search) {
    const q = search.toLowerCase();
    conversations = conversations.filter(c =>
      c.customer_id?.full_name?.toLowerCase().includes(q) ||
      c.last_message_text?.toLowerCase().includes(q)
    );
  }

  return conversations;
};

export const getMessagesService = async (conversationId) => {
  const messages = await Message.find({ conversation_id: conversationId })
    .sort({ created_at: 1 });
  return messages;
};

export const sendMessageService = async ({ conversation_id, sender_type = 'STAFF', sender_id, content, attachments = [] }) => {
  const message = await Message.create({
    conversation_id,
    sender_type,
    sender_id,
    content,
    attachments
  });

  const updatedConv = await Conversation.findByIdAndUpdate(
    conversation_id,
    {
      last_message_content: content,
      last_message_text: content,
      last_message_at: new Date()
    },
    { new: true }
  ).populate('channel_id').populate('customer_id');

  // Gửi tin nhắn sang Messenger của khách nếu khách có PSID và Fanpage có Page Access Token
  if ((sender_type === 'STAFF' || sender_type === 'AI_BOT') && content && updatedConv) {
    try {
      const pageToken = updatedConv.channel_id?.page_access_token || updatedConv.channel_id?.access_token;
      const recipientPsid = updatedConv.customer_id?.psid;

      if (pageToken && recipientPsid) {
        await axios.post(
          `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
          {
            recipient: { id: recipientPsid },
            message: { text: content }
          },
          { timeout: 7000 }
        );
        console.log(`[Facebook Send API] Đã gửi tin nhắn đến khách hàng (PSID: ${recipientPsid})`);
      }
    } catch (fbErr) {
      console.warn('[Facebook Send API Warn]', fbErr.response?.data?.error?.message || fbErr.message);
    }
  }

  // Phát Real-time qua Socket.IO
  try {
    const io = getIO();
    io.to(conversation_id.toString()).emit('new_message', message);
    if (updatedConv?.business_id) {
      io.to(updatedConv.business_id.toString()).emit('conversation_updated', updatedConv);
    }
  } catch (socketErr) {
    // Socket.io chưa kết nối hoặc lỗi phát
  }

  return message;
};

export const toggleBotActiveService = async (conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error('Không tìm thấy cuộc trò chuyện');
  conversation.is_bot_active = !conversation.is_bot_active;
  await conversation.save();
  return conversation;
};
