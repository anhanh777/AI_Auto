import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIConfig,
  Product,
  KnowledgeBase,
  Message,
  Conversation,
  Customer,
  Channel
} from '../models/index.js';
import { createOrderService } from './order.service.js';
import { getIO } from '../config/socket.config.js';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey && apiKey !== 'your_gemini_api_key_here' ? new GoogleGenerativeAI(apiKey) : null;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

/**
 * 1. Tổng hợp dữ liệu RAG Context (Knowledge Base + Sản phẩm còn hàng + Cấu hình AI + Lịch sử chat)
 */
export const buildRAGContext = async ({ business_id, conversation_id, channel_id = null }) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  const [aiConfig, products, knowledgeList, recentMessages] = await Promise.all([
    // A. Cấu hình AI của Business
    AIConfig.findOne({ business_id, channel_id: channel_id || null }).lean(),

    // B. Danh mục sản phẩm đang mở bán kèm tồn kho
    Product.find({ business_id, status: 'ACTIVE' })
      .select('product_name sku base_price sale_price stock_available variants_json ai_selling_points description')
      .limit(60)
      .lean(),

    // C. Kho tri thức FAQ & Chính sách
    KnowledgeBase.find({ business_id, is_active: true })
      .select('title category content')
      .lean(),

    // D. Lịch sử 8 tin nhắn gần nhất
    conversation_id
      ? Message.find({ conversation_id })
          .sort({ created_at: -1 })
          .limit(8)
          .lean()
      : []
  ]);

  // Đảo lại lịch sử theo thứ tự thời gian cũ -> mới
  const sortedHistory = recentMessages.reverse();

  // Chuẩn hóa danh mục sản phẩm thành text tóm tắt
  const productContextText = products.map((p) => {
    const price = p.sale_price || p.base_price;
    const variantsStr = Array.isArray(p.variants_json) && p.variants_json.length > 0
      ? p.variants_json.map((v) => `${v.size || ''}/${v.color || ''} (còn ${v.stock || 0})`).join(', ')
      : 'Không có biến thể';
    return `- [SKU: ${p.sku}] ${p.product_name} | Giá: ${price.toLocaleString('vi-VN')} VND | Tồn khả dụng: ${p.stock_available} | Biến thể: ${variantsStr} | Đặc điểm: ${p.ai_selling_points || p.description || ''}`;
  }).join('\n');

  // Chuẩn hóa tri thức shop
  const knowledgeContextText = knowledgeList.map((k) => {
    return `- [${k.category}] ${k.title}: ${k.content}`;
  }).join('\n');

  // Chuẩn hóa lịch sử chat
  const chatHistoryText = sortedHistory.map((m) => {
    const role = m.sender_type === 'CUSTOMER' ? 'Khách hàng' : 'Nhân viên/Bot';
    return `${role}: ${m.content}`;
  }).join('\n');

  return {
    aiConfig: aiConfig || {
      bot_name: 'Trợ lý AI',
      ai_persona_tone: 'FRIENDLY',
      system_prompt: 'Bạn là chuyên viên tư vấn bán hàng chuyên nghiệp, tận tâm và chu đáo.',
      welcome_message: 'Dạ shop xin chào bạn ạ!',
      guardrail_blocklist: ['lừa đảo', 'hoàn tiền gấp', 'hàng giả', 'đối thủ'],
      smart_delay_seconds: 2,
      auto_order_extraction: true
    },
    productContextText: productContextText || 'Hiện tại chưa có sản phẩm nào trong kho.',
    knowledgeContextText: knowledgeContextText || 'Chưa có tài liệu FAQ bổ sung.',
    chatHistoryText: chatHistoryText || 'Đây là tin nhắn đầu tiên của khách.',
    rawProducts: products
  };
};

/**
 * 2. Phân tích tin nhắn bằng Google Gemini 1.5 kết hợp RAG & Bóc tách Đơn hàng
 */
export const consultWithGeminiAI = async ({
  business_id,
  conversation_id,
  customer_id,
  messageText,
  channel_id = null
}) => {
  // A. Nạp ngữ cảnh RAG
  const ragContext = await buildRAGContext({ business_id, conversation_id, channel_id });
  const { aiConfig, productContextText, knowledgeContextText, chatHistoryText, rawProducts } = ragContext;

  // B. Kiểm tra Guardrail từ khóa cấm từ cấu hình chủ shop
  const blocklist = Array.isArray(aiConfig.guardrail_blocklist) ? aiConfig.guardrail_blocklist : [];
  const lowerMsg = (messageText || '').toLowerCase();
  const matchedBlockedWord = blocklist.find((word) => word && lowerMsg.includes(word.toLowerCase().trim()));

  if (matchedBlockedWord) {
    console.log(`[Gemini AI] ⚠️ Phát hiện từ khóa nhạy cảm trong Guardrails: "${matchedBlockedWord}" -> Bàn giao nhân viên`);
    return {
      reply: 'Dạ em xin phép chuyển tiếp cuộc trò chuyện của anh/chị đến bộ phận chuyên viên hỗ trợ trực tiếp. Chuyên viên của shop sẽ phản hồi anh/chị ngay trong giây lát ạ!',
      is_order_intent: false,
      order_data: null,
      handover_to_staff: true,
      handover_reason: `Khách đề cập từ khóa nhạy cảm: "${matchedBlockedWord}"`
    };
  }

  // C. Nếu chưa cấu hình Google Gemini API Key -> Dùng bộ mô phỏng thông minh (Smart Mock AI)
  if (!genAI) {
    console.log('[Gemini AI] ⚠️ Chưa cài đặt GEMINI_API_KEY trong file .env, kích hoạt Smart Simulation Engine');
    return generateSmartFallbackResponse({
      messageText,
      aiConfig,
      rawProducts,
      chatHistoryText
    });
  }

  // D. Xây dựng System Prompt chuyên biệt cho Tư vấn & Chốt đơn
  const systemInstruction = `
Bạn là ${aiConfig.bot_name || 'Trợ lý AI tư vấn bán hàng'}, đại diện cho cửa hàng.
Phong cách giao tiếp của bạn: ${aiConfig.ai_persona_tone || 'FRIENDLY, LỊCH SỰ, CHU ĐÁO VÀ CHUYÊN NGHIỆP'}.
Lời căn dặn của chủ shop: "${aiConfig.system_prompt || ''}"

=== THÔNG TIN SẢN PHẨM & TỒN KHO THỰC TẾ (RAG) ===
${productContextText}

=== CHÍNH SÁCH BÁN HÀNG & KHO TRI THỨC (FAQ) ===
${knowledgeContextText}

=== LỊCH SỬ HỘI THOẠI GẦN ĐÂY ===
${chatHistoryText}

=== NHIỆM VỤ CỦA BẠN ===
1. Trả lời tin nhắn mới nhất của khách hàng một cách tự nhiên, lễ phép, tư vấn chính xác size, màu sắc, ưu đãi dựa trên dữ liệu sản phẩm ở trên. KHÔNG bịa đặt sản phẩm không có trong danh sách.
2. NHẬN DIỆN VÀ BÓC TÁCH ĐƠN HÀNG (Order Extraction):
   - Nếu khách hàng có ý định đặt mua (ví dụ để lại thông tin: mua hàng, tên, sđt, địa chỉ, số lượng, size, màu):
   - Hãy bóc tách chi tiết: tên người nhận, số điện thoại, địa chỉ nhận hàng, mã SKU/tên sản phẩm, size, màu, số lượng.
   - Nếu khách mới chỉ nói muốn mua mà thiếu thông tin (ví dụ chưa cho SĐT hoặc địa chỉ), hãy trả lời khéo léo để xin nốt thông tin còn thiếu.
3. PHÁT HIỆN YÊU CẦU GẶP NHÂN VIÊN (Handover):
   - Nếu khách yêu cầu gặp người thật, khiếu nại gay gắt hoặc tức giận, đặt "handover_to_staff": true.

=== ĐỊNH DẠNG ĐẦU RA BẮT BUỘC ===
Bạn PHẢI trả về duy nhất 1 chuỗi JSON hợp lệ (không kèm Markdown code block) theo schema sau:
{
  "reply": "Nội dung tin nhắn bạn sẽ gửi lại cho khách hàng bằng tiếng Việt",
  "is_order_intent": true | false,
  "order_data": null hoặc {
    "customer_name": "Tên khách hàng",
    "phone": "Số điện thoại 10 số sạch",
    "shipping_address": "Địa chỉ giao hàng đầy đủ",
    "items": [
      {
        "sku": "Mã SKU của sản phẩm",
        "product_name": "Tên sản phẩm",
        "size": "Size nếu có",
        "color": "Màu nếu có",
        "quantity": 1
      }
    ],
    "customer_note": "Ghi chú giao hàng nếu có"
  },
  "missing_fields": ["phone", "shipping_address", "variant"],
  "handover_to_staff": false | true,
  "handover_reason": null hoặc "Lý do bàn giao"
}
`;

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4
      }
    });

    const prompt = `${systemInstruction}\n\nTin nhắn mới từ khách hàng: "${messageText}"`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const parsed = JSON.parse(responseText.trim());
    return {
      reply: parsed.reply || 'Dạ shop xin chào bạn! Shop có thể hỗ trợ gì cho bạn hôm nay ạ?',
      is_order_intent: Boolean(parsed.is_order_intent),
      order_data: parsed.order_data || null,
      missing_fields: Array.isArray(parsed.missing_fields) ? parsed.missing_fields : [],
      handover_to_staff: Boolean(parsed.handover_to_staff),
      handover_reason: parsed.handover_reason || null
    };
  } catch (apiErr) {
    console.error('[Gemini API Call Error]', apiErr.message);
    // Khi gọi API Gemini thất bại (hết quota, mạng chập chờn...), dùng Fallback
    return generateSmartFallbackResponse({
      messageText,
      aiConfig,
      rawProducts,
      chatHistoryText
    });
  }
};

/**
 * 3. Bộ mô phỏng AI thông minh (Smart Fallback Engine) khi chưa có API Key
 * Sử dụng Regex + Heuristic NLP để tự động phát hiện số điện thoại, địa chỉ và đơn hàng
 */
const generateSmartFallbackResponse = ({ messageText, aiConfig, rawProducts, chatHistoryText }) => {
  const text = (messageText || '').trim();
  const lower = text.toLowerCase();

  // Phát hiện SĐT Việt Nam (10 số bắt đầu bằng 03, 05, 07, 08, 09)
  const phoneMatch = text.match(/(0[3|5|7|8|9][0-9]{8})\b/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // Phát hiện từ khóa địa chỉ
  const hasAddress = lower.includes('số') || lower.includes('ngõ') || lower.includes('đường') ||
    lower.includes('phường') || lower.includes('quận') || lower.includes('hà nội') ||
    lower.includes('hcm') || lower.includes('tp') || lower.includes('thị trấn') || lower.includes('thôn');

  // Khớp sản phẩm gần nhất trong kho
  let matchedProduct = null;
  for (const p of rawProducts) {
    const pName = (p.product_name || '').toLowerCase();
    const pSku = (p.sku || '').toLowerCase();
    if (lower.includes(pName) || (pSku && lower.includes(pSku))) {
      matchedProduct = p;
      break;
    }
  }

  // A. Trường hợp khách để lại SĐT và địa chỉ -> Chốt đơn
  if (phone && (hasAddress || lower.includes('ship') || lower.includes('lấy') || lower.includes('đặt'))) {
    const p = matchedProduct || rawProducts[0];
    return {
      reply: `Dạ em cảm ơn anh/chị đã để lại thông tin đặt hàng ạ! Em đã ghi nhận đơn hàng ${p ? `"${p.product_name}"` : 'sản phẩm'} với số điện thoại ${phone}. Chuyên viên của shop sẽ liên hệ xác nhận đơn và giao hàng cho anh/chị sớm nhất nhé!`,
      is_order_intent: true,
      order_data: {
        customer_name: 'Khách hàng',
        phone,
        shipping_address: text.replace(phone, '').trim(),
        items: p
          ? [
              {
                sku: p.sku,
                product_name: p.product_name,
                size: 'Tiêu chuẩn',
                color: 'Mặc định',
                quantity: 1
              }
            ]
          : [],
        customer_note: text
      },
      missing_fields: [],
      handover_to_staff: false,
      handover_reason: null
    };
  }

  // B. Trường hợp hỏi giá hoặc tư vấn
  if (lower.includes('giá') || lower.includes('nhiêu') || lower.includes('bao tiền')) {
    if (matchedProduct) {
      const price = (matchedProduct.sale_price || matchedProduct.base_price || 0).toLocaleString('vi-VN');
      return {
        reply: `Dạ sản phẩm "${matchedProduct.product_name}" hiện đang có giá ưu đãi là ${price} VND ạ! Anh/chị cần em tư vấn thêm về size hay cách dùng không ạ?`,
        is_order_intent: false,
        order_data: null,
        missing_fields: [],
        handover_to_staff: false
      };
    }
  }

  // C. Phản hồi chào mừng và tư vấn chung
  const sampleProducts = rawProducts.slice(0, 3).map((p) => p.product_name).join(', ');
  return {
    reply: `Dạ shop xin chào anh/chị ạ! Hiện tại shop đang có các mẫu nổi bật như: ${sampleProducts || 'sản phẩm hot'}. Anh/chị đang quan tâm đến dòng nào để em hỗ trợ tư vấn chi tiết size và ưu đãi cho mình ạ?`,
    is_order_intent: false,
    order_data: null,
    missing_fields: [],
    handover_to_staff: false
  };
};

/**
 * 4. Xử lý toàn diện luồng AI: Tư vấn + Tạo Đơn Hàng PENDING + Socket.IO thông báo
 */
export const processGeminiAIForMessage = async ({
  business_id,
  channel_id,
  conversation_id,
  customer_id,
  senderPsid,
  messageText
}) => {
  if (!business_id || !conversation_id) return { handled: false };

  try {
    const conversation = await Conversation.findById(conversation_id)
      .populate('channel_id')
      .populate('customer_id');

    if (!conversation) return { handled: false };

    // Nếu cuộc trò chuyện đang tắt bot (nhân viên đã tiếp quản) -> Không can thiệp
    if (conversation.is_bot_active === false) {
      return { handled: false, reason: 'STAFF_TAKEN_OVER' };
    }

    // 1. Phân tích qua Gemini AI
    const aiResult = await consultWithGeminiAI({
      business_id,
      channel_id,
      conversation_id,
      customer_id,
      messageText
    });

    let finalReply = aiResult.reply || 'Dạ em chào anh/chị, em có thể hỗ trợ gì cho mình ạ?';

    // 2. Nếu AI phát hiện đủ điều kiện tạo ĐƠN HÀNG (is_order_intent = true)
    let createdOrder = null;
    if (aiResult.is_order_intent && aiResult.order_data && aiResult.order_data.phone) {
      try {
        const orderInfo = aiResult.order_data;
        const itemsToCreate = [];

        // Tìm kiếm chính xác ID và giá sản phẩm trong DB
        if (Array.isArray(orderInfo.items) && orderInfo.items.length > 0) {
          for (const it of orderInfo.items) {
            const foundProduct = await Product.findOne({
              business_id,
              $or: [{ sku: it.sku }, { product_name: it.product_name }]
            });

            if (foundProduct) {
              const unitPrice = foundProduct.sale_price || foundProduct.base_price || 0;
              itemsToCreate.push({
                product_id: foundProduct._id,
                variant_sku: foundProduct.sku,
                product_name: foundProduct.product_name,
                size: it.size || '',
                color: it.color || '',
                quantity: Number(it.quantity) || 1,
                unit_price: unitPrice,
                price: unitPrice
              });
            }
          }
        }

        // Tạo đơn hàng ở trạng thái PENDING
        if (itemsToCreate.length > 0 || orderInfo.shipping_address) {
          createdOrder = await createOrderService(
            {
              business_id,
              channel_id: channel_id || null,
              customer_id: customer_id || null,
              customer_name: orderInfo.customer_name || 'Khách hàng',
              shipping_customer_name: orderInfo.customer_name || 'Khách hàng',
              customer_phone: orderInfo.phone,
              shipping_phone: orderInfo.phone,
              shipping_address: orderInfo.shipping_address || 'Địa chỉ đang cập nhật',
              order_items: itemsToCreate,
              order_status: 'PENDING',
              status: 'PENDING',
              order_source: 'FACEBOOK_AI',
              note: `Đơn hàng tự động trích xuất bởi Trợ lý AI Gemini: "${orderInfo.customer_note || messageText}"`
            },
            null
          );

          console.log(`[Gemini AI] 🛒 ĐÃ TỰ ĐỘNG TẠO ĐƠN HÀNG THÀNH CÔNG: Mã #${createdOrder.order_code}`);
          finalReply += `\n\n(Dạ em đã tạo đơn hàng thành công với mã #${createdOrder.order_code}. Shop sẽ sớm liên hệ xác nhận và giao hàng ạ!)`;
        }
      } catch (orderErr) {
        console.error('[Gemini AI Order Creation Error]', orderErr.message);
      }
    }

    // 3. Nếu AI yêu cầu bàn giao nhân viên (Handover)
    if (aiResult.handover_to_staff) {
      conversation.is_bot_active = false;
      conversation.conversation_status = 'PENDING_STAFF';
      await conversation.save();
    }

    // 4. Lưu câu trả lời của AI vào Collection messages
    const aiMessage = await Message.create({
      conversation_id: conversation._id,
      sender_type: 'AI_BOT',
      sender_id: null,
      content: finalReply,
      attachments: [],
      is_read: true
    });

    conversation.last_message_content = finalReply;
    conversation.last_message_text = finalReply;
    conversation.last_message_at = new Date();
    await conversation.save();

    // 5. Cập nhật thông tin khách hàng nếu AI bóc tách được SĐT
    if (aiResult.order_data?.phone && customer_id) {
      await Customer.findByIdAndUpdate(customer_id, {
        $set: {
          phone: aiResult.order_data.phone,
          phone_number: aiResult.order_data.phone,
          shipping_address: aiResult.order_data.shipping_address || undefined
        },
        $addToSet: { tags: 'Khách để lại SĐT' }
      });
    }

    // 6. Phát Socket.IO cho màn hình LiveChat
    try {
      const io = getIO();
      io.to(conversation._id.toString()).emit('new_message', aiMessage);
      io.to(business_id.toString()).emit('conversation_updated', conversation);
    } catch (sockErr) {
      console.warn('[Gemini AI Socket Warn]', sockErr.message);
    }

    return {
      handled: true,
      reply: finalReply,
      order: createdOrder,
      handover: aiResult.handover_to_staff
    };
  } catch (error) {
    console.error('[Process Gemini AI Error]', error);
    return { handled: false, error: error.message };
  }
};
