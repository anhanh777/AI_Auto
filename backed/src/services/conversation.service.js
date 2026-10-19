import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { Conversation, Message, Customer, Order, OrderDetail, Product } from '../models/index.js';
import { getIO } from '../config/socket.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadBaseDir = path.resolve(__dirname, '../../uploads');

export const computeConversationTags = ({
  currentTags = [],
  customerPhone = null,
  activeOrders = [],
  activeOrderDetails = [],
  allProductsMap = new Map()
}) => {
  const nextTags = [];

  // 1. Số điện thoại (>= 10 chữ số)
  const cleanPhone = customerPhone ? String(customerPhone).replace(/\D/g, '') : '';
  if (cleanPhone.length >= 10) {
    nextTags.push('Có SĐT');
  }

  // 2. Trạng thái Đơn hàng & Sản phẩm
  if (activeOrders.length > 0) {
    nextTags.push('Đã đặt hàng');
    if (activeOrders.length > 1) {
      nextTags.push('Mua lại');
    } else {
      nextTags.push('Khách mới');
    }

    // Thêm các sản phẩm thuộc các đơn hàng còn hiệu lực (từ cả OrderDetail và order_items)
    const orderProductNames = [
      ...activeOrderDetails.map((d) => (d.product_name || '').trim()),
      ...activeOrders.flatMap((o) => (o.order_items || []).map((it) => (it.product_name || it.name || '').trim()))
    ].filter(Boolean);

    for (const pName of orderProductNames) {
      if (!nextTags.includes(pName)) {
        nextTags.push(pName);
      }
    }
  } else {
    // Không còn đơn hàng nào hoạt động -> gán Khách mới
    nextTags.push('Khách mới');
  }

  // Tập hợp các tên sản phẩm active (để lọc thẻ sản phẩm cũ của đơn đã xóa)
  const activeProductSet = new Set([
    ...activeOrderDetails.map((d) => (d.product_name || '').trim().toLowerCase()),
    ...activeOrders.flatMap((o) => (o.order_items || []).map((it) => (it.product_name || it.name || '').trim().toLowerCase()))
  ].filter(Boolean));

  // 3. Giữ lại thẻ thủ công do nhân viên tự gán, đồng thời gỡ thẻ hệ thống cũ & thẻ sản phẩm đã xóa
  for (const tag of currentTags || []) {
    const trimmed = (tag || '').trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    // Bỏ qua nhãn hệ thống (đã được tính toán lại chính xác ở trên)
    if (['có sđt', 'đã đặt hàng', 'khách mới', 'mua lại'].includes(lower)) {
      continue;
    }

    // Nếu nhãn là tên một sản phẩm trong cửa hàng:
    if (allProductsMap.has(lower)) {
      // Chỉ giữ nếu sản phẩm đó vẫn còn nằm trong đơn hàng active!
      if (activeProductSet.has(lower) && !nextTags.includes(trimmed)) {
        nextTags.push(trimmed);
      }
    } else {
      // Thẻ tùy chỉnh nhân viên gán (VIP, Khách quen, Khó tính, Ưu tiên...) -> luôn giữ lại
      if (!nextTags.includes(trimmed)) {
        nextTags.push(trimmed);
      }
    }
  }

  return nextTags;
};

export const getConversationsService = async ({ business_id, channel_id, search, tag }) => {
  const query = {};
  if (business_id) query.business_id = business_id;
  if (channel_id) query.channel_id = channel_id;
  if (tag) query.tags = tag;

  let conversations = await Conversation.find(query)
    .populate('customer_id')
    .populate('channel_id')
    .sort({ last_message_at: -1 });

  // Tự động kiểm tra và đồng bộ thẻ nhãn dựa trên dữ liệu thực tế (Phone, Order, Product)
  if (conversations.length > 0) {
    try {
      const customerIds = conversations.map((c) => c.customer_id?._id).filter(Boolean);
      const convIds = conversations.map((c) => c._id);

      const prodFilter = business_id ? { business_id } : {};
      const [allProducts, orders] = await Promise.all([
        Product.find(prodFilter).select('product_name sku').lean(),
        Order.find({
          $or: [
            { customer_id: { $in: customerIds } },
            { conversation_id: { $in: convIds } }
          ],
          order_status: { $nin: ['CANCELLED'] },
          status: { $nin: ['CANCELLED'] }
        }).lean()
      ]);

      const allProductsMap = new Map();
      allProducts.forEach((p) => {
        if (p.product_name) allProductsMap.set(p.product_name.trim().toLowerCase(), p.product_name.trim());
        if (p.sku) allProductsMap.set(p.sku.trim().toLowerCase(), p.sku.trim());
      });

      let orderDetails = [];
      if (orders.length > 0) {
        orderDetails = await OrderDetail.find({ order_id: { $in: orders.map((o) => o._id) } }).lean();
      }

      for (const conv of conversations) {
        const custOrders = orders.filter((o) =>
          (o.customer_id && String(o.customer_id) === String(conv.customer_id?._id)) ||
          (o.conversation_id && String(o.conversation_id) === String(conv._id))
        );
        const cOrderIds = custOrders.map((o) => String(o._id));
        const custDetails = orderDetails.filter((d) => cOrderIds.includes(String(d.order_id)));

        let draftReset = false;
        if (custOrders.length === 0 && conv.order_draft?.status === 'ORDER_CREATED') {
          conv.order_draft.status = 'CANCELLED';
          draftReset = true;
        }

        const nextTags = computeConversationTags({
          currentTags: conv.tags || [],
          customerPhone: conv.customer_id?.phone || (conv.order_draft?.status !== 'CANCELLED' ? conv.order_draft?.phone : null),
          activeOrders: custOrders,
          activeOrderDetails: custDetails,
          allProductsMap
        });

        const isSame =
          Array.isArray(conv.tags) &&
          conv.tags.length === nextTags.length &&
          conv.tags.every((t, i) => t === nextTags[i]);

        if (!isSame || draftReset) {
          conv.tags = nextTags;
          Conversation.updateOne(
            { _id: conv._id },
            { $set: { tags: nextTags, ...(draftReset ? { 'order_draft.status': 'CANCELLED' } : {}) } }
          ).catch(() => {});

          if (conv.customer_id?._id) {
            Customer.updateOne(
              { _id: conv.customer_id._id },
              { $set: { tags: nextTags, customer_tags: nextTags } }
            ).catch(() => {});
          }
        }
      }
    } catch (syncErr) {
      console.warn('[Sync Conversation Tags Error]', syncErr.message);
    }
  }

  if (search) {
    const q = search.toLowerCase();
    conversations = conversations.filter(c =>
      c.customer_id?.full_name?.toLowerCase().includes(q) ||
      c.last_message_text?.toLowerCase().includes(q)
    );
  }

  // Tự động kiểm tra và làm sạch unread_count: nếu tin nhắn cuối cùng là của Shop/Bot AI thì không còn tin tồn đọng
  if (conversations.length > 0) {
    for (const conv of conversations) {
      if (conv.unread_count > 0) {
        try {
          const lastMsg = await Message.findOne({ conversation_id: conv._id }).sort({ created_at: -1 }).select('sender_type').lean();
          if (lastMsg && (lastMsg.sender_type === 'AI_BOT' || lastMsg.sender_type === 'STAFF')) {
            conv.unread_count = 0;
            Conversation.updateOne({ _id: conv._id }, { $set: { unread_count: 0 } }).catch(() => {});
          }
        } catch (e) {}
      }
    }
  }

  return conversations;
};

export const getMessagesService = async (conversationId) => {
  const [messages] = await Promise.all([
    Message.find({ conversation_id: conversationId }).sort({ created_at: 1 }),
    // Đánh dấu tất cả tin nhắn trong hội thoại là đã đọc
    Message.updateMany(
      { conversation_id: conversationId, is_read: false },
      { $set: { is_read: true } }
    ),
    // Reset unread_count về 0 trong Conversation
    Conversation.findByIdAndUpdate(
      conversationId,
      { $set: { unread_count: 0 } }
    )
  ]);

  try {
    const io = getIO();
    if (io) {
      io.to(conversationId.toString()).emit('conversation_read', { conversation_id: conversationId });
      io.emit('conversation_updated', { _id: conversationId, unread_count: 0 });
    }
  } catch (sockErr) {}

  return messages;
};

export const sendMessageService = async ({ conversation_id, sender_type = 'STAFF', sender_id, content, attachments = [] }) => {
  const message = await Message.create({
    conversation_id,
    sender_type,
    sender_id,
    content,
    attachments,
    is_read: true
  });

  const updatedConv = await Conversation.findByIdAndUpdate(
    conversation_id,
    {
      last_message_content: content,
      last_message_text: content,
      last_message_at: new Date(),
      unread_count: 0
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
            const fbErrMsg = textErr.response?.data?.error?.message || textErr.message;
            const fbErrCode = textErr.response?.data?.error?.code;
            const fbErrSubcode = textErr.response?.data?.error?.error_subcode;
            console.error(`[Facebook Send Text Error ${fbErrCode || ''} (subcode: ${fbErrSubcode || 'none'})]`, fbErrMsg);

            const isRestricted = fbErrCode === 10 || fbErrSubcode === 1893063 || (typeof fbErrMsg === 'string' && fbErrMsg.toLowerCase().includes('hạn chế'));
            let descriptiveError = fbErrMsg;
            if (fbErrCode === 190) {
              descriptiveError = 'Token Fanpage Facebook đã hết hạn. Vui lòng kết nối lại Fanpage.';
            } else if (isRestricted) {
              descriptiveError = 'Facebook tạm thời hạn chế gửi tin nhắn từ Fanpage này. Vui lòng thử lại sau.';
            }

            message.metadata = {
              ...message.metadata,
              send_status: 'FAILED',
              error_code: fbErrCode,
              error_subcode: fbErrSubcode,
              error_message: descriptiveError
            };
            await message.save();

            if (fbErrCode === 190 && updatedConv.channel_id?._id) {
              await Channel.findByIdAndUpdate(updatedConv.channel_id._id, { is_connected: false });
            }
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

/**
 * Đồng bộ hai chiều toàn diện thẻ nhãn theo dữ liệu thực tế (True State Synchronization):
 * - Nếu không còn đơn hàng nào (do xóa hoặc hủy đơn) -> tự động GỠ "Đã đặt hàng", GỠ "Mua lại", GỠ thẻ sản phẩm của đơn đã xóa, và gắn lại "Khách mới".
 * - Nếu có đơn hàng -> tự động GÁN "Đã đặt hàng", trích xuất sản phẩm, phân loại Mua lại / Khách mới.
 * - SĐT: Có SĐT -> GÁN "Có SĐT", không có -> GỠ "Có SĐT".
 */
export const syncConversationTagsFromData = async (conversationId) => {
  try {
    const conversation = await Conversation.findById(conversationId)
      .populate('customer_id')
      .populate('channel_id');
    if (!conversation) return null;

    const businessId = conversation.business_id;
    const customer = conversation.customer_id;

    // 1. Lấy danh sách sản phẩm của Business để phân biệt thẻ sản phẩm
    const allProducts = await Product.find({ business_id: businessId }).select('product_name sku').lean();
    const allProductsMap = new Map();
    allProducts.forEach((p) => {
      if (p.product_name) allProductsMap.set(p.product_name.trim().toLowerCase(), p.product_name.trim());
      if (p.sku) allProductsMap.set(p.sku.trim().toLowerCase(), p.sku.trim());
    });

    // 2. Lấy danh sách đơn hàng KHÔNG BỊ HỦY của khách/hội thoại này
    const activeOrders = await Order.find({
      $or: [
        { conversation_id: conversation._id },
        ...(customer?._id ? [{ customer_id: customer._id }] : [])
      ],
      order_status: { $nin: ['CANCELLED'] },
      status: { $nin: ['CANCELLED'] }
    }).lean();

    const activeOrderIds = activeOrders.map((o) => o._id);
    const activeDetails = activeOrders.length > 0
      ? await OrderDetail.find({ order_id: { $in: activeOrderIds } }).lean()
      : [];

    // Nếu không còn đơn hàng nào hoạt động, reset order_draft.status nếu trước đó đã là ORDER_CREATED
    let draftStatusChanged = false;
    if (activeOrders.length === 0 && conversation.order_draft?.status === 'ORDER_CREATED') {
      conversation.order_draft.status = 'CANCELLED';
      draftStatusChanged = true;
    }

    const nextTags = computeConversationTags({
      currentTags: conversation.tags || [],
      customerPhone: customer?.phone || (conversation.order_draft?.status !== 'CANCELLED' ? conversation.order_draft?.phone : null),
      activeOrders,
      activeOrderDetails: activeDetails,
      allProductsMap
    });

    conversation.tags = nextTags;
    if (draftStatusChanged) {
      conversation.markModified('order_draft');
    }
    await conversation.save();

    if (customer?._id) {
      await Customer.findByIdAndUpdate(customer._id, {
        $set: { tags: nextTags, customer_tags: nextTags }
      });
    }

    // Bắn Socket.IO cập nhật real-time ngay
    try {
      const io = getIO();
      if (businessId) {
        io.to(businessId.toString()).emit('conversation_updated', conversation);
      }
      io.emit('conversation_updated', conversation);
      io.emit('conversation_tags_updated', {
        conversation_id: conversation._id,
        tags: nextTags
      });
    } catch (sockErr) {
      // Ignored
    }

    return conversation;
  } catch (err) {
    console.warn('[SyncConversationTagsFromData Error]', err.message);
    return null;
  }
};

/**
 * Tự động phân tích và gán thẻ dựa trên dữ liệu (Phone, Order, Product, Customer History)
 */
export const autoTagConversationService = async (conversationId, options = {}) => {
  return await syncConversationTagsFromData(conversationId);
};
