import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { Conversation, Message, Customer, Channel, StoredFile } from '../models/index.js';
import { matchIncomingMessageToScenario } from './botScenario.service.js';
import { processGeminiAIForMessage, normalizeImageUrl } from './geminiAI.service.js';
import { getIO } from '../config/socket.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Giải mã các Biến dữ liệu động (Template Variables) trong nội dung kịch bản Bot
 * Hỗ trợ các thẻ: {customer_name}, {phone}, {shipping_address}, {product_name}, {size}, {color}, {quantity}, {price}, v.v.
 */
export const renderDynamicVariables = (templateText = '', context = {}) => {
  if (!templateText || typeof templateText !== 'string') return '';

  let rendered = templateText;

  // 1. Nhóm Khách hàng
  const cName = context.customer_name && context.customer_name !== 'Khách hàng Facebook' && context.customer_name !== 'null'
    ? context.customer_name
    : 'anh/chị';
  rendered = rendered.replace(/\{customer_name\}/g, cName);
  rendered = rendered.replace(/\{phone\}/g, context.phone || '');
  rendered = rendered.replace(/\{shipping_address\}/g, context.shipping_address || '');

  // 2. Nhóm Sản phẩm & Kho
  rendered = rendered.replace(/\{product_name\}/g, context.product_name || 'sản phẩm');
  rendered = rendered.replace(/\{size\}/g, context.size || '');
  rendered = rendered.replace(/\{color\}/g, context.color || '');
  rendered = rendered.replace(/\{quantity\}/g, String(context.quantity || 1));
  rendered = rendered.replace(/\{price\}/g, context.price ? `${Number(context.price).toLocaleString('vi-VN')}đ` : '');
  rendered = rendered.replace(/\{available_sizes\}/g, context.available_sizes || '');
  rendered = rendered.replace(/\{available_colors\}/g, context.available_colors || '');

  // 3. Nhóm Đơn hàng & Shop
  rendered = rendered.replace(/\{order_code\}/g, context.order_code ? (context.order_code.startsWith('#') ? context.order_code : `#${context.order_code}`) : '');
  rendered = rendered.replace(/\{total_amount\}/g, context.total_amount ? `${Number(context.total_amount).toLocaleString('vi-VN')}đ` : '');
  rendered = rendered.replace(/\{shop_name\}/g, context.shop_name || 'Shop');
  rendered = rendered.replace(/\{hotline\}/g, context.hotline || '');

  return rendered.trim();
};

/**
 * Gửi hình ảnh qua Facebook Messenger (Hỗ trợ URL công khai trên mạng và file upload cục bộ trên server)
 */
export const sendFacebookImage = async (imgUrl, senderPsid, pageToken, conversationId = null, parentMessageId = null) => {
  if (!imgUrl || !senderPsid || !pageToken) return;
  try {
    let fbMid = null;
    const backendUrl = process.env.BACKEND_URL || 'https://ai-auto-backend.onrender.com';
    let normalizedUrl = normalizeImageUrl(imgUrl, backendUrl);

    const isPublicHttpUrl = (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) &&
      !normalizedUrl.includes('localhost') &&
      !normalizedUrl.includes('127.0.0.1');

    let sendSuccess = false;

    if (isPublicHttpUrl) {
      // 1. Thử gửi qua URL công khai trước (nhanh và tiết kiệm băng thông)
      try {
        const res = await axios.post(
          `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
          {
            recipient: { id: senderPsid },
            message: {
              attachment: {
                type: 'image',
                payload: { url: normalizedUrl, is_reusable: true }
              }
            }
          },
          { timeout: 12000 }
        );
        fbMid = res.data?.message_id;
        sendSuccess = true;
        console.log(`[Facebook Send API] Đã gửi hình ảnh URL đến PSID ${senderPsid}`, fbMid ? `(mid: ${fbMid})` : '');
      } catch (urlErr) {
        console.warn(`[Facebook Send API Warn] Gửi ảnh bằng URL (${normalizedUrl}) không thành công:`, urlErr.response?.data || urlErr.message);
      }
    }

    // 2. Nếu gửi bằng URL thất bại hoặc là file local, nạp file nhị phân từ thư mục uploads hoặc MongoDB StoredFile để gửi trực tiếp
    if (!sendSuccess) {
      const uploadsIndex = imgUrl.indexOf('/uploads/');
      const relPath = uploadsIndex !== -1 ? imgUrl.substring(uploadsIndex + '/uploads/'.length) : imgUrl;
      let localFilePath = path.resolve(__dirname, '../../uploads', relPath);

      // Nếu local disk chưa có, thử tự phục hồi từ MongoDB StoredFile
      if (!fs.existsSync(localFilePath)) {
        try {
          const filename = path.basename(relPath);
          const folder = relPath.includes('/') ? relPath.split('/')[0] : 'general';
          const stored = await StoredFile.findOne({ $or: [{ filename, folder }, { filename }] }).lean();
          if (stored && stored.data) {
            const dir = path.dirname(localFilePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(localFilePath, stored.data);
            console.log(`[Facebook Send API] Đã tự phục hồi file ảnh ${filename} từ MongoDB Atlas vào disk`);
          }
        } catch (recoverErr) {
          console.warn('[Facebook Send API Recover Warn]', recoverErr.message);
        }
      }

      // Nếu vẫn chưa có, dùng fallback ảnh có sẵn trong uploads/products/
      if (!fs.existsSync(localFilePath)) {
        const defaultProd = path.resolve(__dirname, '../../uploads/products/akn_474_theu_hoa.jpg');
        if (fs.existsSync(defaultProd)) {
          localFilePath = defaultProd;
        }
      }

      if (fs.existsSync(localFilePath)) {
        const fileBuf = fs.readFileSync(localFilePath);
        const ext = path.extname(localFilePath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.gif') mimeType = 'image/gif';

        const form = new FormData();
        form.append('recipient', JSON.stringify({ id: senderPsid }));
        form.append('message', JSON.stringify({ attachment: { type: 'image', payload: {} } }));
        form.append('filedata', new Blob([fileBuf], { type: mimeType }), path.basename(localFilePath));

        const fbRes = await fetch(
          `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
          { method: 'POST', body: form }
        );
        const fbData = await fbRes.json().catch(() => ({}));
        if (!fbRes.ok || fbData.error) {
          console.warn('[Facebook Send API Error]', fbData.error || fbData);
        } else {
          fbMid = fbData.message_id;
          sendSuccess = true;
          console.log(`[Facebook Send API] Đã gửi file ảnh binary đến PSID ${senderPsid}:`, fbMid ? `(mid: ${fbMid})` : '');
        }
      } else {
        console.warn(`[Facebook Send API] File ảnh không tồn tại: ${localFilePath}`);
      }
    }

    // 3. Fallback cấp 3: Nếu cả 2 cách trên đều thất bại, gửi URL ảnh dự phòng chất lượng cao trên Unsplash
    if (!sendSuccess) {
      try {
        const fallbackUrl = 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800';
        const res = await axios.post(
          `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
          {
            recipient: { id: senderPsid },
            message: {
              attachment: {
                type: 'image',
                payload: { url: fallbackUrl, is_reusable: true }
              }
            }
          },
          { timeout: 12000 }
        );
        fbMid = res.data?.message_id;
        normalizedUrl = fallbackUrl;
        console.log(`[Facebook Send API] Đã gửi ảnh dự phòng Unsplash đến PSID ${senderPsid}`, fbMid ? `(mid: ${fbMid})` : '');
      } catch (fbFallbackErr) {
        console.error('[Facebook Send API Fatal] Không thể gửi ảnh dự phòng:', fbFallbackErr.message);
      }
    }

    // Gắn fbMid vào attachment của tin nhắn cha để nhận diện quote reply mà không sinh tin nhắn trùng lặp
    if (fbMid) {
      if (parentMessageId) {
        await Message.updateOne(
          { _id: parentMessageId, 'attachments.url': normalizedUrl },
          { $set: { 'attachments.$.external_message_id': fbMid } }
        );
      } else if (conversationId) {
        // Chỉ tạo tin nhắn rời nếu không có parentMessageId
        await Message.create({
          conversation_id: conversationId,
          sender_type: 'AI_BOT',
          sender_id: null,
          content: '[Hình ảnh sản phẩm]',
          attachments: [{ type: 'image', url: normalizedUrl, external_message_id: fbMid }],
          external_message_id: fbMid,
          is_read: true
        });
      }
    }
  } catch (imgErr) {
    console.warn('[Facebook Send Image Warn]', imgErr.message);
  }
};

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
  customerImageUrls = [],
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
    const targetPsid = senderPsid || conversation.customer_id?.psid;

    // 1. Quét tìm kịch bản của chủ shop khớp với tin nhắn
    const matchedScenario = await matchIncomingMessageToScenario({
      business_id,
      channel_id,
      messageText,
      isFirstMessage
    });

    if (matchedScenario) {
      console.log(`[Bot Engine] 🎯 Khớp Kịch bản của chủ shop: "${matchedScenario.scenario_name}" (Action: ${matchedScenario.action_type})`);

      // Giải mã biến dữ liệu động trong nội dung kịch bản
      const draft = conversation.order_draft || {};
      const dynamicContext = {
        customer_name: conversation.customer_id?.full_name || 'anh/chị',
        phone: conversation.customer_id?.phone || draft.phone || '',
        shipping_address: conversation.customer_id?.shipping_address || draft.shipping_address || '',
        product_name: draft.product_name || '',
        size: draft.size || '',
        color: draft.color || '',
        quantity: draft.quantity || 1,
        price: draft.price || 0,
        total_amount: draft.price ? draft.price * (draft.quantity || 1) : 0,
        shop_name: channel?.page_name || 'Shop',
        hotline: ''
      };
      const replyContent = renderDynamicVariables(matchedScenario.response_content || '', dynamicContext);

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
      const allImages = Array.isArray(matchedScenario.image_urls) && matchedScenario.image_urls.length > 0
        ? matchedScenario.image_urls
        : (matchedScenario.image_url ? [matchedScenario.image_url] : []);

      if (replyContent || allImages.length > 0) {
        const botMessage = await Message.create({
          conversation_id: conversation._id,
          sender_type: 'AI_BOT',
          sender_id: null,
          content: replyContent || '[Hình ảnh đính kèm]',
          attachments: allImages.map((u) => ({ type: 'image', url: u })),
          is_read: true
        });

        conversation.last_message_content = replyContent || '[Hình ảnh đính kèm]';
        conversation.last_message_text = replyContent || '[Hình ảnh đính kèm]';
        conversation.last_message_at = new Date();
        conversation.unread_count = 0; // Bot kịch bản đã trả lời thành công cho khách hàng
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
        if (pageToken && targetPsid) {
          // 1. Gửi tin nhắn văn bản
          if (replyContent) {
            try {
              await axios.post(
                `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
                {
                  recipient: { id: targetPsid },
                  message: { text: replyContent }
                },
                { timeout: 7000 }
              );
              console.log(`[Facebook Send API] Bot đã gửi kịch bản "${matchedScenario.scenario_name}" đến PSID ${targetPsid}`);
            } catch (fbSendErr) {
              const fbErrMsg = fbSendErr.response?.data?.error?.message || fbSendErr.message;
              const fbErrCode = fbSendErr.response?.data?.error?.code;
              console.error(`[Facebook Send Bot Reply Error ${fbErrCode || ''}]`, fbErrMsg);

              if (botMessage?._id) {
                try {
                  const updatedMsg = await Message.findByIdAndUpdate(
                    botMessage._id,
                    {
                      $set: {
                        metadata: {
                          send_status: 'FAILED',
                          error_code: fbErrCode,
                          error_message: fbErrCode === 190
                            ? 'Token Fanpage Facebook đã hết hạn. Vui lòng kết nối lại Fanpage.'
                            : fbErrMsg
                        }
                      }
                    },
                    { new: true }
                  );
                  const io = getIO();
                  if (io) io.to(conversation._id.toString()).emit('message_updated', updatedMsg);
                } catch (uErr) {}
              }

              if (fbErrCode === 190 && channel_id) {
                await Channel.findByIdAndUpdate(channel_id, { is_connected: false });
                try {
                  const io = getIO();
                  if (io && business_id) {
                    io.emit('channel:token_expired', {
                      channel_id,
                      page_name: channel?.page_name,
                      error_message: 'Token Fanpage Facebook đã hết hạn. Vui lòng kết nối lại Fanpage.'
                    });
                  }
                } catch (sErr) {}
              }
            }
          }

          // 2. Gửi danh sách hình ảnh đính kèm (hỗ trợ nhiều ảnh/album)
          for (const imgUrl of allImages) {
            await sendFacebookImage(imgUrl, targetPsid, pageToken, conversation._id, botMessage?._id);
          }
        }
      }

      return {
        handled: true,
        scenario: matchedScenario.scenario_name,
        action: matchedScenario.action_type
      };
    }

    // 2. Không khớp kịch bản cứng của chủ shop -> Chuyển giao sang Trợ lý AI Gemini tư vấn & chốt đơn!
    console.log(`[Bot Engine] 🤖 Không khớp kịch bản cứng -> Kích hoạt Trợ lý AI Gemini tư vấn cho: "${messageText}"`);

    const aiResult = await processGeminiAIForMessage({
      business_id,
      channel_id,
      conversation_id,
      customer_id,
      senderPsid: targetPsid,
      messageText,
      customerImageUrls
    });

    if (aiResult.handled && pageToken && targetPsid) {
      if (aiResult.reply) {
        // Gửi câu trả lời của AI đến Facebook Messenger của khách qua Meta Graph Send API
        try {
          await axios.post(
            `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`,
            {
              recipient: { id: targetPsid },
              message: { text: aiResult.reply }
            },
            { timeout: 8000 }
          );
          console.log(`[Facebook Send API] AI Gemini đã gửi tin nhắn tư vấn thành công đến PSID ${targetPsid}`);
        } catch (fbErr) {
          const fbErrMsg = fbErr.response?.data?.error?.message || fbErr.message;
          const fbErrCode = fbErr.response?.data?.error?.code;
          console.error(`[Facebook Send AI Error ${fbErrCode || ''}]`, fbErrMsg);

          if (aiResult.message_id) {
            try {
              const updatedMsg = await Message.findByIdAndUpdate(
                aiResult.message_id,
                {
                  $set: {
                    metadata: {
                      send_status: 'FAILED',
                      error_code: fbErrCode,
                      error_message: fbErrCode === 190
                        ? 'Token Fanpage Facebook đã hết hạn. Vui lòng kết nối lại Fanpage.'
                        : fbErrMsg
                    }
                  }
                },
                { new: true }
              );
              const io = getIO();
              if (io) io.to(conversation_id.toString()).emit('message_updated', updatedMsg);
            } catch (uErr) {}
          }

          if (fbErrCode === 190 && channel_id) {
            await Channel.findByIdAndUpdate(channel_id, { is_connected: false });
            try {
              const io = getIO();
              if (io && business_id) {
                io.emit('channel:token_expired', {
                  channel_id,
                  page_name: channel?.page_name,
                  error_message: 'Token Fanpage Facebook đã hết hạn. Vui lòng kết nối lại Fanpage.'
                });
              }
            } catch (sErr) {}
          }
        }
      }

      // Gửi kèm hình ảnh sản phẩm nếu AI có trả về (tối đa 3 ảnh để tránh rate limit)
      if (Array.isArray(aiResult.image_urls) && aiResult.image_urls.length > 0) {
        const imagesToSend = aiResult.image_urls.slice(0, 3);
        for (const imgUrl of imagesToSend) {
          await sendFacebookImage(imgUrl, targetPsid, pageToken, conversation_id, aiResult.message_id);
        }
      }
    }

    return aiResult;
  } catch (error) {
    console.error('[Bot Engine Error]', error);
    return { handled: false, error: error.message };
  }
};
