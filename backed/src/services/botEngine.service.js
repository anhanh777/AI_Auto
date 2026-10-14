import axios from 'axios';
import { Conversation, Message, Customer, Channel } from '../models/index.js';
import { matchIncomingMessageToScenario } from './botScenario.service.js';
import { getIO } from '../config/socket.config.js';

/**
 * Xử lý tự động phản hồi tin nhắn của khách hàng dựa trên Kịch bản của Chủ shop
 */
export const processBotEngineForMessage = async ({
  business_id,
  channel_id,
  conversation_id,
  customer_id,
  senderPsid,
  messageText = '',
  isFirstMessage = false
}) => {
  if (!business_id || !conversation_id) return { handled: false };

  try {
    const conversation = await Conversation.findById(conversation_id)
      .populate('channel_id')
      .populate('customer_id');

    if (!conversation) return { handled: false };

    // Nếu cuộc trò chuyện đã bị tắt bot (nhân viên đang tiếp quản), không can thiệp
    if (conversation.is_bot_active === false) {
      console.log(`[Bot Engine] Cuộc trò chuyện #${conversation_id} đang do nhân viên tiếp quản (is_bot_active = false)`);
      return { handled: false, reason: 'STAFF_TAKEN_OVER' };
    }

    const channel = conversation.channel_id;
    if (channel && channel.operating_mode === 'MANUAL') {
      console.log(`[Bot Engine] Kênh ${channel.page_name} đang ở chế độ MANUAL`);
      return { handled: false, reason: 'CHANNEL_MANUAL' };
    }

    const pageToken = channel?.page_access_token || channel?.access_token;

    // 1. Quét tìm kịch bản của chủ shop khớp với tin nhắn
    const matchedScenario = await matchIncomingMessageToScenario({
      business_id,
      channel_id,
      messageText,
      isFirstMessage
    });

    if (matchedScenario) {
      console.log(`[Bot Engine] 🎯 Khớp Kịch bản của chủ shop: "${matchedScenario.scenario_name}" (Action: ${matchedScenario.action_type})`);

      const replyContent = matchedScenario.response_content || '';

      // A. Nếu kịch bản yêu cầu BÀN GIAO NHÂN VIÊN
      if (matchedScenario.action_type === 'HANDOVER_STAFF') {
        conversation.is_bot_active = false;
        conversation.conversation_status = 'PENDING_STAFF';
        await conversation.save();
      }

      // B. Nếu có gắn tag cho khách hàng
      if (matchedScenario.tag_to_add) {
        await Customer.findByIdAndUpdate(customer_id, {
          $addToSet: { tags: matchedScenario.tag_to_add, customer_tags: matchedScenario.tag_to_add }
        });
      }

      // C. Lưu tin nhắn trả lời của Bot vào cơ sở dữ liệu
      if (replyContent) {
        const botMessage = await Message.create({
          conversation_id: conversation._id,
          sender_type: 'AI_BOT',
          sender_id: null,
          content: replyContent,
          attachments: matchedScenario.image_url ? [{ type: 'image', url: matchedScenario.image_url }] : [],
          is_read: true
        });

        conversation.last_message_content = replyContent;
        conversation.last_message_text = replyContent;
        conversation.last_message_at = new Date();
        await conversation.save();

        // D. Phát Socket.IO cho nhân viên đang trực chat nhìn thấy
        try {
          const io = getIO();
          io.to(conversation._id.toString()).emit('new_message', botMessage);
          io.to(business_id.toString()).emit('conversation_updated', conversation);
        } catch (sockErr) {
          console.warn('[Socket Bot Warning]', sockErr.message);
        }

        // E. Gửi tin nhắn thực tế về Facebook Messenger của khách qua Meta Graph API
        if (pageToken && senderPsid) {
          try {
            await axios.post(
              `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
              {
                recipient: { id: senderPsid },
                message: { text: replyContent }
              },
              { timeout: 7000 }
            );
            console.log(`[Facebook Send API] Bot đã gửi kịch bản "${matchedScenario.scenario_name}" đến PSID ${senderPsid}`);
          } catch (fbSendErr) {
            console.warn('[Facebook Send Bot Reply Warn]', fbSendErr.response?.data?.error?.message || fbSendErr.message);
          }
        }
      }

      return {
        handled: true,
        scenario: matchedScenario.scenario_name,
        action: matchedScenario.action_type
      };
    }

    // Không khớp kịch bản nào -> Trả về để luồng AI Gemini xử lý ở bước tiếp theo
    return { handled: false, reason: 'NO_SCENARIO_MATCH' };
  } catch (error) {
    console.error('[Bot Engine Error]', error);
    return { handled: false, error: error.message };
  }
};
