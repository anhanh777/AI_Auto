import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIConfig,
  Product,
  KnowledgeBase,
  Message,
  Conversation,
  Customer,
  Channel,
  Order
} from '../models/index.js';
import { createOrderService } from './order.service.js';
import { autoTagConversationService } from './conversation.service.js';
import { getIO } from '../config/socket.config.js';
import { validateAndSanitizePhone, evaluateAddressQuality } from '../helpers/orderValidation.helper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey && apiKey !== 'your_gemini_api_key_here' ? new GoogleGenerativeAI(apiKey) : null;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Chuyển đổi URL hình ảnh (cả URL Internet và đường dẫn local /uploads/) thành Gemini Multimodal Part
 */
export async function convertImageUrlToGeminiPart(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    let buffer = null;
    let mimeType = 'image/jpeg';

    if (url.includes('localhost') || url.includes('127.0.0.1') || url.startsWith('/uploads')) {
      const uploadsIndex = url.indexOf('/uploads/');
      const relPath = uploadsIndex !== -1 ? url.substring(uploadsIndex + '/uploads/'.length) : url;
      const localFilePath = path.resolve(__dirname, '../../uploads', relPath);
      if (fs.existsSync(localFilePath)) {
        buffer = fs.readFileSync(localFilePath);
        const ext = path.extname(localFilePath).toLowerCase();
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.gif') mimeType = 'image/gif';
      }
    }

    if (!buffer && (url.startsWith('http://') || url.startsWith('https://'))) {
      const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
      buffer = Buffer.from(resp.data);
      const ct = resp.headers['content-type'];
      if (ct && ct.startsWith('image/')) mimeType = ct.split(';')[0];
    }

    if (buffer) {
      return {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType
        }
      };
    }
  } catch (err) {
    console.warn('[Gemini Image Part Convert Warn]', err.message);
  }
  return null;
}

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
export const buildRAGContext = async ({ business_id, conversation_id, customer_id = null, channel_id = null }) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  const orderQueryConditions = [];
  if (conversation_id) orderQueryConditions.push({ conversation_id });
  if (customer_id) orderQueryConditions.push({ customer_id });

  // A. Cấu hình AI của Business (ưu tiên channel_id, nếu không có fallback về business default)
  let aiConfig = await AIConfig.findOne({ business_id, channel_id: channel_id || null }).lean();
  if (!aiConfig && channel_id) {
    aiConfig = await AIConfig.findOne({ business_id, channel_id: null }).lean();
  }
  if (!aiConfig) {
    aiConfig = await AIConfig.findOne({ business_id }).lean();
  }

  const [products, knowledgeList, recentMessages, recentOrders] = await Promise.all([
    // B. Danh mục sản phẩm đang mở bán kèm tồn kho
    Product.find({ business_id, status: 'ACTIVE' })
      .select('product_name sku base_price sale_price stock_available variants_json ai_selling_points description image_urls')
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
      : [],

    // E. Các đơn hàng gần đây của khách hàng hoặc phiên chat (để AI tra cứu trạng thái đơn hàng khi khách hỏi)
    orderQueryConditions.length > 0
      ? Order.find({
          business_id,
          $or: orderQueryConditions
        })
          .sort({ created_at: -1 })
          .limit(3)
          .lean()
      : []
  ]);

  const sortedHistory = recentMessages.reverse();

  const productContextText = products.map((p) => {
    const price = p.sale_price || p.base_price;
    const variantsStr = Array.isArray(p.variants_json) && p.variants_json.length > 0
      ? p.variants_json.map((v) => `${v.size || ''}/${v.color || ''} (còn ${v.stock || 0})`).join(', ')
      : 'Không có biến thể';
    const imgUrls = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls.join(', ') : 'Chưa có ảnh';
    return `- [SKU: ${p.sku}] ${p.product_name} | Giá: ${price.toLocaleString('vi-VN')} VND | Tồn khả dụng: ${p.stock_available} | Biến thể: ${variantsStr} | Đặc điểm: ${p.ai_selling_points || p.description || ''} | Ảnh sản phẩm: ${imgUrls}`;
  }).join('\n');

  const knowledgeContextText = knowledgeList.map((k) => {
    return `- [${k.category}] ${k.title}: ${k.content}`;
  }).join('\n');

  const chatHistoryText = sortedHistory.map((m) => {
    const role = m.sender_type === 'CUSTOMER' ? 'Khách hàng' : 'Nhân viên/Bot';
    return `${role}: ${m.content}`;
  }).join('\n');

  const ordersContextText = Array.isArray(recentOrders) && recentOrders.length > 0
    ? recentOrders.map((o) => {
        const items = (o.order_items || []).map((it) => `${it.product_name} x ${it.quantity}`).join(', ');
        const statusMap = {
          PENDING: 'Chờ xác nhận',
          CONFIRMED: 'Đã xác nhận',
          SHIPPING: 'Đang giao hàng',
          DELIVERED: 'Đã giao thành công',
          COMPLETED: 'Hoàn thành',
          CANCELLED: 'Đã hủy'
        };
        const stName = statusMap[o.order_status] || o.order_status;
        return `- Mã đơn: #${o.order_code} | Trạng thái: ${stName} | Sản phẩm: ${items} | Người nhận: ${o.shipping_customer_name || o.customer_name} | SĐT: ${o.shipping_phone || o.customer_phone} | Địa chỉ: ${o.shipping_address} | Tổng tiền: ${(o.total_amount || 0).toLocaleString('vi-VN')} VND | Ngày đặt: ${new Date(o.created_at).toLocaleString('vi-VN')}`;
      }).join('\n')
    : 'Khách hàng này hiện chưa có đơn hàng nào trước đó.';

  const resolvedSystemPrompt = (aiConfig?.system_prompt && aiConfig.system_prompt.trim())
    ? aiConfig.system_prompt.trim()
    : 'Bạn là chuyên viên tư vấn bán hàng thông minh, nhiệt tình và chu đáo. Hãy chào đón khách hàng, giải đáp chi tiết thông tin sản phẩm và hỗ trợ đặt hàng lịch sự, nhanh chóng.';

  const resolvedWelcomeMessage = (aiConfig?.welcome_message && aiConfig.welcome_message.trim())
    ? aiConfig.welcome_message.trim()
    : 'Dạ shop xin chào bạn ạ! Bạn đang quan tâm đến mẫu sản phẩm nào để shop hỗ trợ tư vấn ngay cho mình nhé?';

  return {
    aiConfig: {
      bot_name: aiConfig?.bot_name || 'AI Assistant',
      ai_persona_tone: aiConfig?.ai_persona_tone || 'FRIENDLY',
      system_prompt: resolvedSystemPrompt,
      welcome_message: resolvedWelcomeMessage,
      guardrail_blocklist: Array.isArray(aiConfig?.guardrail_blocklist) && aiConfig.guardrail_blocklist.length > 0
        ? aiConfig.guardrail_blocklist
        : ['chửi bậy', 'lừa đảo', 'hoàn tiền gấp', 'hàng giả', 'đối thủ'],
      smart_delay_seconds: aiConfig?.smart_delay_seconds || 3,
      auto_order_extraction: aiConfig?.auto_order_extraction !== undefined ? aiConfig.auto_order_extraction : true
    },
    productContextText: productContextText || 'Hiện tại chưa có sản phẩm nào trong kho.',
    knowledgeContextText: knowledgeContextText || 'Chưa có tài liệu FAQ bổ sung.',
    chatHistoryText: chatHistoryText || 'Đây là tin nhắn đầu tiên của khách.',
    ordersContextText: ordersContextText,
    recentOrders: recentOrders || [],
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
  orderDraft = null,
  customerImageUrls = []
}) => {
  // A. Nạp ngữ cảnh RAG
  const ragContext = await buildRAGContext({ business_id, conversation_id, customer_id, channel_id });
  const { aiConfig, productContextText, knowledgeContextText, chatHistoryText, ordersContextText, rawProducts } = ragContext;

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
      ordersContextText,
      defaultCustomerName: customerName,
      existingDraft: orderDraft,
      customerImageUrls
    });
  }

  // D. Xây dựng System Prompt chuyên biệt cho Tư vấn & Chốt đơn đa bước
  const fallbackCustomerName = customerName || 'Khách hàng';

  const PERSONA_TONE_MAP = {
    FRIENDLY: `Thân thiện, gần gũi, ấm áp nhưng luôn giữ chuẩn mực bán hàng lịch sự. Xưng "shop" hoặc "em", gọi khách là "bạn" hoặc gọi theo tên khách (ví dụ "Dạ ${fallbackCustomerName} ơi...", "bạn ${fallbackCustomerName}"). Luôn dạ/thưa lễ phép, sử dụng emoji nhẹ nhàng (✨, ❤️, 😊).`,
    PROFESSIONAL: `Chuyên nghiệp, chuẩn mực, trang trọng. Xưng "shop" hoặc "chúng tôi", gọi khách là "Quý khách" hoặc "anh/chị". Trả lời súc tích, mạch lạc, chính xác, không dùng từ lóng.`,
    POLITE: `Lịch sự, nhã nhặn, tôn trọng khách hàng tối đa. Xưng "em" hoặc "shop", gọi "anh/chị" hoặc "bạn". Luôn bắt đầu bằng lời chào kính trọng và kết thúc bằng lời cảm ơn.`,
    GENZ: `Tươi vui, năng động, đáng yêu. Xưng "shop" hoặc "em", gọi khách là "bạn ơi" hoặc "bạn ${fallbackCustomerName}".`,
    ENTHUSIASTIC: `Nhiệt huyết, hào hứng, tốc độ phản hồi nhanh, chủ động giải đáp chi tiết và gợi ý đặt hàng ngay.`
  };

  const toneInstruction = PERSONA_TONE_MAP[aiConfig.ai_persona_tone] || PERSONA_TONE_MAP.FRIENDLY;

  const systemInstruction = `
Bạn là ${aiConfig.bot_name || 'Trợ lý AI tư vấn bán hàng'}, đại diện cho cửa hàng.
Phong cách & Giọng điệu của bạn: ${toneInstruction}
Tên tài khoản người chat (Facebook): "${fallbackCustomerName}".
Lời căn dặn của chủ shop: "${aiConfig.system_prompt || 'Bạn là chuyên viên tư vấn bán hàng thông minh, nhiệt tình và chu đáo. Hãy chào đón khách hàng, giải đáp chi tiết thông tin sản phẩm và hỗ trợ đặt hàng lịch sự, nhanh chóng.'}"

=== THÔNG TIN SẢN PHẨM & TỒN KHO THỰC TẾ (RAG) ===
${productContextText}

=== CHÍNH SÁCH BÁN HÀNG & KHO TRI THỨC (FAQ) ===
${knowledgeContextText}

=== THÔNG TIN ĐƠN HÀNG GẦN NHẤT CỦA KHÁCH HÀNG (RAG) ===
${ordersContextText || 'Khách hàng này hiện chưa có đơn hàng nào trước đó.'}

=== TRẠNG THÁI GIỎ HÀNG TẠM THỜI (ORDER DRAFT HIỆN TẠI) ===
- Sản phẩm đã chọn: ${orderDraft?.product_name || 'Chưa chọn'}
- Size: ${orderDraft?.size || 'Chưa chọn'}
- Màu: ${orderDraft?.color || 'Chưa chọn'}
- Số lượng: ${orderDraft?.quantity || 1}
- SĐT đã lưu: ${orderDraft?.phone || 'Chưa có'}
- Địa chỉ đã lưu: ${orderDraft?.shipping_address || 'Chưa có'}

=== LỊCH SỬ HỘI THOẠI GẦN ĐÂY ===
${chatHistoryText}

=== NGUYÊN TẮC GIAO TIẾP VÀ XƯNG HÔ (TUYỆT ĐỐI BẮT BUỘC TUÂN THỦ) ===
0. NGUYÊN TẮC XƯNG HÔ VÀ LỜI NÓI (CỰC KỲ QUAN TRỌNG):
   - Shop luôn xưng là "shop" hoặc "em".
   - Gọi khách hàng là "bạn", hoặc gọi theo tên tài khoản của khách (ví dụ: "Dạ ${fallbackCustomerName} ơi...", "Dạ bạn ${fallbackCustomerName}..."), hoặc xưng "anh/chị".
   - TUYỆT ĐỐI NGHIÊM CẤM gọi khách bằng các từ ngữ suồng sã, kỳ quặc hoặc phản cảm như: "vợ", "chồng", "vợ/chồng", "vk", "ck", "vợ iu", "chồng iu", "ông xã", "bà xã", "người đẹp", "mình ơi". Tuyệt đối KHÔNG BAO GIỜ được xưng hô "vợ/chồng" với khách trong mọi tình huống!
   - KHI KHÁCH PHẢN HỒI NGẮN GỌN (như "ok shop", "cảm ơn", "vâng", "dạ", "chào shop", "okie", "tks shop"):
     + Nếu đơn hàng vừa được tạo thành công: Chỉ cần đáp lại chân thành, ngắn gọn và lịch sự: "Dạ vâng ạ, cảm ơn ${fallbackCustomerName} đã tin tưởng ủng hộ shop! Chúc bạn một ngày thật nhiều niềm vui nhé! ❤️".
     + TUYỆT ĐỐI KHÔNG hỏi lại thông tin nhận hàng, KHÔNG xin lại SĐT/Địa chỉ, và KHÔNG tạo thêm đơn hàng mới khi khách chỉ nói câu xác nhận/cảm ơn thông thường!

1. GIAI ĐOẠN 1 - KHÁM PHÁ / XEM MẪU / XEM ẢNH:
   - Khi khách bảo "cho mình xem...", "gửi ảnh...", "có mẫu nào...", "sản phẩm này thế nào", "xem hình ảnh của từng sản phẩm":
     + Niềm nở giới thiệu đặc điểm nổi bật, thiết kế và mức giá ưu đãi của các sản phẩm.
     + BẮT BUỘC: Nếu trong thông tin sản phẩm ở trên có link URL ở trường "Ảnh sản phẩm", hãy trích xuất chính xác các đường link URL đó vào mảng "image_urls" của JSON. Tuyệt đối KHÔNG NÓI "shop chưa có ảnh" hay "chưa có ảnh sẵn" nếu trong kho có đường link ảnh!
     + CỰC KỲ QUAN TRỌNG: TUYỆT ĐỐI KHÔNG VIẾT các đường link URL ảnh (như http://..., localhost:5000..., /uploads/...) vào trong nội dung văn bản "reply"! Hãy để văn bản tự nhiên, lịch sự (Ví dụ: "Dạ shop gửi bạn xem hình ảnh mẫu bên dưới nha!"). Mọi đường link URL ảnh CHỈ ĐƯỢC PHÉP đặt vào mảng "image_urls" của JSON, hệ thống sẽ tự động chuyển thành hình ảnh thực tế gửi sang Facebook cho khách!
     + Hỏi khéo mẫu hoặc màu sắc mà khách ưng ý nhất để tư vấn sâu hơn.
     + TUYỆT ĐỐI KHÔNG tự tiện chọn size (như tự ý gán Size M), KHÔNG nói "đã giữ hàng", KHÔNG đòi số điện thoại khi khách chỉ muốn xem mẫu!
2. GIAI ĐOẠN 2 - TƯ VẤN SIZE & MÀU THEO CHIỀU CAO CÂN NẶNG:
   - Khi khách gửi chiều cao cân nặng (vd: 1m70 65kg, cao 1m65 55kg...):
     + Dựa trên các size sẵn có trong kho (M, L, XL...) để khuyên khách chọn size vừa vặn, tôn dáng nhất.
     + Giới thiệu các màu có sẵn và hỏi khách thích màu nào để shop chuẩn bị.
3. GIAI ĐOẠN 3 - CHỐT MUA RÕ RÀNG (BUYING INTENT):
   - CHỈ KHI khách nói rõ muốn mua (vd: "lấy mình 1 cái...", "đặt 1 cái size L màu đen", "ship cho mình"):
     + Nếu đã rõ Size và Màu: Xác nhận giữ hàng và xin Số điện thoại nhận hàng.
     + Nếu chưa rõ Size hoặc Màu: Hỏi nốt size/màu còn thiếu trước khi xin SĐT.
4. GIAI ĐOẠN 4 - THU THẬP & THẨM ĐỊNH SĐT + ĐỊA CHỈ (CHECKOUT):
   - KIỂM TRA SỐ ĐIỆN THOẠI (BẮT BUỘC ĐÚNG 10 CHỮ SỐ):
     + Số điện thoại di động Việt Nam hợp lệ phải có ĐÚNG 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).
     + Nếu khách nhập số điện thoại thừa số (như 11-14 số ví dụ 03938828282828), thiếu số (<10 số) hoặc số ảo lặp: TUYỆT ĐỐI KHÔNG XÁC NHẬN "đã ghi nhận SĐT"! Bắt buộc phải phản hồi lịch sự nhắc khách kiểm tra lại (Ví dụ: "Dạ số điện thoại của mình hình như chưa đúng định dạng 10 chữ số, anh/chị kiểm tra và nhắn lại giúp em nha!"). Đặt "is_order_intent": false.
   - KIỂM TRA ĐỊA CHỈ NHẬN HÀNG:
     + Địa chỉ hợp lệ phải có đủ thông tin để shipper có thể giao hàng (Số nhà, tên đường/ngõ/thôn/xóm kèm phường/xã, quận/huyện, tỉnh/TP).
     + Nếu khách nhập địa chỉ trêu đùa, vu vơ hoặc quá chung chung (như "nhà bà nào", "ở nhà", "hà nội", "gần trường học"): Bắt buộc giữ lại số điện thoại (nếu hợp lệ) và nhẹ nhàng xin lại địa chỉ cụ thể chi tiết. Đặt "is_order_intent": false.
   - CHỈ ĐẶT "is_order_intent": true KHI CẢ SĐT (CHUẨN 10 CHỮ SỐ) VÀ ĐỊA CHỈ (CỤ THỂ, GIAO HÀNG ĐƯỢC) ĐỀU HOÀN TOÀN ĐẦY ĐỦ! Khi đó mới tóm tắt đơn hàng và gửi lời cảm ơn.
5. PHÁT HIỆN YÊU CẦU GẶP NHÂN VIÊN (Handover):
   - Nếu khách yêu cầu gặp người thật, khiếu nại gay gắt hoặc tức giận, đặt "handover_to_staff": true.
6. NHẬN DIỆN SẢN PHẨM QUA HÌNH ẢNH (MULTIMODAL VISION):
   - Khi khách gửi hình ảnh hoặc trích dẫn ảnh hỏi ("ảnh này là sản phẩm nào", "mẫu này còn không", "cho mình xin giá cái này", "sản phẩm trong hình là gì", "mẫu này là mẫu nào"):
     + Bạn ĐANG ĐƯỢC TRUYỀN HÌNH ẢNH THẬT đính kèm tin nhắn này. Hãy quan sát thật kỹ hình ảnh: nhận diện màu sắc, chi tiết, đặc điểm nhân vật, con vật, trang phục hoặc hình dáng.
     + So sánh đối chiếu trực tiếp với Danh mục sản phẩm ở trên.
     + Khẳng định chính xác sản phẩm tương ứng trong kho (Ví dụ: "Dạ hình ảnh bạn vừa hỏi chính là mẫu [Tên sản phẩm] (SKU: [Mã SKU]) bên em đó ạ! Mẫu này có giá [Giá] VND...").
     + Trích xuất URL ảnh của sản phẩm này vào mảng "image_urls" của JSON trả về để tiếp tục hiển thị cho khách.
7. TRA CỨU & KIỂM TRA ĐƠN HÀNG ĐÃ ĐẶT (ORDER INQUIRY):
   - Khi khách hỏi "tôi cần biết thông tin đơn hàng vừa đặt", "kiểm tra đơn hàng", "đơn hàng của tôi", "khi nào giao hàng", "xem lại đơn hàng", "tôi đã đặt những gì", "tôi có đơn nào không", "xem tôi có đơn hàng nào":
     + TUYỆT ĐỐI KHÔNG TẠO ĐƠN HÀNG MỚI! KHÔNG lấy câu hỏi này làm địa chỉ giao hàng! BẮT BUỘC đặt "is_order_intent": false và "order_data": null.
     + QUY TẮC RAG CHÍNH XÁC: Bạn CHỈ ĐƯỢC báo thông tin đơn hàng nếu trong phần "=== THÔNG TIN ĐƠN HÀNG GẦN NHẤT CỦA KHÁCH HÀNG (RAG) ===" ở trên CÓ đơn hàng thực tế (#DH-...). Hãy báo rõ mã đơn, sản phẩm, địa chỉ, trạng thái.
     + Nếu phần RAG ghi "Khách hàng này hiện chưa có đơn hàng nào trước đó", bạn BẮT BUỘC trả lời: "Dạ em kiểm tra trên hệ thống thì hiện tại anh/chị chưa có đơn hàng nào được ghi nhận ạ. Anh/chị có muốn tham khảo mẫu Lego nào để em hỗ trợ lên đơn cho mình không nha!". TUYỆT ĐỐI KHÔNG tự nhận vơ các câu chat cũ thành đơn hàng!

=== ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON ONLY) ===
Bạn PHẢI trả về duy nhất 1 chuỗi JSON hợp lệ (không kèm Markdown code block) theo schema sau:
{
  "reply": "Nội dung tin nhắn bạn sẽ gửi lại cho khách hàng bằng tiếng Việt (TUYỆT ĐỐI KHÔNG chứa đường link URL ảnh, link localhost hay /uploads/ ở đây)",
  "image_urls": ["Danh sách URL ảnh sản phẩm nếu khách hỏi xem mẫu/ảnh"],
  "is_order_intent": true | false,
  "order_data": null hoặc {
    "customer_name": "Tên khách hàng",
    "phone": "Số điện thoại nếu khách đã cung cấp",
    "shipping_address": "Địa chỉ giao hàng nếu khách đã cung cấp",
    "items": [
      {
        "sku": "Mã SKU của sản phẩm",
        "product_name": "Tên sản phẩm",
        "size": "Size nếu khách đã chọn",
        "color": "Màu nếu khách đã chọn",
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
    // Chuyển đổi các hình ảnh khách gửi / khách trích dẫn thành Gemini Multimodal Parts
    const geminiImageParts = [];
    if (Array.isArray(customerImageUrls) && customerImageUrls.length > 0) {
      for (const imgUrl of customerImageUrls.slice(0, 2)) {
        const part = await convertImageUrlToGeminiPart(imgUrl);
        if (part) geminiImageParts.push(part);
      }
    }

    const prompt = `${systemInstruction}\n\nTin nhắn mới từ khách hàng: "${messageText}"`;
    const contentPayload = geminiImageParts.length > 0 ? [prompt, ...geminiImageParts] : prompt;

    // Cơ chế Multi-Model Fallback: Ưu tiên model chính, nếu gặp 429 hoặc lỗi sẽ chuyển tiếp model dự phòng
    const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const fallbackModelList = [primaryModel, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-3.5-flash-lite'].filter((v, i, a) => a.indexOf(v) === i);

    let responseText = null;
    let lastError = null;

    for (const mName of fallbackModelList) {
      try {
        const model = genAI.getGenerativeModel({
          model: mName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4
          }
        });
        const result = await model.generateContent(contentPayload);
        responseText = result.response.text();
        if (responseText) break;
      } catch (mErr) {
        lastError = mErr;
        console.warn(`[Gemini AI] Model ${mName} thất bại: ${mErr.message}, đang thử model tiếp theo...`);
      }
    }

    if (!responseText) {
      throw lastError || new Error('Không thể tạo phản hồi từ các model Gemini');
    }

    const parsed = JSON.parse(responseText.trim());
    let rawReply = parsed.reply || 'Dạ shop xin chào bạn! Shop có thể hỗ trợ gì cho bạn hôm nay ạ?';
    let imageUrls = Array.isArray(parsed.image_urls) ? [...parsed.image_urls] : [];

    // Tự động vớt các URL ảnh vô tình bị AI viết vào reply để đưa vào danh sách gửi đính kèm
    const rawUrlMatches = rawReply.match(/https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|webp|gif)/gi) || [];
    const uploadMatches = rawReply.match(/\/uploads\/[^\s]+?\.(?:jpg|jpeg|png|webp|gif)/gi) || [];
    for (const u of [...rawUrlMatches, ...uploadMatches]) {
      if (!imageUrls.includes(u)) {
        imageUrls.push(u);
      }
    }

    // Làm sạch triệt để: loại bỏ link ảnh thô, link localhost, đường dẫn /uploads/ khỏi nội dung chat
    let cleanedReply = rawReply
      .replace(/https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|webp|gif)/gi, '')
      .replace(/https?:\/\/localhost:\d+[^\s]*/gi, '')
      .replace(/\/uploads\/[^\s]+?\.(?:jpg|jpeg|png|webp|gif)/gi, '')
      .replace(/\[\s*(?:hình|ảnh|link)\s*\]\([^\)]+\)/gi, '')
      // Bộ lọc khử xưng hô lệch chuẩn (ngăn chặn hoàn toàn việc gọi khách là vợ/chồng)
      .replace(/\b(?:dạ\s+)?vợ\/chồng[,.]?\s*/gi, 'Dạ bạn ơi, ')
      .replace(/\bvợ\/chồng\b/gi, 'bạn')
      .replace(/\b(?:vk\/ck|vợ chồng)\b/gi, 'bạn')
      .replace(/\b(?:ông xã|bà xã)\b/gi, 'anh/chị')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();

    if (!cleanedReply) {
      cleanedReply = imageUrls.length > 0
        ? 'Dạ em gửi anh/chị xem hình ảnh thực tế của mẫu bên dưới nha! Anh/chị cần em tư vấn thêm màu hay size nào cứ nhắn em nhé.'
        : 'Dạ shop xin chào bạn! Shop có thể hỗ trợ gì cho bạn hôm nay ạ?';
    }

    return {
      reply: cleanedReply,
      image_urls: imageUrls,
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
      ordersContextText,
      defaultCustomerName: customerName,
      existingDraft: orderDraft,
      customerImageUrls
    });
  }
};

/**
 * 3. Bộ mô phỏng AI thông minh Đa bước (Multi-turn Slot-Filling Fallback Engine)
 * Xử lý tuần tự: Hỏi biến thể -> Xin SĐT -> Xin Địa chỉ -> Hoàn tất đơn hàng
 */
export const generateSmartFallbackResponse = ({
  messageText,
  aiConfig,
  rawProducts,
  chatHistoryText,
  ordersContextText = '',
  defaultCustomerName = '',
  existingDraft = null,
  customerImageUrls = []
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

  // 1. Khớp sản phẩm được nhắc đến trong tin nhắn
  let matchedProduct = null;

  // Nếu khách gửi ảnh hoặc trích dẫn ảnh, ưu tiên khớp sản phẩm qua đường link ảnh
  if (Array.isArray(customerImageUrls) && customerImageUrls.length > 0) {
    for (const p of rawProducts) {
      if (Array.isArray(p.image_urls) && p.image_urls.length > 0) {
        const hasMatchedImg = p.image_urls.some((pUrl) => {
          const pBase = path.basename(pUrl);
          return customerImageUrls.some((cUrl) => cUrl && cUrl.includes(pBase));
        });
        if (hasMatchedImg) {
          matchedProduct = p;
          break;
        }
      }
    }
  }

  if (!matchedProduct) {
    for (const p of rawProducts) {
      const pName = (p.product_name || '').toLowerCase();
      const pSku = (p.sku || '').toLowerCase();
      if (lower.includes(pName) || (pSku && lower.includes(pSku))) {
        matchedProduct = p;
        break;
      }
    }
  }

  // Khớp từng phần cụm từ khóa (vd: "áo khoác gió", "áo sơ mi", "lego", "kem massage")
  if (!matchedProduct) {
    const cleanTokens = lower.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter((w) => w.length >= 2);
    let bestScore = 0;
    for (const p of rawProducts) {
      const pTokens = (p.product_name || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter((w) => w.length >= 2);
      let matchCount = 0;
      for (const t of cleanTokens) {
        if (pTokens.includes(t)) matchCount++;
      }
      if (matchCount >= 2 && matchCount > bestScore) {
        bestScore = matchCount;
        matchedProduct = p;
      }
    }
  }

  // Nếu không nhắc tên sản phẩm mới, kiểm tra xem có đang kế thừa từ giỏ hàng nháp không
  if (!matchedProduct && existingDraft?.product_id && existingDraft?.status !== 'ORDER_CREATED') {
    matchedProduct = rawProducts.find((p) => p._id.toString() === existingDraft.product_id.toString()) || null;
  }
  if (!matchedProduct && (phone || cleanAddress) && existingDraft?.product_name && existingDraft?.status !== 'ORDER_CREATED') {
    matchedProduct = rawProducts.find((p) => p.product_name === existingDraft.product_name) || null;
  }
  if (!matchedProduct && rawProducts.length > 0) {
    matchedProduct = rawProducts[0];
  }

  // 2. Phân loại biến thể (Size & Màu sắc) trong tin nhắn hiện tại
  let selectedSize = '';
  let selectedColor = '';

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

  // 3. Khớp số lượng
  let quantity = (existingDraft?.status !== 'ORDER_CREATED' ? existingDraft?.quantity : 1) || 1;
  const qtyWithUnit = text.match(/\b(\d+)\s*(?:cái|chiếc|hộp|hũ|bộ|áo|quần|đôi|sp|tuýp)\b/i);
  const qtyWithAction = text.match(/(?:lấy|mua|đặt|ship|sl:?|số lượng:?)\s*(\d+)\b/i);
  const foundQty = qtyWithUnit ? Number(qtyWithUnit[1]) : (qtyWithAction ? Number(qtyWithAction[1]) : null);
  if (foundQty && foundQty > 0 && foundQty <= 50) {
    if (!phone || !phone.includes(String(foundQty))) {
      quantity = foundQty;
    }
  }

  // 4. Nhận diện các Ý định (Intent Classification)
  // A. Ý định xem sản phẩm / xem ảnh / tìm hiểu mẫu
  const isViewingIntent = /(?:cho\s+(?:mình|em|anh|chị)?\s*xem|xem\s+sản\s+phẩm|xem\s+ảnh|cho\s+xem\s+ảnh|ảnh\s+thật|hình\s+ảnh|xem\s+mẫu|xem\s+hàng|chi\s+tiết|sản\s+phẩm\s+này|có\s+mẫu\s+nào|gửi\s+ảnh|gửi\s+hình|gửi\s+mẫu)/i.test(text) ||
    ((lower.startsWith('xem ') || lower.includes(' xem ')) && !lower.includes('mua') && !lower.includes('đặt') && !lower.includes('lấy'));

  // B. Ý định hỏi giá
  const isPriceIntent = /(?:giá|bao\s+nhiêu|nhiêu\s+tiền|bao\s+tiền|giá\s+sao|bao\s+nhiêu\s+k|bn\s+tiền)/i.test(text) && !isViewingIntent;

  // C. Ý định tư vấn size theo chiều cao, cân nặng
  const heightWeightMatch = text.match(/(?:cao\s*)?(\d{1,3}(?:m\d{1,2}|cm)?)\s*[,.\s-]+\s*(?:nặng\s*)?(\d{2,3})\s*(?:kg|kí|cân)?/i) ||
    text.match(/(\d{2,3})\s*(?:kg|kí|cân)\s*[,.\s-]+\s*(?:cao\s*)?(\d{1,3}(?:m\d{1,2}|cm)?)/i);
  const isConsultingIntent = Boolean(heightWeightMatch) || /(?:size\s+gì|cỡ\s+gì|mặc\s+vừa|vừa\s+không|chọn\s+size|tư\s+vấn\s+size|có\s+màu\s+gì)/i.test(text);

  // D. Ý định tra cứu / hỏi thông tin đơn hàng đã đặt
  const isOrderTrackingIntent = /(?:thông\s*tin\s*đơn|kiểm\s*tra\s*đơn|tra\s*cứu\s*đơn|đơn\s*(?:hàng\s*)?(?:vừa|đã)\s*đặt|đơn\s*của\s*(?:tôi|mình|em)|khi\s*nào\s*giao|bao\s*giờ\s*giao|tình\s*trạng\s*đơn|mã\s*đơn\s*hàng|xem\s*lại\s*đơn)/i.test(text);

  // E. Ý định chốt mua hàng rõ ràng (chỉ bắt khi có từ hành động mua thực sự, có SĐT/Địa chỉ, hoặc đang trong quá trình đặt hàng slot-filling)
  const hasBuyingKeywords = /(?:mua|đặt\s+hàng|lấy\s+(?:\d+|cái|chiếc|áo|quần|size|màu|1|2|3|mẫu)|chốt|ship\s+(?:cho|về|1|2)|order|lấy\s+nhé|lấy\s+nha|mua\s+nhé|cho\s+mình\s+(?:\d+|1|2)\s+cái)/i.test(text);
  const isSlotFillingActive = (Boolean(existingDraft?.size) || existingDraft?.status === 'COLLECTING') && existingDraft?.status !== 'ORDER_CREATED';
  const hasContactInfo = Boolean(phoneValidation?.phone) || Boolean(cleanAddress);
  const isBuyingIntent = (hasBuyingKeywords || hasContactInfo || isSlotFillingActive) && !isViewingIntent && !isConsultingIntent && !isPriceIntent && !isOrderTrackingIntent;

  // --- TRƯỜNG HỢP 0: Khách tra cứu / hỏi thăm thông tin đơn hàng đã đặt ---
  if (isOrderTrackingIntent) {
    let orderInfoReply = '';
    if (ordersContextText && !ordersContextText.includes('hiện chưa có đơn hàng nào')) {
      orderInfoReply = `Dạ em xin gửi thông tin đơn hàng gần nhất của anh/chị ạ:\n${ordersContextText}\n\nShop đang chuẩn bị hàng cẩn thận để gửi cho mình sớm nhất nhé! Anh/chị cần thay đổi thông tin gì cứ báo shop nha!`;
    } else {
      orderInfoReply = 'Dạ hiện tại shop chưa ghi nhận đơn hàng nào của mình ạ. Anh/chị có muốn đặt mẫu nào không để em hỗ trợ lên đơn cho mình ngay nha!';
    }

    return {
      reply: orderInfoReply,
      image_urls: [],
      is_order_intent: false,
      order_data: null,
      missing_fields: [],
      handover_to_staff: false
    };
  }

  const currentProduct = matchedProduct;
  const hasVariants = currentProduct && Array.isArray(currentProduct.variants_json) && currentProduct.variants_json.length > 0;
  const availableSizes = hasVariants ? [...new Set(currentProduct.variants_json.map((v) => v.size).filter(Boolean))].join(', ') : '';
  const availableColors = hasVariants ? [...new Set(currentProduct.variants_json.map((v) => v.color).filter(Boolean))].join(', ') : '';

  // --- TRƯỜNG HỢP 1: Khách chỉ muốn XEM MẪU / XEM ẢNH / KHÁM PHÁ SẢN PHẨM ---
  if (isViewingIntent && currentProduct) {
    const p = currentProduct;
    const priceStr = (p.sale_price || p.base_price || 0).toLocaleString('vi-VN');
    const desc = p.ai_selling_points || p.description || 'thiết kế hiện đại, chất liệu bền đẹp, đường may tỉ mỉ';

    const reply = `Dạ em gửi anh/chị xem hình ảnh và thông tin mẫu "${p.product_name}" bên em ạ! ✨\n- Đặc điểm: ${desc}\n- Giá ưu đãi: ${priceStr} VND\n- Bảng màu: ${availableColors || 'Đen, Trắng'}\n- Size số: ${availableSizes || 'M, L'}\n\nAnh/chị ưng màu nào hoặc cho em xin chiều cao + cân nặng để em tư vấn size chuẩn đẹp nhất cho mình nha!`;

    return {
      reply,
      image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
      is_order_intent: false,
      order_data: {
        product_id: p._id,
        product_name: p.product_name,
        sku: p.sku,
        price: p.sale_price || p.base_price || 0,
        quantity: 1,
        size: '', // Reset size, không tự ý gán Size M
        color: '',
        customer_name: extractedName,
        phone: '',
        shipping_address: ''
      },
      missing_fields: ['variant'],
      handover_to_staff: false
    };
  }

  // --- TRƯỜNG HỢP 2: Khách hỏi tư vấn SIZE theo chiều cao cân nặng ---
  if (isConsultingIntent && currentProduct) {
    const p = currentProduct;
    const sizeList = hasVariants ? [...new Set(p.variants_json.map((v) => v.size).filter(Boolean))] : ['M', 'L'];
    let suggestedSize = 'L';

    const weightMatch = text.match(/(\d{2,3})\s*(?:kg|kí|cân)?/i);
    const weightNum = weightMatch ? Number(weightMatch[1]) : 0;
    if (weightNum > 0) {
      if (weightNum < 58 && sizeList.includes('S')) suggestedSize = 'S';
      else if (weightNum <= 65 && sizeList.includes('M')) suggestedSize = 'M';
      else if (weightNum <= 75 && sizeList.includes('L')) suggestedSize = 'L';
      else if (sizeList.includes('XL')) suggestedSize = 'XL';
      else if (sizeList.includes('2XL') || sizeList.includes('XXL')) suggestedSize = '2XL';
      else suggestedSize = sizeList[sizeList.length - 1] || 'L';
    } else {
      suggestedSize = sizeList.includes('L') ? 'L' : (sizeList[0] || 'M');
    }

    const reply = `Dạ với thông số của mình thì mặc Size ${suggestedSize} là vừa vặn, chuẩn phom và thoải mái nhất ạ! Mẫu "${p.product_name}" bên em đang có sẵn các màu: ${availableColors || 'Đen, Trắng'}. Anh/chị thích tông màu nào để em hỗ trợ giữ hàng cho mình nha!`;

    return {
      reply,
      image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
      is_order_intent: false,
      order_data: {
        product_id: p._id,
        product_name: p.product_name,
        sku: p.sku,
        price: p.sale_price || p.base_price || 0,
        quantity: 1,
        size: suggestedSize,
        color: selectedColor || '',
        customer_name: extractedName,
        phone: '',
        shipping_address: ''
      },
      missing_fields: ['variant'],
      handover_to_staff: false
    };
  }

  // --- TRƯỜNG HỢP 3: Khách hỏi GIÁ sản phẩm ---
  if (isPriceIntent && currentProduct) {
    const p = currentProduct;
    const priceStr = (p.sale_price || p.base_price || 0).toLocaleString('vi-VN');
    return {
      reply: `Dạ sản phẩm "${p.product_name}" hiện đang có giá ưu đãi là ${priceStr} VND ạ! Anh/chị cần em tư vấn thêm về màu sắc hay size số theo chiều cao cân nặng không ạ?`,
      image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
      is_order_intent: false,
      order_data: null,
      missing_fields: [],
      handover_to_staff: false
    };
  }

  // --- TRƯỜNG HỢP 4: Khách có ý định MUA HÀNG hoặc cung cấp thông tin Đơn hàng ---
  if (isBuyingIntent && currentProduct) {
    // Chỉ kế thừa size nếu chính sản phẩm đó khớp
    const finalSize = selectedSize || (existingDraft?.product_name === currentProduct.product_name ? existingDraft?.size : '');
    const finalColor = selectedColor || (existingDraft?.product_name === currentProduct.product_name ? existingDraft?.color : '');
    const currentPhone = phone || existingDraft?.phone || '';
    const currentAddress = cleanAddress || existingDraft?.shipping_address || '';

    // Kiểm tra SĐT lỗi nếu khách có gõ SĐT
    if (phoneValidation && !phoneValidation.isValid && phoneValidation.phone && phoneValidation.errorReason !== 'NOT_FOUND') {
      return {
        reply: `Dạ số điện thoại "${phoneValidation.phone}" hình như chưa đủ 10 chữ số hoặc chưa đúng định dạng mạng di động ạ. Bạn kiểm tra lại và nhắn lại giúp shop nha!`,
        is_order_intent: false,
        order_data: null,
        missing_fields: ['phone'],
        handover_to_staff: false
      };
    }

    // Kiểm tra địa chỉ chung chung (VAGUE_AREA)
    if (addressQuality === 'VAGUE_AREA' && addressFeedback) {
      return {
        reply: addressFeedback,
        is_order_intent: false,
        order_data: null,
        missing_fields: ['shipping_address'],
        handover_to_staff: false
      };
    }

    // Bước 4.1: Chưa chọn Size/Màu
    if (hasVariants && !finalSize && availableSizes) {
      return {
        reply: `Dạ mẫu "${currentProduct.product_name}" bên em có các size: ${availableSizes}${availableColors ? ` và màu: ${availableColors}` : ''} ạ. Bạn muốn lấy size nào và màu gì hoặc cho shop xin chiều cao, cân nặng để em chọn size vừa vặn nhất cho mình nha!`,
        image_urls: Array.isArray(currentProduct.image_urls) ? currentProduct.image_urls : [],
        is_order_intent: false,
        order_data: {
          product_id: currentProduct._id,
          product_name: currentProduct.product_name,
          sku: currentProduct.sku,
          price: currentProduct.sale_price || currentProduct.base_price || 0,
          quantity,
          size: finalSize,
          color: finalColor,
          customer_name: extractedName,
          phone: currentPhone,
          shipping_address: currentAddress
        },
        missing_fields: ['variant'],
        handover_to_staff: false
      };
    }

    // Bước 4.2: Đã có Size nhưng thiếu SĐT
    if (!currentPhone) {
      const itemDesc = finalSize ? `${currentProduct.product_name} (Size ${finalSize}${finalColor ? `, Màu ${finalColor}` : ''})` : currentProduct.product_name;
      return {
        reply: `Dạ em đã giữ ${quantity} ${itemDesc} cho mình rồi ạ! Bạn cho shop xin Số điện thoại nhận hàng để bên em tiện liên hệ giao hàng nha!`,
        image_urls: [],
        is_order_intent: false,
        order_data: {
          product_id: currentProduct._id,
          product_name: currentProduct.product_name,
          sku: currentProduct.sku,
          price: currentProduct.sale_price || currentProduct.base_price || 0,
          quantity,
          size: finalSize,
          color: finalColor,
          customer_name: extractedName,
          phone: currentPhone,
          shipping_address: currentAddress
        },
        missing_fields: ['phone'],
        handover_to_staff: false
      };
    }

    // Bước 4.3: Đã có SĐT nhưng thiếu Địa chỉ cụ thể
    if (currentPhone && (!currentAddress || addressQuality === 'INCOMPLETE')) {
      return {
        reply: `Dạ em đã lưu số điện thoại ${currentPhone} của mình rồi ạ. Bạn cho shop xin thêm Địa chỉ nhận hàng cụ thể (Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP) để shop gửi hàng cho mình nhé!`,
        image_urls: [],
        is_order_intent: false,
        order_data: {
          product_id: currentProduct._id,
          product_name: currentProduct.product_name,
          sku: currentProduct.sku,
          price: currentProduct.sale_price || currentProduct.base_price || 0,
          quantity,
          size: finalSize,
          color: finalColor,
          customer_name: extractedName,
          phone: currentPhone,
          shipping_address: currentAddress
        },
        missing_fields: ['shipping_address'],
        handover_to_staff: false
      };
    }

    // Bước 4.4: ĐỦ TẤT CẢ THÔNG TIN -> TỰ ĐỘNG CHỐT ĐƠN HÀNG!
    if (currentPhone && currentAddress && addressQuality === 'VALID') {
      const p = currentProduct;
      const customerDisplayName = extractedName && extractedName !== 'Khách hàng' ? `anh/chị ${extractedName}` : 'anh/chị';
      const unitPrice = p ? (p.sale_price || p.base_price || 0) : 0;
      const totalAmount = (unitPrice * quantity).toLocaleString('vi-VN');

      return {
        reply: `Dạ em cảm ơn ${customerDisplayName} đã để lại thông tin đặt hàng ạ! Em đã lên đơn hàng cho mình:\n- Sản phẩm: ${p ? p.product_name : 'Sản phẩm'}${finalSize ? ` (Size: ${finalSize})` : ''}${finalColor ? ` (Màu: ${finalColor})` : ''} x ${quantity}\n- Người nhận: ${extractedName}\n- SĐT: ${currentPhone}\n- Địa chỉ giao: ${currentAddress}\n- Tổng tiền: ${totalAmount} VND (Thanh toán khi nhận hàng).\nChuyên viên của shop sẽ sớm liên hệ xác nhận và giao hàng cho mình nhé! ✨`,
        image_urls: [],
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
                  size: finalSize || 'Tiêu chuẩn',
                  color: finalColor || 'Mặc định',
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
  }

  // --- TRƯỜNG HỢP 5: Chào mừng và Gợi ý mẫu sản phẩm nổi bật ---
  const sampleProducts = rawProducts.slice(0, 3).map((p) => p.product_name).join(', ');
  const sampleImages = rawProducts.slice(0, 2).flatMap((p) => (Array.isArray(p.image_urls) ? p.image_urls : [])).filter(Boolean);
  return {
    reply: `Dạ shop xin chào anh/chị ạ! Hiện tại shop đang có các mẫu nổi bật như: ${sampleProducts || 'sản phẩm hot'}. Anh/chị đang quan tâm đến dòng nào hoặc cần tư vấn size, hãy gửi ảnh hoặc chiều cao + cân nặng để shop hỗ trợ ngay nhé!`,
    image_urls: sampleImages,
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
  messageText,
  customerImageUrls = []
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

    // 1. Phân tích qua Gemini AI kết hợp trạng thái đơn nháp đa bước & nhận diện ảnh
    const aiResult = await consultWithGeminiAI({
      business_id,
      channel_id,
      conversation_id,
      customer_id,
      messageText,
      customerName: customerFbName,
      orderDraft: currentDraft,
      customerImageUrls
    });

    let finalReply = aiResult.reply || 'Dạ em chào anh/chị, em có thể hỗ trợ gì cho mình ạ?';
    // Lớp lọc bảo vệ kép (Deterministic Safety Guard): Khử mọi link ảnh thô, localhost, /uploads/
    finalReply = finalReply
      .replace(/https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|webp|gif)/gi, '')
      .replace(/https?:\/\/localhost:\d+[^\s]*/gi, '')
      .replace(/\/uploads\/[^\s]+?\.(?:jpg|jpeg|png|webp|gif)/gi, '')
      .replace(/\[\s*(?:hình|ảnh|link)\s*\]\([^\)]+\)/gi, '')
      // Bộ lọc khử xưng hô lệch chuẩn (ngăn chặn hoàn toàn việc gọi khách là vợ/chồng)
      .replace(/\b(?:dạ\s+)?vợ\/chồng[,.]?\s*/gi, 'Dạ bạn ơi, ')
      .replace(/\bvợ\/chồng\b/gi, 'bạn')
      .replace(/\b(?:vk\/ck|vợ chồng)\b/gi, 'bạn')
      .replace(/\b(?:ông xã|bà xã)\b/gi, 'anh/chị')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();

    if (!finalReply) {
      finalReply = (Array.isArray(aiResult.image_urls) && aiResult.image_urls.length > 0)
        ? 'Dạ em gửi anh/chị xem hình ảnh thực tế của mẫu bên dưới nha! Anh/chị cần em tư vấn thêm màu hay size nào cứ nhắn em nhé.'
        : 'Dạ em chào anh/chị, em có thể hỗ trợ gì cho mình ạ?';
    }

    // Cập nhật các slot mới thu thập được vào order_draft
    if (aiResult.order_data) {
      const od = aiResult.order_data;
      if (!conversation.order_draft) conversation.order_draft = {};

      const isDifferentProduct = od.product_id && conversation.order_draft.product_id && String(conversation.order_draft.product_id) !== String(od.product_id);
      if (isDifferentProduct) {
        // Khách chuyển sang hỏi/chọn sản phẩm mới -> reset size, color của sản phẩm cũ
        conversation.order_draft.size = '';
        conversation.order_draft.color = '';
        conversation.order_draft.quantity = 1;
      }

      if (od.product_id) conversation.order_draft.product_id = od.product_id;
      if (od.product_name) conversation.order_draft.product_name = od.product_name;
      if (od.sku) conversation.order_draft.sku = od.sku;
      if (od.size !== undefined) conversation.order_draft.size = od.size;
      if (od.color !== undefined) conversation.order_draft.color = od.color;
      if (od.quantity) conversation.order_draft.quantity = od.quantity;
      if (od.price) conversation.order_draft.price = od.price;
      if (od.phone) {
        const phoneVal = validateAndSanitizePhone(od.phone);
        if (phoneVal.isValid) {
          conversation.order_draft.phone = phoneVal.phone;
        }
      }
      if (od.shipping_address) {
        const addrVal = evaluateAddressQuality(od.shipping_address);
        if (addrVal.quality === 'VALID' || addrVal.quality === 'VAGUE_AREA') {
          conversation.order_draft.shipping_address = addrVal.cleanAddress;
        }
      }
      if (od.customer_name && od.customer_name !== 'Khách hàng') conversation.order_draft.customer_name = od.customer_name;
      if (od.customer_note) conversation.order_draft.customer_note = od.customer_note;

      conversation.order_draft.status = 'COLLECTING';
      conversation.order_draft.updated_at = new Date();
    }

    // 2. Kiểm tra thẩm định điều kiện chốt ĐƠN HÀNG (Validation Gate)
    let createdOrder = null;
    const isDraftCollecting = conversation.order_draft?.status === 'COLLECTING';
    const finalPhone = (isDraftCollecting ? conversation.order_draft?.phone : '') || aiResult.order_data?.phone;
    const finalAddress = (isDraftCollecting ? conversation.order_draft?.shipping_address : '') || aiResult.order_data?.shipping_address;

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
              conversation_id: conversation._id,
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

          // Cập nhật trạng thái đơn nháp đã hoàn tất và reset các thông tin nhạy cảm để không bị tạo trùng đơn
          conversation.order_draft = {
            status: 'IDLE',
            product_id: null,
            product_name: '',
            size: '',
            color: '',
            quantity: 1,
            phone: '',
            shipping_address: '',
            last_order_id: createdOrder._id,
            last_order_code: createdOrder.order_code
          };
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
    const backendUrl = process.env.BACKEND_URL || 'https://ai-auto-backend.onrender.com';
    const normalizedImageUrls = (aiResult.image_urls || []).map((url) => {
      if (!url) return '';
      let resUrl = url;
      if (resUrl.includes('localhost:5000') || resUrl.includes('127.0.0.1:5000')) {
        resUrl = resUrl.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):5000/g, backendUrl);
      } else if (resUrl.startsWith('/uploads/')) {
        resUrl = `${backendUrl}${resUrl}`;
      }
      return resUrl;
    }).filter(Boolean);

    aiResult.image_urls = normalizedImageUrls;

    const attachments = normalizedImageUrls.map((url) => ({
      type: 'image',
      url
    }));

    const aiMessage = await Message.create({
      conversation_id: conversation._id,
      sender_type: 'AI_BOT',
      sender_id: null,
      content: finalReply,
      attachments,
      is_read: true
    });

    conversation.last_message_content = finalReply;
    conversation.last_message_text = finalReply;
    conversation.last_message_at = new Date();
    conversation.unread_count = 0; // AI đã trả lời thành công cho khách hàng
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
          $set: updateFields
        });
      }
    }

    // 5.1 Tự động gán nhãn thông minh dựa trên dữ liệu (Phone, Order, Product, Khách mới/Mua lại)
    let updatedConvWithTags = null;
    try {
      const phoneVal = conversation.order_draft?.phone || aiResult.order_data?.phone;
      const prodVal = conversation.order_draft?.product_name || aiResult.order_data?.product_name;
      updatedConvWithTags = await autoTagConversationService(conversation._id, {
        hasPhone: Boolean(phoneVal && String(phoneVal).length >= 10),
        phone: phoneVal,
        orderCreated: Boolean(createdOrder),
        productName: prodVal,
        customerId: customer_id
      });
    } catch (tagErr) {
      console.warn('[AutoTag Gemini Warn]', tagErr.message);
    }

    const convToEmit = updatedConvWithTags || conversation;

    // 6. Phát Socket.IO cho màn hình LiveChat
    try {
      const io = getIO();
      io.to(conversation._id.toString()).emit('new_message', aiMessage);
      if (business_id) {
        io.to(business_id.toString()).emit('conversation_updated', convToEmit);
      }
      io.emit('conversation_updated', convToEmit);
    } catch (sockErr) {
      console.warn('[Gemini AI Socket Warn]', sockErr.message);
    }

    return {
      handled: true,
      message_id: aiMessage._id,
      reply: finalReply,
      image_urls: aiResult.image_urls || [],
      order: createdOrder,
      handover: aiResult.handover_to_staff
    };
  } catch (error) {
    console.error('[Process Gemini AI Error]', error);
    return { handled: false, error: error.message };
  }
};
