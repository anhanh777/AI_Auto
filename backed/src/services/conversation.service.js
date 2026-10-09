import { Conversation } from '../models/Conversation.model.js';
import { Message } from '../models/Message.model.js';
import { Customer } from '../models/Customer.model.js';

export const getConversationsService = async ({ business_id, channel_id, search, tag }) => {
  const query = {};
  if (business_id) query.business_id = business_id;
  if (channel_id) query.channel_id = channel_id;
  if (tag) query.tags = tag;

  let conversations = await Conversation.find(query)
    .populate('customer_id')
    .populate('channel_id')
    .sort({ last_message_at: -1 });

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

  await Conversation.findByIdAndUpdate(conversation_id, {
    last_message_text: content,
    last_message_at: new Date()
  });

  return message;
};

export const toggleBotActiveService = async (conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error('Không tìm thấy cuộc trò chuyện');
  conversation.is_bot_active = !conversation.is_bot_active;
  await conversation.save();
  return conversation;
};
