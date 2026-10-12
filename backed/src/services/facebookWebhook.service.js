import axios from 'axios';
import { Channel } from '../models/channel.model.js';
import { Customer } from '../models/customer.model.js';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { getIO } from '../config/socket.config.js';

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
      // Chỉ xử lý tin nhắn do khách gửi (loại bỏ echo và delivery receipt)
      if (!event.message) continue;
      if (event.message.is_echo) continue;

      const senderPsid = event.sender?.id;
      if (!senderPsid || senderPsid === pageId) continue;

      const messageText = event.message.text || '';
      const attachments = (event.message.attachments || []).map((att) => ({
        type: att.type === 'image' ? 'image' : 'file',
        url: att.payload?.url || ''
      })).filter((a) => a.url);

      if (!messageText && attachments.length === 0) continue;

      try {
        // A. Tìm hoặc tạo Khách hàng (Customer)
        let customer = await Customer.findOne({
          psid: senderPsid,
          business_id: channel.business_id
        });

        if (!customer) {
          let customerName = 'Khách hàng Facebook';
          let customerAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

          // Gọi Facebook Graph API để lấy thông tin khách hàng thật
          if (pageToken) {
            try {
              const fbUserRes = await axios.get(
                `https://graph.facebook.com/v19.0/${senderPsid}`,
                {
                  params: {
                    fields: 'name,first_name,last_name,profile_pic',
                    access_token: pageToken
                  },
                  timeout: 5000
                }
              );
              if (fbUserRes.data) {
                if (fbUserRes.data.name) {
                  customerName = fbUserRes.data.name;
                } else if (fbUserRes.data.first_name || fbUserRes.data.last_name) {
                  customerName = `${fbUserRes.data.first_name || ''} ${fbUserRes.data.last_name || ''}`.trim();
                }
                if (fbUserRes.data.profile_pic) {
                  customerAvatar = fbUserRes.data.profile_pic;
                }
              }
            } catch (err) {
              console.warn(`[Facebook Webhook] Không thể lấy profile PSID ${senderPsid}:`, err.message);
            }
          }

          customer = await Customer.create({
            business_id: channel.business_id,
            psid: senderPsid,
            full_name: customerName,
            avatar: customerAvatar,
            profile_pic_url: customerAvatar,
            customer_tags: ['Khách mới'],
            tags: ['Khách mới']
          });
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
          content: contentToSave,
          attachments,
          is_read: false
        });

        // D. Cập nhật trạng thái hội thoại
        conversation.last_message_content = contentToSave;
        conversation.last_message_text = contentToSave;
        conversation.last_message_at = new Date();
        conversation.unread_count = (conversation.unread_count || 0) + 1;
        await conversation.save();

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
          io.to(channel.business_id.toString()).emit('conversation_updated', populatedConv);

          // Phát quảng bá toàn hệ thống nếu client chưa join room cụ thể
          io.emit('new_incoming_message', {
            conversation: populatedConv,
            message: savedMessage
          });

          console.log(`[Socket.IO] Đã phát tin nhắn mới từ PSID ${senderPsid} (${customer.full_name})`);
        } catch (socketErr) {
          console.warn('[Socket.IO Webhook Warn]', socketErr.message);
        }

      } catch (procErr) {
        console.error(`[Facebook Webhook] Lỗi xử lý event của PSID ${senderPsid}:`, procErr);
      }
    }
  }

  return { success: true };
};
