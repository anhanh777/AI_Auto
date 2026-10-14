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
import { validateAndSanitizePhone, evaluateAddressQuality } from '../helpers/orderValidation.helper.js';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey && apiKey !== 'your_gemini_api_key_here' ? new GoogleGenerativeAI(apiKey) : null;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

/**
 * Hàm phân tích và làm sạch Tên người nhận và Địa chỉ giao hàng từ tin nhắn
 */
export const extractNameAndCleanAddress = (text = '', defaultCustomerName = '') => {
  if (!text) {
    return {
      extractedName: defaultCustomerName || 'Khách hàng',
      cleanAddress: '',
      phone: '',
      addressQuality: 'INCOMPLETE',
      customerNote: ''
    };
  }

  // 1. Phân tích & thẩm định số điện thoại qua helper
  const phoneValidation = validateAndSanitizePhone(text);
  const phone = phoneValidation.isValid ? phoneValidation.phone : '';

  let workingText = text;
  if (phoneValidation.phone) {
    workingText = workingText.replace(phoneValidation.phone, '').trim();
  }

  // 2. Tìm tên xưng hô trong tin nhắn
  let extractedName = '';
  const nameRegexes = [
    /(?:mình là|tên là|tên tớ là|tên em là|tên e là|tên tôi là|tên:|người nhận:?|giao cho:?)\s+([A-ZÀ-Ỹa-zà-ỹ\s]+?)(?:[,.\n]|\s+sđt|\s+sdt|\s+ở|\s+địa chỉ|\s+về|$)/i,
    /(?:anh|chị)\s+([A-ZÀ-Ỹa-zà-ỹ]+)(?:\s+lấy|\s+sđt|\s+sdt|\s+ở|\s+địa chỉ|\s+về|,|\.|$)/i
  ];

  for (const rg of nameRegexes) {
    const m = workingText.match(rg);
    if (m && m[1]) {
      const cand = m[1].trim();
      if (!['khách hàng', 'shop', 'mình', 'em', 'anh', 'chị'].includes(cand.toLowerCase()) && cand.length >= 2) {
        extractedName = cand;
        break;
      }
    }
  }

  if (!extractedName && defaultCustomerName && defaultCustomerName !== 'Khách hàng Facebook') {
    extractedName = defaultCustomerName;
  }
  if (!extractedName) extractedName = 'Khách hàng';

  // 3. Đánh giá chất lượng và làm sạch địa chỉ qua helper
  const addressEval = evaluateAddressQuality(workingText);
  let cleanAddress = addressEval.cleanAddress;

  if (extractedName && extractedName !== defaultCustomerName && extractedName !== 'Khách hàng') {
    cleanAddress = cleanAddress.replace(new RegExp('(?:mình là|tên là|tên tớ là|tên em là|tên:|anh|chị)?\\s*' + extractedName, 'i'), '').trim();
  }

  return {
    extractedName,
    cleanAddress,
    phone,
    addressQuality: addressEval.quality,
    customerNote: addressEval.customerNote,
    addressFeedback: addressEval.feedbackMessage,
    phoneValidation
  };
};

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

  const sortedHistory = recentMessages.reverse();

  const productContextText = products.map((p) => {
    const price = p.sale_price || p.base_price;
    const variantsStr = Array.isArray(p.variants_json) && p.variants_json.length > 0
      ? p.variants_json.map((v) => `${v.size || ''}/${v.color || ''} (còn ${v.stock || 0})`).join(', ')
      : 'Không có biến thể';
    return `- [SKU: ${p.sku}] ${p.product_name} | Giá: ${price.toLocaleString('vi-VN')} VND | Tồn khả dụng: ${p.stock_available} | Biến thể: ${variantsStr} | Đặc điểm: ${p.ai_selling_points || p.description || ''}`;
  }).join('\n');

  const knowledgeContextText = knowledgeList.map((k) => {
    return `- [${k.category}] ${k.title}: ${k.content}`;
  }).join('\n');

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
/**
 * 2. Phân tích tin nhắn bằng Google Gemini 1.5 kết hợp RAG, Biến thể Kho & Bóc tách Đơn hàng Đa bước
 */
export const consultWithGeminiAI = async ({
  business_id,
  conversation_id,
  customer_id,
  messageText,
  channel_id = null,
  customerName = '',
  orderDraft = null
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
    console.log('[Gemini AI] ⚠️ Chưa cài đặt GEMINI_API_KEY trong file .env, kích hoạt Smart Multi-Turn Fallback Engine');
    return generateSmartFallbackResponse({
      messageText,
      aiConfig,
      rawProducts,
      chatHistoryText,
      defaultCustomerName: customerName,
      existingDraft: orderDraft
    });
  }

  // D. Xây dựng System Prompt chuyên biệt cho Tư vấn & Chốt đơn đa bước
  const fallbackCustomerName = customerName || 'Khách hàng';
  const systemInstruction = `
Bạn là ${aiConfig.bot_name || 'Trợ lý AI tư vấn bán hàng'}, đại diện cho cửa hàng.
Phong cách giao tiếp của bạn: ${aiConfig.ai_persona_tone || 'FRIENDLY, LỊCH SỰ, CHU ĐÁO VÀ CHUYÊN NGHIỆP'}.
Tên tài khoản người chat (Facebook): "${fallbackCustomerName}".
Lời căn dặn của chủ shop: "${aiConfig.system_prompt || ''}"

=== THÔNG TIN SẢN PHẨM & TỒN KHO THỰC TẾ (RAG) ===
${productContextText}

=== CHÍNH SÁCH BÁN HÀNG & KHO TRI THỨC (FAQ) ===
${knowledgeContextText}

=== TRẠNG THÁI GIỎ HÀNG TẠM THỜI (ORDER DRAFT HIỆN TẠI) ===
- Sản phẩm đã chọn: ${orderDraft?.product_name || 'Chưa chọn'}
- Size: ${orderDraft?.size || 'Chưa chọn'}
- Màu: ${orderDraft?.color || 'Chưa chọn'}
- Số lượng: ${orderDraft?.quantity || 1}
- SĐT đã lưu: ${orderDraft?.phone || 'Chưa có'}
- Địa chỉ đã lưu: ${orderDraft?.shipping_address || 'Chưa có'}

=== LỊCH SỬ HỘI THOẠI GẦN ĐÂY ===
${chatHistoryText}

=== NHIỆM VỤ CỦA BẠN (QUY TRÌNH THU THẬP THÔNG TIN ĐƠN HÀNG - SLOT FILLING) ===
1. Tư vấn chi tiết, chính xác size, màu sắc, ưu đãi dựa trên dữ liệu sản phẩm ở trên. KHÔNG bịa đặt sản phẩm không có trong danh sách.
2. NGUYÊN TẮC THU THẬP THÔNG TIN TỪNG BƯỚC (Multi-turn Slot Filling):
   - Bước 1 (Biến thể): Nếu khách muốn mua sản phẩm nhưng chưa chọn Size hoặc Màu (và sản phẩm có biến thể trong kho): Hãy hỏi khách size/màu và tư vấn chiều cao cân nặng. Đặt "missing_fields": ["variant"]. TUYỆT ĐỐI KHÔNG tạo đơn khi chưa có size/màu rõ ràng.
   - Bước 2 (SĐT): Nếu đã có sản phẩm + size/màu nhưng chưa có Số điện thoại: Khéo léo xác nhận mẫu và xin số điện thoại di động nhận hàng. Đặt "missing_fields": ["phone"].
   - Bước 3 (Địa chỉ): Nếu đã có SĐT nhưng chưa có Địa chỉ cụ thể (hoặc địa chỉ quá chung chung như 'Hà Nội', 'ở Cầu Giấy'): Ghi nhận SĐT và xin nốt địa chỉ cụ thể (Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP). Đặt "missing_fields": ["shipping_address"].
   - Bước 4 (Chốt đơn): Khi ĐÃ CÓ ĐỦ TẤT CẢ (Sản phẩm, biến thể, SĐT 10 số hợp lệ, Địa chỉ cụ thể): Đặt "is_order_intent": true, "missing_fields": [], và viết câu tóm tắt đơn hàng hoàn chỉnh cho khách.
3. PHÁT HIỆN YÊU CẦU GẶP NHÂN VIÊN (Handover):
   - Nếu khách yêu cầu gặp người thật, khiếu nại gay gắt hoặc tức giận, đặt "handover_to_staff": true.

=== ĐỊNH DẠNG ĐẦU RA BẮT BUỘC ===
Bạn PHẢI trả về duy nhất 1 chuỗi JSON hợp lệ (không kèm Markdown code block) theo schema sau:
{
  "reply": "Nội dung tin nhắn bạn sẽ gửi lại cho khách hàng bằng tiếng Việt",
  "is_order_intent": true | false,
  "order_data": null hoặc {
    "customer_name": "Tên khách hàng (ưu tiên tên khách tự xưng, nếu không thì dùng '${fallbackCustomerName}')",
    "phone": "Số điện thoại 10 số sạch nếu khách đã cung cấp",
    "shipping_address": "Địa chỉ giao hàng sạch sẽ nếu khách đã cung cấp",
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
    return generateSmartFallbackResponse({
      messageText,
      aiConfig,
      rawProducts,
      chatHistoryText,
      defaultCustomerName: customerName,
      existingDraft: orderDraft
    });
  }
};

/**
 * 3. Bộ mô phỏng AI thông minh Đa bước (Multi-turn Slot-Filling Fallback Engine)
 * Xử lý tuần tự: Hỏi biến thể -> Xin SĐT -> Xin Địa chỉ -> Hoàn tất đơn hàng
 */
const generateSmartFallbackResponse = ({
  messageText,
  aiConfig,
  rawProducts,
  chatHistoryText,
  defaultCustomerName = '',
  existingDraft = null
}) => {
  const text = (messageText || '').trim();
  const lower = text.toLowerCase();

  // Bóc tách tên, địa chỉ sạch và SĐT qua bộ phân tích
  const {
    extractedName,
    cleanAddress,
    phone,
    addressQuality,
    addressFeedback,
    customerNote,
    phoneValidation
  } = extractNameAndCleanAddress(text, defaultCustomerName);

  // 1. Khớp sản phẩm gần nhất trong tin nhắn hoặc kế thừa từ existingDraft
  let matchedProduct = null;
  for (const p of rawProducts) {
    const pName = (p.product_name || '').toLowerCase();
    const pSku = (p.sku || '').toLowerCase();
    if (lower.includes(pName) || (pSku && lower.includes(pSku))) {
      matchedProduct = p;
      break;
    }
  }

  if (!matchedProduct && existingDraft?.product_id) {
    matchedProduct = rawProducts.find((p) => p._id.toString() === existingDraft.product_id.toString()) || null;
  }
  if (!matchedProduct && (phone || cleanAddress) && existingDraft?.product_name) {
    matchedProduct = rawProducts.find((p) => p.product_name === existingDraft.product_name) || null;
  }

  // 2. Khớp biến thể (size, màu) nếu có
  let selectedSize = existingDraft?.size || '';
  let selectedColor = existingDraft?.color || '';

  const sizeMatch = text.match(/\b(?:size|cỡ|sz)\s*([a-zA-Z0-9]+)\b/i) || text.match(/\b(XXL|2XL|XL|L|M|XS)\b/i) || text.match(/\b(?:size|cỡ)?\s*([sS])\b/);
  if (sizeMatch && sizeMatch[1]) {
    selectedSize = sizeMatch[1].toUpperCase();
  }

  const colorsList = ['trắng', 'đen', 'xanh', 'đỏ', 'vàng', 'hồng', 'xám', 'ghi', 'cam', 'tím', 'nâu', 'be', 'pastel'];
  for (const c of colorsList) {
    if (lower.includes(c)) {
      selectedColor = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // 3. Khớp số lượng: chỉ bắt khi có từ định lượng (cái, hộp, áo...) hoặc từ khóa (lấy 2, mua 1, sl: 3)
  // Tuyệt đối không nhầm lẫn với số nhà (vd: "Số 25 Cầu Giấy")
  let quantity = existingDraft?.quantity || 1;
  const qtyWithUnit = text.match(/\b(\d+)\s*(?:cái|chiếc|hộp|hũ|bộ|áo|quần|đôi|sp|tuýp)\b/i);
  const qtyWithAction = text.match(/(?:lấy|mua|đặt|ship|sl:?|số lượng:?)\s*(\d+)\b/i);
  const foundQty = qtyWithUnit ? Number(qtyWithUnit[1]) : (qtyWithAction ? Number(qtyWithAction[1]) : null);
  if (foundQty && foundQty > 0 && foundQty <= 50) {
    if (!phone || !phone.includes(String(foundQty))) {
      quantity = foundQty;
    }
  }

  // Gom các slot hiện tại
  const currentPhone = phone || existingDraft?.phone || '';
  const currentAddress = cleanAddress || existingDraft?.shipping_address || '';
  const currentProduct = matchedProduct || (rawProducts.length > 0 ? rawProducts[0] : null);

  // A. Trường hợp khách gõ SĐT nhưng SĐT lỗi (ví dụ thiếu số hoặc sai đầu số viễn thông)
  if (phoneValidation && !phoneValidation.isValid && phoneValidation.phone && phoneValidation.errorReason !== 'NOT_FOUND') {
    return {
      reply: `Dạ số điện thoại "${phoneValidation.phone}" hình như chưa đủ 10 chữ số hoặc chưa đúng định dạng mạng di động ạ. Bạn kiểm tra lại và nhắn lại giúp shop nha!`,
      is_order_intent: false,
      order_data: null,
      missing_fields: ['phone'],
      handover_to_staff: false
    };
  }

  // B. Trường hợp khách gõ địa chỉ nhưng địa chỉ quá chung chung (VAGUE_AREA)
  if (addressQuality === 'VAGUE_AREA' && addressFeedback) {
    return {
      reply: addressFeedback,
      is_order_intent: false,
      order_data: null,
      missing_fields: ['shipping_address'],
      handover_to_staff: false
    };
  }

  // C. Kiểm tra biến thể sản phẩm nếu sản phẩm có variants trong kho
  const hasVariants = currentProduct && Array.isArray(currentProduct.variants_json) && currentProduct.variants_json.length > 0;
  const availableSizes = hasVariants ? [...new Set(currentProduct.variants_json.map((v) => v.size).filter(Boolean))].join(', ') : '';
  const availableColors = hasVariants ? [...new Set(currentProduct.variants_json.map((v) => v.color).filter(Boolean))].join(', ') : '';

  // Phát hiện ý định đặt mua hàng
  const isBuyingIntent = lower.includes('mua') || lower.includes('lấy') || lower.includes('đặt') || lower.includes('ship') || phone || cleanAddress;

  // BƯỚC 1: Nếu khách muốn mua mà chưa chọn Size/Màu
  if (isBuyingIntent && hasVariants && !selectedSize && availableSizes) {
    return {
      reply: `Dạ mẫu "${currentProduct.product_name}" bên em có các size: ${availableSizes}${availableColors ? ` và màu: ${availableColors}` : ''} ạ. Bạn thường mặc size nào hoặc cho shop xin chiều cao, cân nặng để em chọn size vừa vặn nhất cho mình nha!`,
      is_order_intent: false,
      order_data: {
        product_id: currentProduct._id,
        product_name: currentProduct.product_name,
        sku: currentProduct.sku,
        price: currentProduct.sale_price || currentProduct.base_price || 0,
        quantity,
        size: selectedSize,
        color: selectedColor,
        customer_name: extractedName,
        phone: currentPhone,
        shipping_address: currentAddress
      },
      missing_fields: ['variant'],
      handover_to_staff: false
    };
  }

  // BƯỚC 2: Nếu đã có sản phẩm nhưng thiếu SĐT
  if (isBuyingIntent && !currentPhone) {
    const itemDesc = selectedSize ? `${currentProduct.product_name} (Size ${selectedSize}${selectedColor ? `, Màu ${selectedColor}` : ''})` : currentProduct.product_name;
    return {
      reply: `Dạ em đã giữ ${quantity} ${itemDesc} cho mình rồi ạ! Bạn cho shop xin Số điện thoại nhận hàng để bên em tiện liên hệ giao hàng nha!`,
      is_order_intent: false,
      order_data: {
        product_id: currentProduct._id,
        product_name: currentProduct.product_name,
        sku: currentProduct.sku,
        price: currentProduct.sale_price || currentProduct.base_price || 0,
        quantity,
        size: selectedSize,
        color: selectedColor,
        customer_name: extractedName,
        phone: currentPhone,
        shipping_address: currentAddress
      },
      missing_fields: ['phone'],
      handover_to_staff: false
    };
  }

  // BƯỚC 3: Nếu đã có SĐT nhưng thiếu Địa chỉ giao hàng cụ thể
  if (isBuyingIntent && currentPhone && (!currentAddress || addressQuality === 'INCOMPLETE')) {
    return {
      reply: `Dạ em đã lưu số điện thoại ${currentPhone} của mình rồi ạ. Bạn cho shop xin thêm Địa chỉ nhận hàng cụ thể (Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP) để shop gửi hàng cho mình nhé!`,
      is_order_intent: false,
      order_data: {
        product_id: currentProduct._id,
        product_name: currentProduct.product_name,
        sku: currentProduct.sku,
        price: currentProduct.sale_price || currentProduct.base_price || 0,
        quantity,
        size: selectedSize,
        color: selectedColor,
        customer_name: extractedName,
        phone: currentPhone,
        shipping_address: currentAddress
      },
      missing_fields: ['shipping_address'],
      handover_to_staff: false
    };
  }

  // BƯỚC 4: ĐỦ TẤT CẢ THÔNG TIN -> TỰ ĐỘNG LÊN ĐƠN HÀNG THÀNH CÔNG!
  if (currentPhone && currentAddress && addressQuality === 'VALID') {
    const p = currentProduct;
    const customerDisplayName = extractedName && extractedName !== 'Khách hàng' ? `anh/chị ${extractedName}` : 'anh/chị';
    const unitPrice = p ? (p.sale_price || p.base_price || 0) : 0;
    const totalAmount = (unitPrice * quantity).toLocaleString('vi-VN');

    return {
      reply: `Dạ em cảm ơn ${customerDisplayName} đã để lại thông tin đặt hàng ạ! Em đã lên đơn hàng cho mình:\n- Sản phẩm: ${p ? p.product_name : 'Sản phẩm'}${selectedSize ? ` (Size: ${selectedSize})` : ''}${selectedColor ? ` (Màu: ${selectedColor})` : ''} x ${quantity}\n- Người nhận: ${extractedName}\n- SĐT: ${currentPhone}\n- Địa chỉ giao: ${currentAddress}\n- Tổng tiền: ${totalAmount} VND (Thanh toán khi nhận hàng).\nChuyên viên của shop sẽ sớm liên hệ xác nhận và giao hàng cho mình nhé! ✨`,
      is_order_intent: true,
      order_data: {
        customer_name: extractedName || 'Khách hàng',
        phone: currentPhone,
        shipping_address: currentAddress,
        customer_note: customerNote || text,
        items: p
          ? [
              {
                sku: p.sku,
                product_name: p.product_name,
                size: selectedSize || 'Tiêu chuẩn',
                color: selectedColor || 'Mặc định',
                quantity: quantity || 1
              }
            ]
          : []
      },
      missing_fields: [],
      handover_to_staff: false,
      handover_reason: null
    };
  }

  // Trường hợp hỏi giá / tư vấn
  if (lower.includes('giá') || lower.includes('nhiêu') || lower.includes('bao tiền')) {
    if (currentProduct) {
      const price = (currentProduct.sale_price || currentProduct.base_price || 0).toLocaleString('vi-VN');
      return {
        reply: `Dạ sản phẩm "${currentProduct.product_name}" hiện đang có giá ưu đãi là ${price} VND ạ! Anh/chị cần em tư vấn thêm về size hay cách chọn màu không ạ?`,
        is_order_intent: false,
        order_data: null,
        missing_fields: [],
        handover_to_staff: false
      };
    }
  }

  // Phản hồi chào mừng và gợi ý mẫu
  const sampleProducts = rawProducts.slice(0, 3).map((p) => p.product_name).join(', ');
  return {
    reply: `Dạ shop xin chào anh/chị ạ! Hiện tại shop đang có các mẫu nổi bật như: ${sampleProducts || 'sản phẩm hot'}. Anh/chị đang quan tâm đến dòng nào hoặc cần tư vấn size, hãy gửi ảnh hoặc chiều cao + cân nặng để shop hỗ trợ ngay nhé!`,
    is_order_intent: false,
    order_data: null,
    missing_fields: [],
    handover_to_staff: false
  };
};

/**
 * 4. Xử lý toàn diện luồng AI: Thu thập Đa bước (Multi-turn) + Tạo Đơn Hàng PENDING + Socket.IO
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

    // Lấy tên thật của khách từ tài khoản Facebook
    const customerFbName = conversation.customer_id?.full_name && conversation.customer_id.full_name !== 'Khách hàng Facebook'
      ? conversation.customer_id.full_name
      : '';

    // Khởi tạo hoặc lấy giỏ hàng nháp hiện tại của hội thoại
    const currentDraft = conversation.order_draft || {};

    // 1. Phân tích qua Gemini AI kết hợp trạng thái đơn nháp đa bước
    const aiResult = await consultWithGeminiAI({
      business_id,
      channel_id,
      conversation_id,
      customer_id,
      messageText,
      customerName: customerFbName,
      orderDraft: currentDraft
    });

    let finalReply = aiResult.reply || 'Dạ em chào anh/chị, em có thể hỗ trợ gì cho mình ạ?';

    // Cập nhật các slot mới thu thập được vào order_draft
    if (aiResult.order_data) {
      const od = aiResult.order_data;
      if (!conversation.order_draft) conversation.order_draft = {};

      if (od.product_id) conversation.order_draft.product_id = od.product_id;
      if (od.product_name) conversation.order_draft.product_name = od.product_name;
      if (od.sku) conversation.order_draft.sku = od.sku;
      if (od.size) conversation.order_draft.size = od.size;
      if (od.color) conversation.order_draft.color = od.color;
      if (od.quantity) conversation.order_draft.quantity = od.quantity;
      if (od.price) conversation.order_draft.price = od.price;
      if (od.phone) conversation.order_draft.phone = od.phone;
      if (od.shipping_address) conversation.order_draft.shipping_address = od.shipping_address;
      if (od.customer_name && od.customer_name !== 'Khách hàng') conversation.order_draft.customer_name = od.customer_name;
      if (od.customer_note) conversation.order_draft.customer_note = od.customer_note;

      conversation.order_draft.status = 'COLLECTING';
      conversation.order_draft.updated_at = new Date();
    }

    // 2. Kiểm tra thẩm định điều kiện chốt ĐƠN HÀNG (Validation Gate)
    let createdOrder = null;
    const finalPhone = conversation.order_draft?.phone || aiResult.order_data?.phone;
    const finalAddress = conversation.order_draft?.shipping_address || aiResult.order_data?.shipping_address;

    const phoneCheck = validateAndSanitizePhone(finalPhone || '');
    const addressCheck = evaluateAddressQuality(finalAddress || '');

    if (aiResult.is_order_intent && phoneCheck.isValid && addressCheck.quality === 'VALID') {
      try {
        const orderInfo = aiResult.order_data || conversation.order_draft;
        const itemsToCreate = [];

        // Xác định tên chuẩn xác của khách hàng
        let finalCustomerName = orderInfo.customer_name;
        if (!finalCustomerName || finalCustomerName === 'Khách hàng' || finalCustomerName === 'null') {
          finalCustomerName = customerFbName || 'Khách hàng';
        }

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
                size: it.size || conversation.order_draft?.size || '',
                color: it.color || conversation.order_draft?.color || '',
                quantity: Number(it.quantity) || 1,
                unit_price: unitPrice,
                price: unitPrice
              });
            }
          }
        } else if (conversation.order_draft?.product_id) {
          const foundProduct = await Product.findById(conversation.order_draft.product_id);
          if (foundProduct) {
            const unitPrice = foundProduct.sale_price || foundProduct.base_price || 0;
            itemsToCreate.push({
              product_id: foundProduct._id,
              variant_sku: foundProduct.sku,
              product_name: foundProduct.product_name,
              size: conversation.order_draft.size || '',
              color: conversation.order_draft.color || '',
              quantity: Number(conversation.order_draft.quantity) || 1,
              unit_price: unitPrice,
              price: unitPrice
            });
          }
        }

        // Tạo đơn hàng ở trạng thái PENDING
        if (itemsToCreate.length > 0 || addressCheck.cleanAddress) {
          createdOrder = await createOrderService(
            {
              business_id,
              channel_id: channel_id || null,
              customer_id: customer_id || null,
              customer_name: finalCustomerName,
              shipping_customer_name: finalCustomerName,
              customer_phone: phoneCheck.phone,
              shipping_phone: phoneCheck.phone,
              shipping_address: addressCheck.cleanAddress,
              order_items: itemsToCreate,
              order_status: 'PENDING',
              status: 'PENDING',
              order_source: 'FACEBOOK_AI',
              note: `Đơn hàng tự động trích xuất bởi Trợ lý AI Gemini: "${addressCheck.customerNote || orderInfo.customer_note || messageText}"`
            },
            null
          );

          console.log(`[Gemini AI] 🛒 ĐÃ TỰ ĐỘNG TẠO ĐƠN HÀNG THÀNH CÔNG: Mã #${createdOrder.order_code} (Khách: ${finalCustomerName})`);
          if (!finalReply.includes(createdOrder.order_code)) {
            finalReply += `\n\n(Dạ em đã tạo đơn hàng thành công với mã #${createdOrder.order_code}. Shop sẽ sớm liên hệ xác nhận và giao hàng ạ!)`;
          }

          // Cập nhật trạng thái đơn nháp đã hoàn tất
          if (conversation.order_draft) {
            conversation.order_draft.status = 'ORDER_CREATED';
          }
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

    // 5. Cập nhật thông tin khách hàng: SĐT, Địa chỉ, và Tên thật nếu khách có xưng tên riêng
    if (customer_id) {
      const updateFields = {};
      if (aiResult.order_data?.phone) {
        updateFields.phone = aiResult.order_data.phone;
        updateFields.phone_number = aiResult.order_data.phone;
      }
      if (aiResult.order_data?.shipping_address) {
        updateFields.shipping_address = aiResult.order_data.shipping_address;
      }
      if (aiResult.order_data?.customer_name && aiResult.order_data.customer_name !== 'Khách hàng') {
        updateFields.full_name = aiResult.order_data.customer_name;
      }

      if (Object.keys(updateFields).length > 0) {
        await Customer.findByIdAndUpdate(customer_id, {
          $set: updateFields,
          $addToSet: { tags: 'Khách để lại SĐT' }
        });
      }
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
