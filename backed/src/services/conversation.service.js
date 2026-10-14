import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { Conversation, Message, Customer } from '../models/index.js';
import { getIO } from '../config/socket.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadBaseDir = path.resolve(__dirname, '../../uploads');

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
  if ((sender_type === 'STAFF' || sender_type === 'AI_BOT') && (content || attachments.length > 0) && updatedConv) {
    try {
      const pageToken = updatedConv.channel_id?.page_access_token || updatedConv.channel_id?.access_token;
      const recipientPsid = updatedConv.customer_id?.psid;

      if (pageToken && recipientPsid) {
        // Chỉ gửi text nếu text KHÔNG PHẢI là placeholder tự tạo như "[Hình ảnh]" hoặc "[Nhãn dán]" khi có attachments
        const isPlaceholderText = (content === '[Hình ảnh]' || content === '[Nhãn dán]' || content?.startsWith('[Tệp:')) && attachments.length > 0;
        if (content && !isPlaceholderText) {
          try {
            await axios.post(
              `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
              {
                recipient: { id: recipientPsid },
                message: { text: content }
              },
              { timeout: 7000 }
            );
            console.log(`[Facebook Send API] Đã gửi tin nhắn văn bản đến khách hàng (PSID: ${recipientPsid})`);
          } catch (textErr) {
            console.warn('[Facebook Send Text Warn]', textErr.response?.data?.error?.message || textErr.message);
          }
        }

        // Gửi tệp đính kèm (ảnh / file / nhãn dán)
        for (const att of attachments) {
          if (!att?.url) continue;

          // Kiểm tra xem URL có trỏ đến file cục bộ trong /uploads/ không
          let localFilePath = null;
          const uploadsIndex = att.url.indexOf('/uploads/');
          if (uploadsIndex !== -1) {
            const relPath = att.url.substring(uploadsIndex + '/uploads/'.length);
            const candidatePath = path.join(uploadBaseDir, relPath);
            if (fs.existsSync(candidatePath)) {
              localFilePath = candidatePath;
            }
          } else if (att.url.startsWith('/stickers/')) {
            const candidatePath = path.join(uploadBaseDir, att.url);
            if (fs.existsSync(candidatePath)) {
              localFilePath = candidatePath;
            }
          }

          if (localFilePath) {
            // Upload trực tiếp filedata qua FormData (Facebook nhận binary trực tiếp từ máy tính/server!)
            try {
              const fileBuf = fs.readFileSync(localFilePath);
              const ext = path.extname(localFilePath).toLowerCase();
              let mimeType = 'image/jpeg';
              if (ext === '.png') mimeType = 'image/png';
              else if (ext === '.webp') mimeType = 'image/webp';
              else if (ext === '.gif') mimeType = 'image/gif';
              else if (ext === '.pdf') mimeType = 'application/pdf';

              const form = new FormData();
              form.append('recipient', JSON.stringify({ id: recipientPsid }));
              form.append(
                'message',
                JSON.stringify({
                  attachment: {
                    type: att.type === 'image' || att.type === 'sticker' ? 'image' : 'file',
                    payload: {}
                  }
                })
              );
              form.append('filedata', new Blob([fileBuf], { type: mimeType }), path.basename(localFilePath));

              const fbRes = await fetch(
                `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
                {
                  method: 'POST',
                  body: form
                }
              );
              const fbData = await fbRes.json();
              if (fbData.error) {
                console.warn('[Facebook Send Attachment Form Error]', fbData.error.message);
              } else {
                console.log(`[Facebook Send API] Đã gửi file đính kèm/nhãn dán (${att.type}) thành công đến PSID: ${recipientPsid}`);
              }
            } catch (formErr) {
              console.warn('[Facebook Send Attachment Form Warn]', formErr.message);
            }
          } else if (att.url.startsWith('https://') || att.url.startsWith('http://')) {
            // URL công khai trên Internet
            try {
              await axios.post(
                `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
                {
                  recipient: { id: recipientPsid },
                  message: {
                    attachment: {
                      type: att.type === 'image' || att.type === 'sticker' ? 'image' : 'file',
                      payload: { url: att.url, is_reusable: true }
                    }
                  }
                },
                { timeout: 10000 }
              );
              console.log(`[Facebook Send API] Đã gửi URL đính kèm (${att.type}) đến PSID: ${recipientPsid}`);
            } catch (attErr) {
              console.warn('[Facebook Send Attachment Warn]', attErr.response?.data?.error?.message || attErr.message);
            }
          }
        }
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

/**
 * Cập nhật thẻ nhãn (tags) của cuộc hội thoại: TOGGLE, ADD, REMOVE, SET
 */
export const updateConversationTagsService = async (conversationId, { action = 'TOGGLE', tag, tags }) => {
  const conversation = await Conversation.findById(conversationId)
    .populate('customer_id')
    .populate('channel_id');
  if (!conversation) throw new Error('Không tìm thấy cuộc trò chuyện');

  let currentTags = Array.isArray(conversation.tags) ? [...conversation.tags] : [];

  if (action === 'TOGGLE' && tag) {
    const trimmed = tag.trim();
    if (currentTags.includes(trimmed)) {
      currentTags = currentTags.filter((t) => t !== trimmed);
    } else {
      currentTags.push(trimmed);
    }
  } else if (action === 'ADD' && tag) {
    const trimmed = tag.trim();
    if (!currentTags.includes(trimmed)) currentTags.push(trimmed);
  } else if (action === 'REMOVE' && tag) {
    const trimmed = tag.trim();
    currentTags = currentTags.filter((t) => t !== trimmed);
  } else if (action === 'SET' && Array.isArray(tags)) {
    currentTags = tags.map((t) => String(t).trim()).filter(Boolean);
  }

  conversation.tags = currentTags;
  await conversation.save();

  // Đồng bộ thẻ sang Customer nếu có customer_id
  if (conversation.customer_id) {
    await Customer.findByIdAndUpdate(conversation.customer_id._id, {
      $set: { tags: currentTags, customer_tags: currentTags }
    });
  }

  // Phát Socket.IO cập nhật real-time
  try {
    const io = getIO();
    if (conversation.business_id) {
      io.to(conversation.business_id.toString()).emit('conversation_updated', conversation);
    }
    io.emit('conversation_tags_updated', {
      conversation_id: conversation._id,
      tags: currentTags
    });
  } catch (err) {
    console.warn('[Socket Tag Update Warn]', err.message);
  }

  return conversation;
};
