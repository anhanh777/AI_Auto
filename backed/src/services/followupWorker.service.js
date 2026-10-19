import axios from 'axios';
import { Conversation } from '../models/Conversation.model.js';
import { Message } from '../models/Message.model.js';
import { Order } from '../models/Order.model.js';
import { getIO } from '../config/socket.config.js';

/**
 * Quét và tự động gửi tin nhắn chăm sóc lại sau 24h cho các khách hàng chưa chốt đơn
 */
export const processDueFollowups = async () => {
  try {
    const now = new Date();
    const dueConversations = await Conversation.find({
      followup_status: 'PENDING',
      followup_due_at: { $lte: now },
      is_bot_active: { $ne: false }
    })
      .populate('channel_id')
      .populate('customer_id')
      .limit(20);

    if (!dueConversations || dueConversations.length === 0) return;

    console.log(`[Followup Worker] ⏰ Phát hiện ${dueConversations.length} hội thoại đến hạn chăm sóc lại sau 24h`);

    for (const conv of dueConversations) {
      try {
        const channel = conv.channel_id;
        const customer = conv.customer_id;

        // Nếu khách đã chốt đơn trước đó thì hủy lịch chăm sóc
        if (conv.order_draft?.status === 'ORDER_CREATED' || conv.order_draft?.last_order_id) {
          conv.followup_status = 'CANCELLED';
          await conv.save();
          continue;
        }

        // Kiểm tra xem trong DB đã có đơn hàng nào của khách trong 24h qua chưa
        if (customer?._id) {
          const recentOrder = await Order.findOne({
            customer_id: customer._id,
            created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }).lean();
          if (recentOrder) {
            conv.followup_status = 'CANCELLED';
            await conv.save();
            continue;
          }
        }

        const pageToken = channel?.page_access_token || channel?.access_token;
        const targetPsid = customer?.psid;
        const customerName = customer?.full_name || 'bạn';
        const targetItem = conv.followup_note || 'sản phẩm';

        const followupReply = `Dạ ${customerName} ơi, mẫu ${targetItem} bên shop vẫn đang còn hàng sẵn và có nhiều ưu đãi ạ. Bạn có cần shop hỗ trợ tư vấn thêm về size hay chuẩn bị gửi hàng cho mình không nhé? ❤️`;

        let fbSuccess = false;
        if (pageToken && targetPsid) {
          try {
            await axios.post(
              `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
              {
                recipient: { id: targetPsid },
                message: { text: followupReply }
              },
              { timeout: 8000 }
            );
            fbSuccess = true;
            console.log(`[Followup Worker] ✉️ Đã gửi tin nhắn chăm sóc lại 24h đến PSID ${targetPsid} (${customerName})`);
          } catch (fbErr) {
            console.warn(`[Followup Worker Warn] Gửi FB thất bại tới PSID ${targetPsid}:`, fbErr.response?.data || fbErr.message);
          }
        }

        // Lưu tin nhắn vào CSDL
        const botMsg = await Message.create({
          conversation_id: conv._id,
          sender_type: 'AI_BOT',
          sender_id: null,
          content: followupReply,
          attachments: [],
          is_read: true
        });

        conv.last_message_content = followupReply;
        conv.last_message_text = followupReply;
        conv.last_message_at = new Date();
        conv.followup_status = 'COMPLETED';
        await conv.save();

        // Phát Socket.IO cho nhân viên thấy
        try {
          const io = getIO();
          if (io) {
            io.to(conv._id.toString()).emit('new_message', botMsg);
            io.emit('conversation_updated', conv);
          }
        } catch (sErr) {}
      } catch (itemErr) {
        console.error(`[Followup Worker Item Error #${conv._id}]`, itemErr.message);
      }
    }
  } catch (err) {
    console.error('[Followup Worker Error]', err.message);
  }
};

/**
 * Khởi động tiến trình kiểm tra định kỳ mỗi 2 phút
 */
export const startFollowupCronWorker = () => {
  console.log('[Followup Worker] 🚀 Khởi động dịch vụ Hẹn giờ chăm sóc lại sau 24h (mỗi 2 phút/lần)');
  processDueFollowups().catch(() => {});
  setInterval(processDueFollowups, 2 * 60 * 1000);
};
