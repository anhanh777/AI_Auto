import axios from 'axios';
import { Channel, Customer, Conversation, Message } from '../models/index.js';
import { getIO } from '../config/socket.config.js';
import { processBotEngineForMessage } from './botEngine.service.js';
import { autoTagConversationService } from './conversation.service.js';
import { validateAndSanitizePhone } from '../helpers/orderValidation.helper.js';

const DEFAULT_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'ai_sales_secret_verify_token';

/**
 * 1. Xác thực Webhook từ Meta Facebook (HTTP GET)
 */
export const verifyWebhookService = async ({ mode, token, challenge }) => {
  if (mode === 'subscribe' && token) {
    if (token === DEFAULT_VERIFY_TOKEN) {
      return challenge;
    }

    // Kiểm tra xem token có khớp với cấu hình của bất kỳ Channel nào trong DB không
    const channelWithToken = await Channel.findOne({ webhook_verify_token: token });
    if (channelWithToken) {
      return challenge;
    }
  }
  return null;
};

/**
 * Lấy thông tin họ tên & avatar khách hàng từ Meta Graph API
 * Hỗ trợ 2 cơ chế:
 * 1. Gọi trực tiếp endpoint PSID /{senderPsid}
 * 2. Fallback gọi Page Conversations /{pageId}/conversations (luôn lấy được tên khách hàng của Page!)
 */
async function resolveCustomerInfo(senderPsid, pageId, pageToken) {
  let name = '';
  let avatar = '';

  if (pageToken) {
    // Cách 1: Gọi trực tiếp PSID
    try {
      const fbUserRes = await axios.get(`https://graph.facebook.com/v19.0/${senderPsid}`, {
        params: {
          fields: 'name,first_name,last_name,profile_pic',
          access_token: pageToken
        },
        timeout: 4000
      });
      if (fbUserRes.data?.name) {
        name = fbUserRes.data.name;
      } else if (fbUserRes.data?.first_name || fbUserRes.data?.last_name) {
        name = `${fbUserRes.data.first_name || ''} ${fbUserRes.data.last_name || ''}`.trim();
      }
      if (fbUserRes.data?.profile_pic) {
        avatar = fbUserRes.data.profile_pic;
      }
    } catch (err) {
      // Bị chặn do chính sách quyền riêng tư của Meta đối với người dùng ngoài App
    }

    // Cách 2: Fallback lấy qua Page Conversations (hoạt động 100% cho mọi khách nhắn tin vào Fanpage)
    if ((!name || name === 'Khách hàng Facebook') && pageId) {
      try {
        const convRes = await axios.get(`https://graph.facebook.com/v19.0/${pageId}/conversations`, {
          params: {
            fields: 'participants',
            limit: 15,
            access_token: pageToken
          },
          timeout: 4000
        });
        const convs = convRes.data?.data || [];
        for (const c of convs) {
          const parts = c.participants?.data || [];
          const found = parts.find((p) => p.id === senderPsid);
          if (found && found.name && found.name !== 'Người dùng Facebook') {
            name = found.name;
            break;
          }
        }
      } catch (err) {
        // bỏ qua
      }
    }
  }

  if (!name) {
    name = 'Khách hàng Facebook';
  }
  if (!avatar) {
    avatar = name !== 'Khách hàng Facebook'
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4F46E5&color=fff&size=200&bold=true`
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
  }

  return { name, avatar };
}

/**
 * 2. Tiếp nhận và xử lý payload sự kiện từ Meta Facebook (HTTP POST)
 */
export const handleWebhookPayloadService = async (body) => {
  if (body.object !== 'page' || !Array.isArray(body.entry)) {
    return { success: false, message: 'Invalid webhook object' };
  }

  for (const entry of body.entry) {
    const pageId = entry.id;
    const messagingEvents = entry.messaging || [];

    // Tìm kênh Fanpage tương ứng trong hệ thống
    const channel = await Channel.findOne({ page_id: pageId, is_connected: true }) ||
                    await Channel.findOne({ page_id: pageId });

    if (!channel) {
      console.warn(`[Facebook Webhook] Nhận tin nhắn nhưng không tìm thấy Channel với page_id: ${pageId}`);
      continue;
    }

    const pageToken = channel.page_access_token || channel.access_token;

    for (const event of messagingEvents) {
      // Hỗ trợ cả tin nhắn (message) và nút tương tác/Bắt đầu (postback) của khách
      if (!event.message && !event.postback) continue;
      if (event.message?.is_echo) continue;

      const senderPsid = event.sender?.id;
      if (!senderPsid || senderPsid === pageId) continue;

      // Chống lặp tin nhắn từ Meta Webhook Retry (Idempotency check qua mid hoặc postback key)
      const metaMessageId = event.message?.mid || (event.postback ? `postback_${senderPsid}_${event.timestamp}` : null);
      if (metaMessageId) {
        const existingMsg = await Message.findOne({ external_message_id: metaMessageId });
        if (existingMsg) {
          console.log(`[Facebook Webhook] ⏩ Bỏ qua sự kiện trùng lặp từ Meta (id: ${metaMessageId})`);
          continue;
        }
      }

      let messageText = '';
      if (event.message?.text) {
        messageText = event.message.text;
      } else if (event.postback) {
        messageText = event.postback.title || event.postback.payload || 'Bắt đầu';
      } else if (event.message?.quick_reply?.payload) {
        messageText = event.message.quick_reply.payload;
      }

      // Xử lý tệp đính kèm, ảnh, nhãn dán Facebook
      const attachments = (event.message?.attachments || []).map((att) => ({
        type: att.type === 'image' || att.type === 'sticker' ? 'image' : (att.type || 'file'),
        url: att.payload?.url || ''
      })).filter((a) => a.url);

      const replyToMid = event.message?.reply_to?.mid || null;
      const customerImageUrls = attachments.filter((a) => a.type === 'image').map((a) => a.url);

      // Nếu khách gửi Like thumb hoặc Sticker mà không có text
      if (!messageText && attachments.length === 0) {
        if (event.message?.sticker_id) {
          messageText = '👍';
        } else {
          continue;
        }
      }

      try {
        // A. Tìm hoặc tạo Khách hàng (Customer)
        let customer = await Customer.findOne({
          psid: senderPsid,
          business_id: channel.business_id
        });

        if (!customer) {
          const info = await resolveCustomerInfo(senderPsid, pageId, pageToken);
          customer = await Customer.create({
            business_id: channel.business_id,
            psid: senderPsid,
            full_name: info.name,
            avatar: info.avatar,
            profile_pic_url: info.avatar,
            customer_tags: ['Khách mới'],
            tags: ['Khách mới']
          });
        } else if (customer.full_name === 'Khách hàng Facebook' || !customer.full_name) {
          const info = await resolveCustomerInfo(senderPsid, pageId, pageToken);
          if (info.name && info.name !== 'Khách hàng Facebook') {
            customer.full_name = info.name;
            if (info.avatar && !info.avatar.includes('unsplash')) {
              customer.avatar = info.avatar;
              customer.profile_pic_url = info.avatar;
            }
            await customer.save();
            console.log(`[Facebook Webhook] Đã cập nhật tên thật cho khách hàng: ${info.name}`);
          }
        }

        // B. Tìm hoặc tạo Phiên hội thoại (Conversation)
        let conversation = await Conversation.findOne({
          channel_id: channel._id,
          customer_id: customer._id
        });

        if (!conversation) {
          conversation = await Conversation.create({
            business_id: channel.business_id,
            channel_id: channel._id,
            customer_id: customer._id,
            is_bot_active: channel.operating_mode === 'AI_AUTO' || channel.operating_mode === 'AI_FIRST',
            conversation_status: 'ACTIVE',
            status: 'ACTIVE',
            tags: customer.tags || ['Khách mới'],
            unread_count: 0
          });
        }

        // C. Lưu Tin nhắn vào Collection messages
        const contentToSave = messageText || (attachments.length > 0 ? '[Hình ảnh]' : '[Tin nhắn]');
        const savedMessage = await Message.create({
          conversation_id: conversation._id,
          sender_type: 'CUSTOMER',
          sender_id: senderPsid,
          external_message_id: metaMessageId || null,
          content: contentToSave,
          attachments,
          is_read: false
        });

        // D. Cập nhật trạng thái hội thoại và khách hàng
        conversation.last_message_content = contentToSave;
        conversation.last_message_text = contentToSave;
        conversation.last_message_at = new Date();
        conversation.unread_count = (conversation.unread_count || 0) + 1;
        await conversation.save();

        customer.last_interaction_at = new Date();
        await customer.save();

        // Tự động gán nhãn khi tin nhắn khách chứa SĐT hợp lệ hoặc phân loại khách
        if (messageText) {
          const phoneRes = validateAndSanitizePhone(messageText);
          if (phoneRes.isValid) {
            autoTagConversationService(conversation._id, {
              hasPhone: true,
              phone: phoneRes.cleanPhone,
              customerId: customer._id
            }).catch(() => {});
          }
        }

        // E. Nạp đầy đủ dữ liệu quan hệ để phát Socket.IO
        const populatedConv = await Conversation.findById(conversation._id)
          .populate('customer_id')
          .populate('channel_id');

        // F. Phát Real-Time qua Socket.IO tới người dùng đang trực chat
        try {
          const io = getIO();
          // Phát tin nhắn cho ai đang mở phòng chat này
          io.to(conversation._id.toString()).emit('new_message', savedMessage);

          // Phát sự kiện cập nhật danh sách hội thoại của toàn bộ cửa hàng/kênh
          if (channel.business_id) {
            io.to(channel.business_id.toString()).emit('conversation_updated', populatedConv);
          }
          io.emit('conversation_updated', populatedConv);

          // Phát quảng bá toàn hệ thống nếu client chưa join room cụ thể
          io.emit('new_incoming_message', {
            conversation: populatedConv,
            message: savedMessage
          });
          io.emit('customer_updated', customer);

          console.log(`[Socket.IO] Đã phát tin nhắn mới từ PSID ${senderPsid} (${customer.full_name})`);
        } catch (socketErr) {
          console.warn('[Socket.IO Webhook Warn]', socketErr.message);
        }

        // Bóc tách hình ảnh từ tin nhắn trích dẫn (Quote Reply) hoặc tin nhắn ảnh gần nhất
        if (replyToMid) {
          const quotedMsg = await Message.findOne({ external_message_id: replyToMid });
          if (quotedMsg && Array.isArray(quotedMsg.attachments)) {
            for (const att of quotedMsg.attachments) {
              if (att.url && !customerImageUrls.includes(att.url)) {
                customerImageUrls.push(att.url);
              }
            }
          }
        }

        // Nếu khách hỏi về ảnh ("ảnh này", "hình này", "mẫu này", "đây là sản phẩm gì", v.v.) hoặc có swipe quote (replyToMid) mà chưa có URL, tìm ảnh gần nhất trong cuộc trò chuyện
        const isAskingAboutImage = /(?:ảnh này|hình này|mẫu này|cái này|sản phẩm này|mẫu trong ảnh|hình trong tin nhắn|đây là gì|đây là mẫu gì|đây là sản phẩm gì|con này|bộ này|mô hình này|bộ lego này|cho tôi biết đây|mẫu nào|sản phẩm nào)/i.test(messageText);

        if (customerImageUrls.length === 0 && (replyToMid || isAskingAboutImage)) {
          const lastImageMsg = await Message.findOne({
            conversation_id: conversation._id,
            _id: { $ne: savedMessage._id },
            'attachments.0': { $exists: true }
          }).sort({ created_at: -1 });

          if (lastImageMsg && Array.isArray(lastImageMsg.attachments)) {
            for (const att of lastImageMsg.attachments) {
              if (att.url && (att.type === 'image' || !att.type) && !customerImageUrls.includes(att.url)) {
                customerImageUrls.push(att.url);
              }
            }
          }
        }

        if (customerImageUrls.length > 0) {
          console.log(`[Facebook Webhook] 📸 Nhận diện được ${customerImageUrls.length} ảnh cần AI Vision phân tích:`, customerImageUrls);
        }

        // G. Kích hoạt Bộ máy Bot tự động phản hồi theo kịch bản do Chủ shop cấu hình
        processBotEngineForMessage({
          business_id: channel.business_id,
          channel_id: channel._id,
          conversation_id: conversation._id,
          customer_id: customer._id,
          senderPsid,
          messageText,
          customerImageUrls,
          isFirstMessage: (conversation.unread_count || 0) <= 1
        }).catch((botErr) => {
          console.warn('[Bot Execution Error]', botErr.message);
        });

      } catch (procErr) {
        console.error(`[Facebook Webhook] Lỗi xử lý event của PSID ${senderPsid}:`, procErr);
      }
    }
  }

  return { success: true };
};
