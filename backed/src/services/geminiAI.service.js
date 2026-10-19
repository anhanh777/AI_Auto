import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIConfig,
  Product,
  Category,
  KnowledgeBase,
  Message,
  Conversation,
  Customer,
  Channel,
  Order
} from '../models/index.js';
import { createOrderService, updateOrderStatusService, updateOrderDetailsService } from './order.service.js';
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
 * Trích xuất danh sách URL ảnh đầy đủ của sản phẩm từ nhiều trường dữ liệu có thể có
 */
export const getProductImages = (p) => {
  if (!p) return [];
  const urls = [];
  if (Array.isArray(p.image_urls) && p.image_urls.length > 0) {
    urls.push(...p.image_urls);
  }
  if (p.image_url && typeof p.image_url === 'string') {
    urls.push(p.image_url);
  }
  if (Array.isArray(p.images) && p.images.length > 0) {
    p.images.forEach((img) => {
      if (typeof img === 'string') urls.push(img);
      else if (img && img.url) urls.push(img.url);
    });
  }
  return [...new Set(urls.filter(Boolean))];
};

/**
 * Cơ chế Tự động Bù Ảnh (Deterministic Image Auto-Hydration):
 * Khi khách yêu cầu xem ảnh / xem mẫu HOẶC khi câu trả lời của AI hứa gửi ảnh,
 * nếu mảng image_urls đang rỗng, hàm này sẽ tự động tìm kiếm sản phẩm hoặc danh mục
 * tương ứng từ ngữ cảnh để bù ảnh chính xác 100%.
 */
export const normalizeImageUrl = (url, backendUrl = (process.env.BACKEND_URL || 'https://ai-auto-backend.onrender.com')) => {
  if (!url || typeof url !== 'string') return '';
  let resUrl = url.trim().replace(/\\/g, '/');
  if (resUrl.includes('localhost:5000') || resUrl.includes('127.0.0.1:5000')) {
    resUrl = resUrl.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):5000/g, backendUrl);
  } else if (!/^https?:\/\//i.test(resUrl)) {
    if (!resUrl.startsWith('/')) {
      resUrl = '/' + resUrl;
    }
    resUrl = `${backendUrl.replace(/\/+$/, '')}${resUrl}`;
  }
  return resUrl;
};

/**
 * Cơ chế Tự động Bù Ảnh (Deterministic Image Auto-Hydration):
 * Khi khách yêu cầu xem ảnh / xem mẫu HOẶC khi câu trả lời của AI hứa gửi ảnh,
 * nếu mảng image_urls đang rỗng, hàm này sẽ tự động tìm kiếm sản phẩm hoặc danh mục
 * tương ứng từ ngữ cảnh để bù ảnh chính xác 100%.
 */
export const resolveImagesForReply = ({
  messageText = '',
  replyText = '',
  orderDraft = null,
  rawProducts = [],
  rawCategories = [],
  chatHistoryText = ''
}) => {
  const lowerMsg = (messageText || '').toLowerCase();
  const lowerReply = (replyText || '').toLowerCase();
  const lowerHistory = (chatHistoryText || '').toLowerCase();

  const isImageRequested = /(?:cho\s+(?:mình|em|anh|chị|tôi|tớ|bạn|khách|chúng\s*tôi)?\s*xem|xem\s+ảnh|cho\s+xem|xem\s+mẫu|xem\s+hàng|xem\s+sản\s+phẩm|xem\s+áo|xem\s+đồ|xem\s+váy|xem\s+quần|ảnh\s+thật|hình\s+ảnh|gửi\s+ảnh|gửi\s+hình|gửi\s+mẫu|ảnh\s+đâu|thấy\s+ảnh|chưa\s+thấy\s+ảnh|ko\s+thấy\s+ảnh|không\s+thấy\s+ảnh|xin\s+ảnh|có\s+ảnh|ảnh|hình)/i.test(lowerMsg);
  const isReplyPromisingImage = /(?:gửi\s+(?:bạn|anh|chị|em|mình|khách)?\s*(?:xem\s*)?(?:hình\s*ảnh|ảnh|mẫu)|hình\s*ảnh\s*(?:mẫu|thực\s*tế|sản\s*phẩm)|bên\s*dưới\s*(?:nha|nhé|ạ)|dưới\s*đây)/i.test(lowerReply);

  if (!isImageRequested && !isReplyPromisingImage) return [];

  const foundImages = [];

  // Helper tìm theo SKU
  const findBySku = (targetText) => {
    if (!targetText) return null;
    for (const p of rawProducts || []) {
      if (p.sku) {
        const skuLower = p.sku.toLowerCase();
        if (targetText.includes(skuLower)) {
          const imgs = getProductImages(p);
          if (imgs.length > 0) return imgs;
        }
      }
    }
    return null;
  };

  // Helper tìm theo Tên sản phẩm (ưu tiên tên dài trước)
  const findByName = (targetText) => {
    if (!targetText) return null;
    const sortedProds = [...(rawProducts || [])].sort((a, b) => (b.product_name || '').length - (a.product_name || '').length);
    for (const p of sortedProds) {
      const pName = (p.product_name || '').toLowerCase();
      if (pName && pName.length >= 2 && targetText.includes(pName)) {
        const imgs = getProductImages(p);
        if (imgs.length > 0) return imgs;
      }
    }
    return null;
  };

  // Helper tìm theo từ khóa nổi bật / Fuzzy (xử lý sai chính tả "thuê hoa" <-> "thêu hoa", trích xuất đặc trưng sản phẩm)
  const findByFuzzyKeywords = (targetText) => {
    if (!targetText) return null;
    const cleanTarget = targetText
      .replace(/thuê hoa/gi, 'thêu hoa')
      .replace(/[.,?!:;]/g, ' ')
      .toLowerCase();

    let bestMatch = null;
    let maxMatchedWords = 0;

    for (const p of rawProducts || []) {
      const pName = (p.product_name || '').toLowerCase();
      if (!pName) continue;
      const stopWords = new Set(['cho', 'tôi', 'mình', 'em', 'anh', 'chị', 'xem', 'với', 'nhé', 'nha', 'ạ', 'shop', 'có', 'còn', 'không', 'giá', 'bao', 'nhiêu', 'bán', 'được']);
      const pWords = pName.split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w));
      const targetWords = cleanTarget.split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w));

      let matchedCount = 0;
      for (const tw of targetWords) {
        if (pWords.includes(tw)) matchedCount++;
      }

      if (matchedCount >= 2 && matchedCount > maxMatchedWords) {
        maxMatchedWords = matchedCount;
        bestMatch = p;
      }
    }

    if (bestMatch) {
      const imgs = getProductImages(bestMatch);
      if (imgs.length > 0) return imgs;
    }
    return null;
  };

  // 1. Tìm SKU trong câu trả lời hiện tại hoặc tin nhắn của khách
  const skuImgs = findBySku(lowerReply) || findBySku(lowerMsg);
  if (skuImgs && skuImgs.length > 0) {
    foundImages.push(...skuImgs);
  }

  // 2. Tìm Tên sản phẩm trong câu trả lời hiện tại hoặc tin nhắn của khách (chính xác hoặc Fuzzy)
  if (foundImages.length === 0) {
    const nameImgs = findByName(lowerReply) || findByName(lowerMsg) || findByFuzzyKeywords(lowerReply) || findByFuzzyKeywords(lowerMsg);
    if (nameImgs && nameImgs.length > 0) {
      foundImages.push(...nameImgs);
    }
  }

  // 3. Tìm sản phẩm qua orderDraft hiện tại (khách đang tiếp tục hỏi về sản phẩm vừa được thảo luận)
  if (foundImages.length === 0 && orderDraft) {
    const draftSku = (orderDraft.sku || '').toLowerCase();
    const draftName = (orderDraft.product_name || '').toLowerCase();
    const draftId = orderDraft.product_id ? String(orderDraft.product_id) : '';

    const matched = (rawProducts || []).find((p) =>
      (draftSku && p.sku && p.sku.toLowerCase() === draftSku) ||
      (draftName && p.product_name && p.product_name.toLowerCase() === draftName) ||
      (draftId && String(p._id) === draftId)
    );

    if (matched) {
      const imgs = getProductImages(matched);
      if (imgs.length > 0) {
        foundImages.push(...imgs);
      }
    }
  }

  // 4. Tìm sản phẩm nhắc đến trong lịch sử chat gần nhất (chatHistoryText)
  if (foundImages.length === 0 && lowerHistory) {
    const historySkuImgs = findBySku(lowerHistory);
    if (historySkuImgs && historySkuImgs.length > 0) {
      foundImages.push(...historySkuImgs);
    } else {
      const historyNameImgs = findByName(lowerHistory) || findByFuzzyKeywords(lowerHistory);
      if (historyNameImgs && historyNameImgs.length > 0) {
        foundImages.push(...historyNameImgs);
      }
    }
  }

  // 5. Nếu khách hỏi về Danh mục / Bộ sưu tập (ví dụ: "Titan", "Chima", "Lego Titan")
  if (foundImages.length === 0 && Array.isArray(rawCategories) && rawCategories.length > 0) {
    for (const cat of rawCategories) {
      const cName = (cat.category_name || '').toLowerCase();
      if (cName && (lowerMsg.includes(cName) || lowerReply.includes(cName) || lowerHistory.includes(cName))) {
        const catProds = (rawProducts || []).filter((p) =>
          (p.category_ids || []).some((cid) => String(cid) === String(cat._id))
        );
        const catImgs = catProds.flatMap((p) => getProductImages(p)).filter(Boolean);
        if (catImgs.length > 0) {
          foundImages.push(...catImgs);
          break;
        }
      }
    }
  }

  return [...new Set(foundImages.filter(Boolean))];
};

/**
 * 1. Tổng hợp dữ liệu RAG Context (Knowledge Base + Sản phẩm còn hàng + Cấu hình AI + Lịch sử chat)
 */
export const buildRAGContext = async ({ business_id, conversation_id, customer_id = null, channel_id = null }) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  // Tra cứu thông tin Khách hàng và Kênh chat để xây dựng ngữ cảnh cá nhân hóa
  const [customer, channel] = await Promise.all([
    customer_id ? Customer.findById(customer_id).lean() : null,
    channel_id ? Channel.findById(channel_id).lean() : null
  ]);

  const channelName = channel?.page_name || 'Cửa hàng';
  const savedPhone = customer?.phone || customer?.phone_number || '';
  const savedAddress = customer?.shipping_address || customer?.address || '';
  const customerTags = Array.isArray(customer?.tags) ? customer.tags.join(', ') : '';

  // Điều kiện tìm kiếm đơn hàng: Ưu tiên lọc đơn hàng của đúng KÊNH hiện tại hoặc theo SĐT khách hàng
  const orderQueryConditions = [];
  if (conversation_id) orderQueryConditions.push({ conversation_id });
  if (customer_id) {
    if (channel_id) {
      orderQueryConditions.push({ customer_id, channel_id });
    } else {
      orderQueryConditions.push({ customer_id });
    }
  }
  if (savedPhone) {
    orderQueryConditions.push({ shipping_phone: savedPhone });
    orderQueryConditions.push({ customer_phone: savedPhone });
  }

  // A. Cấu hình AI của Business (ưu tiên channel_id, nếu không có fallback về business default)
  let aiConfig = await AIConfig.findOne({ business_id, channel_id: channel_id || null }).lean();
  if (!aiConfig && channel_id) {
    aiConfig = await AIConfig.findOne({ business_id, channel_id: null }).lean();
  }
  if (!aiConfig) {
    aiConfig = await AIConfig.findOne({ business_id }).lean();
  }

  const [categories, products, knowledgeList, recentMessages, recentOrders, channelOrderCount] = await Promise.all([
    // A. Danh mục sản phẩm đang hoạt động của Doanh nghiệp
    Category.find({ business_id, is_active: true })
      .select('category_name slug description')
      .lean(),

    // B. Danh mục sản phẩm đang mở bán kèm tồn kho và category_ids
    Product.find({ business_id, status: 'ACTIVE' })
      .select('product_name sku base_price sale_price stock_available variants_json ai_selling_points description image_urls category_ids')
      .limit(60)
      .lean(),

    // C. Kho tri thức FAQ & Chính sách
    KnowledgeBase.find({ business_id, is_active: true })
      .select('title category content action_type keywords')
      .lean(),

    // D. Lịch sử 8 tin nhắn gần nhất
    conversation_id
      ? Message.find({ conversation_id })
          .sort({ created_at: -1 })
          .limit(8)
          .lean()
      : [],

    // E. Các đơn hàng gần đây của khách hàng tại Kênh chat này (để AI tra cứu trạng thái đơn hàng khi khách hỏi)
    orderQueryConditions.length > 0
      ? Order.find({
          business_id,
          $or: orderQueryConditions
        })
          .sort({ created_at: -1 })
          .limit(5)
          .lean()
      : [],

    customer_id
      ? Order.countDocuments({
          business_id,
          customer_id,
          ...(channel_id ? { channel_id } : {})
        })
      : 0
  ]);

  const sortedHistory = recentMessages.reverse();

  // Xây dựng Bản đồ Danh mục & Sản phẩm (Store Catalog Map)
  const categoryLookup = {};
  (categories || []).forEach((c) => {
    categoryLookup[c._id.toString()] = c.category_name;
  });

  const catalogGroup = {};
  (categories || []).forEach((c) => {
    catalogGroup[c.category_name] = [];
  });
  catalogGroup['Khác'] = [];

  const productContextText = products.map((p) => {
    const price = p.sale_price || p.base_price;
    const variantsStr = Array.isArray(p.variants_json) && p.variants_json.length > 0
      ? p.variants_json.map((v) => `${v.size || ''}/${v.color || ''} (còn ${v.stock || 0})`).join(', ')
      : 'Không có biến thể';
    const imgUrls = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls.join(', ') : 'Chưa có ảnh';

    const matchedCats = (p.category_ids || [])
      .map((cid) => categoryLookup[cid?.toString() || String(cid)])
      .filter(Boolean);
    const catStr = matchedCats.length > 0 ? matchedCats.join(', ') : 'Chung';

    if (matchedCats.length > 0) {
      matchedCats.forEach((cName) => {
        if (!catalogGroup[cName]) catalogGroup[cName] = [];
        catalogGroup[cName].push(`${p.product_name} (SKU: ${p.sku}, Giá: ${price.toLocaleString('vi-VN')} VND, Tồn: ${p.stock_available})`);
      });
    } else {
      catalogGroup['Khác'].push(`${p.product_name} (SKU: ${p.sku}, Giá: ${price.toLocaleString('vi-VN')} VND, Tồn: ${p.stock_available})`);
    }

    return `- [SKU: ${p.sku}] ${p.product_name} | Danh mục: ${catStr} | Giá: ${price.toLocaleString('vi-VN')} VND | Tồn khả dụng: ${p.stock_available} | Biến thể: ${variantsStr} | Đặc điểm: ${p.ai_selling_points || p.description || ''} | Ảnh sản phẩm: ${imgUrls}`;
  }).join('\n');

  const catalogLines = [];
  Object.entries(catalogGroup).forEach(([catName, list]) => {
    if (list && list.length > 0) {
      catalogLines.push(`- Danh mục "${catName}": ${list.join('; ')}`);
    }
  });
  const catalogContextText = catalogLines.length > 0
    ? catalogLines.join('\n')
    : 'Chưa có phân loại danh mục cụ thể.';

  const advisoryKnowledge = [];
  const actionableKnowledge = [];

  (knowledgeList || []).forEach((k) => {
    const actType = k.action_type || 'NONE';
    if (actType === 'NONE') {
      advisoryKnowledge.push(`- [${k.category}] ${k.title}: ${k.content}`);
    } else {
      actionableKnowledge.push(`- [QUY TRÌNH HÀNH ĐỘNG HỆ THỐNG - MÃ LỆNH: ${actType}] ${k.title}: ${k.content}`);
    }
  });

  const knowledgeContextText = advisoryKnowledge.length > 0
    ? advisoryKnowledge.join('\n')
    : 'Chưa có tài liệu FAQ bổ sung.';

  const actionableKnowledgeText = actionableKnowledge.length > 0
    ? actionableKnowledge.join('\n')
    : 'Hiện tại chưa có quy trình can thiệp hệ thống nào.';

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
        let operationalNote = '';
        if (o.order_status === 'SHIPPING') {
          operationalNote = ' [ĐÃ BÀN GIAO BƯU TÁ ĐANG GIAO - TUYỆT ĐỐI KHÔNG SỬA ĐƠN HOẶC HỦY ĐƠN TRỰC TIẾP]';
        } else if (o.order_status === 'COMPLETED' || o.order_status === 'DELIVERED') {
          operationalNote = ' [ĐÃ GIAO THÀNH CÔNG - KHÔNG SỬA ĐƠN NÀY, TƯ VẤN ĐỔI TRẢ TRONG 3 NGÀY NẾU KHÁCH CẦN]';
        } else if (o.order_status === 'CANCELLED') {
          operationalNote = ' [ĐƠN ĐÃ HỦY - KHÔNG SỬA ĐƠN, MỜI TẠO ĐƠN MỚI]';
        } else if (['PENDING', 'CONFIRMED'].includes(o.order_status)) {
          operationalNote = ' [CHỜ DUYỆT - ĐƯỢC PHÉP CẬP NHẬT HOẶC HỦY ĐƠN NẾU KHÁCH YÊU CẦU]';
        }
        return `- Mã đơn: #${o.order_code} | Shop: ${channelName} | Trạng thái: ${stName}${operationalNote} | Sản phẩm: ${items} | Người nhận: ${o.shipping_customer_name || o.customer_name} | SĐT: ${o.shipping_phone || o.customer_phone} | Địa chỉ: ${o.shipping_address} | Tổng tiền: ${(o.total_amount || 0).toLocaleString('vi-VN')} VND | Ngày đặt: ${new Date(o.created_at).toLocaleString('vi-VN')}`;
      }).join('\n')
    : `Khách hàng này hiện chưa có đơn hàng nào tại shop "${channelName}".`;

  const savedAddressCheck = savedAddress ? evaluateAddressQuality(savedAddress) : null;
  const savedAddressDisplay = savedAddress
    ? (savedAddressCheck && savedAddressCheck.quality !== 'VALID'
        ? `${savedAddress} (LƯU Ý QUAN TRỌNG: Địa chỉ này đang thiếu số nhà/tên đường cụ thể. Bắt buộc xin bổ sung số nhà/đường trước khi chốt đơn!)`
        : savedAddress)
    : 'Chưa có';

  const customerProfileText = customer
    ? `- Họ tên: ${customer.full_name}
- Số điện thoại đã lưu trong hệ thống: ${savedPhone || 'Chưa có'}
- Địa chỉ giao hàng đã lưu: ${savedAddressDisplay}
- Phân loại khách hàng: ${customerTags || (channelOrderCount > 0 ? 'Khách quen / Đã mua hàng' : 'Khách mới')}
- Lịch sử mua sắm: Đã có ${channelOrderCount} đơn hàng thành công tại shop "${channelName}"`
    : 'Chưa có hồ sơ khách hàng trước đó.';

  const channelContextText = `- Tên Fanpage / Cửa hàng: "${channelName}"
- Loại kênh: ${channel?.channel_type || 'Facebook Messenger'}
- Lưu ý quyền hạn: Bạn là đại diện tư vấn độc quyền của shop "${channelName}". Hãy tư vấn và hỗ trợ đơn hàng với tư cách là shop "${channelName}".`;

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
    catalogContextText,
    rawCategories: categories || [],
    productContextText: productContextText || 'Hiện tại chưa có sản phẩm nào trong kho.',
    knowledgeContextText: knowledgeContextText || 'Chưa có tài liệu FAQ bổ sung.',
    actionableKnowledgeText: actionableKnowledgeText,
    chatHistoryText: chatHistoryText || 'Đây là tin nhắn đầu tiên của khách.',
    ordersContextText: ordersContextText,
    recentOrders: recentOrders || [],
    rawProducts: products,
    customer,
    channel,
    channelName,
    savedPhone,
    savedAddress,
    customerProfileText,
    channelContextText,
    channelOrderCount
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
  const {
    aiConfig,
    catalogContextText,
    rawCategories,
    productContextText,
    knowledgeContextText,
    actionableKnowledgeText,
    chatHistoryText,
    ordersContextText,
    rawProducts,
    customer,
    channel,
    channelName,
    savedPhone,
    savedAddress,
    customerProfileText,
    channelContextText,
    channelOrderCount
  } = ragContext;

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
      categories: rawCategories,
      chatHistoryText,
      ordersContextText,
      defaultCustomerName: customerName,
      existingDraft: orderDraft,
      customerImageUrls,
      savedPhone,
      savedAddress,
      channelName
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
Bạn là ${aiConfig.bot_name || 'Trợ lý AI tư vấn bán hàng'}, đại diện chính thức và độc quyền của shop/Fanpage: "${channelName}".
Phong cách & Giọng điệu của bạn: ${toneInstruction}
Tên tài khoản người chat (Facebook): "${fallbackCustomerName}".
Lời căn dặn của chủ shop: "${aiConfig.system_prompt || 'Bạn là chuyên viên tư vấn bán hàng thông minh, nhiệt tình và chu đáo. Hãy chào đón khách hàng, giải đáp chi tiết thông tin sản phẩm và hỗ trợ đặt hàng lịch sự, nhanh chóng.'}"

=== CỬA HÀNG ĐANG TRÒ CHUYỆN ===
${channelContextText}

=== HỒ SƠ KHÁCH HÀNG (CUSTOMER PROFILE) ===
${customerProfileText}

=== BẢN ĐỒ DANH MỤC & NHÓM SẢN PHẨM CỦA SHOP (STORE CATALOG - CỰC KỲ QUAN TRỌNG) ===
${catalogContextText}

=== THÔNG TIN SẢN PHẨM & TỒN KHO THỰC TẾ (RAG) ===
${productContextText}

=== CHÍNH SÁCH BÁN HÀNG & KHO TRI THỨC TƯ VẤN (FAQ - KHÔNG CAN THIỆP CSDL) ===
${knowledgeContextText}

=== CÁC QUY TRÌNH ĐƯỢC PHÉP CAN THIỆP HỆ THỐNG (ACTIONABLE RAG - CỰC KỲ QUAN TRỌNG) ===
${actionableKnowledgeText}

=== THÔNG TIN ĐƠN HÀNG GẦN NHẤT CỦA KHÁCH HÀNG TẠI CỬA HÀNG "${channelName}" (RAG) ===
${ordersContextText || `Khách hàng này hiện chưa có đơn hàng nào tại shop "${channelName}".`}

=== TRẠNG THÁI GIỎ HÀNG TẠM THỜI (ORDER DRAFT HIỆN TẠI) ===
- Sản phẩm đã chọn: ${orderDraft?.product_name || 'Chưa chọn'}
- Size: ${orderDraft?.size || 'Chưa chọn'}
- Màu: ${orderDraft?.color || 'Chưa chọn'}
- Số lượng: ${orderDraft?.quantity || 1}
- SĐT đã lưu: ${orderDraft?.phone || savedPhone || 'Chưa có'}
- Địa chỉ đã lưu: ${orderDraft?.shipping_address || savedAddress || 'Chưa có'}

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

1. GIAI ĐOẠN 1 - KHÁM PHÁ / XEM MẪU / XEM ẢNH / TRA CỨU DANH MỤC:
   - KHI KHÁCH HỎI THEO DANH MỤC / BỘ SƯU TẬP / DÒNG SẢN PHẨM (Ví dụ: "bên mình có lego titan ko", "các mẫu titan", "danh mục chima", "shop có những loại nào", "cho xem mẫu lego robot"):
     + BẮT BUỘC đối chiếu với mục "BẢN ĐỒ DANH MỤC & NHÓM SẢN PHẨM CỦA SHOP" ở trên.
     + Nếu shop có danh mục đó (hoặc từ khóa tương đồng, ví dụ khách hỏi "lego titan" mà shop có danh mục "Titan"):
       * Khẳng định ngay rằng shop CÓ dòng sản phẩm/danh mục này (Ví dụ: "Dạ shop có dòng Lego Titan ạ!").
       * Liệt kê đầy đủ tên các sản phẩm thuộc danh mục (ví dụ danh mục Titan có Gavi và Levi), kèm mức giá cụ thể của từng sản phẩm.
       * BẮT BUỘC trích xuất TOÀN BỘ link ảnh (từ trường "Ảnh sản phẩm") của TẤT CẢ các sản phẩm trong danh mục đó vào mảng "image_urls" của JSON để hệ thống tự động gửi ảnh sang Messenger cho khách xem!
       * Đưa ra câu hỏi gợi ý chốt chọn mẫu thân thiện (ví dụ: "Dòng Titan bên em đang có 2 mẫu Gavi (33.333đ) và Levi (39.999đ) rất đẹp, bạn thích mẫu nào hơn để shop hỗ trợ tư vấn chi tiết cho mình nha! ❤️").
   - Khi khách bảo "cho mình xem...", "gửi ảnh...", "có mẫu nào...", "sản phẩm này thế nào", "xem hình ảnh của từng sản phẩm", "cho mình xem ảnh", "xem ảnh":
     + Niềm nở giới thiệu đặc điểm nổi bật, thiết kế và mức giá ưu đãi của các sản phẩm.
     + BẮT BUỘC: Khi khách yêu cầu xem ảnh (kể cả câu ngắn gọn như "cho mình xem ảnh", "gửi ảnh", "xem ảnh"), BẮT BUỘC trích xuất chính xác toàn bộ link URL ảnh của sản phẩm đang trao đổi (hoặc sản phẩm vừa nhắc ở câu trước) từ trường "Ảnh sản phẩm" ở trên vào mảng "image_urls" của JSON. Tuyệt đối KHÔNG ĐỂ MẢNG "image_urls": [] RỖNG khi câu trả lời nói "shop gửi bạn xem hình ảnh bên dưới nha"!
     + CỰC KỲ QUAN TRỌNG: TUYỆT ĐỐI KHÔNG VIẾT các đường link URL ảnh (như http://..., localhost:5000..., /uploads/...) vào trong nội dung văn bản "reply"! Hãy để văn bản tự nhiên, lịch sự (Ví dụ: "Dạ shop gửi bạn xem hình ảnh mẫu bên dưới nha!"). Mọi đường link URL ảnh CHỈ ĐƯỢC PHÉP đặt vào mảng "image_urls" của JSON, hệ thống sẽ tự động chuyển thành hình ảnh thực tế gửi sang Facebook cho khách!
     + Hỏi khéo mẫu hoặc màu sắc mà khách ưng ý nhất để tư vấn sâu hơn.
     + TUYỆT ĐỐI KHÔNG tự tiện chọn size (như tự ý gán Size M), KHÔNG nói "đã giữ hàng", KHÔNG đòi số điện thoại khi khách chỉ muốn xem mẫu!
2. GIAI ĐOẠN 2 - TƯ VẤN SIZE & MÀU THEO CHIỀU CAO CÂN NẶNG:
   - Khi khách gửi chiều cao cân nặng (vd: 1m70 65kg, cao 1m65 55kg...):
     + Dựa trên các size sẵn có trong kho (M, L, XL...) để khuyên khách chọn size vừa vặn, tôn dáng nhất.
     + Giới thiệu các màu có sẵn và hỏi khách thích màu nào để shop chuẩn bị.
3. GIAI ĐOẠN 3 - CHỐT MUA RÕ RÀNG (BUYING INTENT):
   - CHỈ KHI khách nói rõ muốn mua (vd: "lấy mình 1 cái...", "đặt 1 cái size L màu đen", "ship cho mình", "mình lấy cái này", "chốt cho mình", "cho mình đặt"):
     + Nếu chưa rõ Size hoặc Màu (đối với sản phẩm có biến thể size/màu): Hỏi nốt size/màu còn thiếu trước khi xác nhận.
     + NẾU ĐÃ RÕ SIZE VÀ MÀU (hoặc sản phẩm không có biến thể):
       * TRƯỜNG HỢP A - KHÁCH HÀNG CŨ (Hồ sơ khách hàng ở trên ĐÃ CÓ sẵn SĐT "${savedPhone || ''}" hoặc Địa chỉ "${savedAddress || ''}"):
         > TUYỆT ĐỐI KHÔNG HỎI XIN LẠI SĐT VÀ ĐỊA CHỈ TỪ ĐẦU NHƯ NGƯỜI LẠ!
         > Bạn phải nhận diện ngay đây là khách quen. Xác nhận sản phẩm và chủ động đề xuất gửi về địa chỉ & SĐT cũ:
         > Mẫu câu chuẩn:
           "Dạ vâng ${fallbackCustomerName} ơi, shop ghi nhận bạn lấy mẫu [Tên SP] size [Size] màu [Màu] rồi ạ! Em thấy địa chỉ nhận hàng trước đây của bạn là ${savedAddress} (SĐT: ${savedPhone}), shop gửi về địa chỉ này cho bạn luôn nhé ạ? Hay bạn muốn giao đến địa chỉ khác ạ? ❤️"
         > Đặt "is_order_intent": false (chờ khách xác nhận 1 câu đồng ý ở lượt chat tiếp theo thì mới chốt đơn).
         > Đưa thông tin sản phẩm, size, color, quantity vào "order_data".
       * TRƯỜNG HỢP B - KHÁCH HÀNG MỚI (chưa có SĐT và Địa chỉ trong hồ sơ):
         > Xác nhận giữ hàng và xin Số điện thoại nhận hàng.
4. GIAI ĐOẠN 4 - THU THẬP & THẨM ĐỊNH SĐT + ĐỊA CHỈ (CHECKOUT):
   - ĐỐI VỚI KHÁCH HÀNG CŨ KHI ĐƯỢC HỎI XÁC NHẬN ĐỊA CHỈ CŨ:
     + Khi khách trả lời ĐỒNG Ý hoặc XÁC NHẬN gửi về địa chỉ/SĐT cũ (ví dụ khách nói: "ừ", "ok", "đúng rồi", "gửi về đó đi", "gửi về địa chỉ cũ đi", "chuẩn rồi", "giao về đó cho mình", "vâng shop", "ok em", "đúng rồi shop", "gửi luôn đi", "vâng gửi về đó nhé"):
       * ĐÂY CHÍNH LÀ LỆNH CHỐT ĐƠN HÀNG HOÀN TẤT!
       * BẮT BUỘC ĐẶT: "is_order_intent": true
       * BẮT BUỘC ĐIỀN ĐẦY ĐỦ TRONG "order_data":
         {
           "customer_name": "${fallbackCustomerName}",
           "phone": "${savedPhone}",
           "shipping_address": "${savedAddress}",
           "items": [
             {
               "sku": "Mã SKU của sản phẩm",
               "product_name": "Tên sản phẩm",
               "size": "Size của sản phẩm",
               "color": "Màu của sản phẩm",
               "quantity": 1
             }
           ]
         }
       * Phản hồi (reply): Xác nhận chốt đơn thành công, tóm tắt rõ: Tên SP, Size, Màu, Số lượng, Người nhận, SĐT (${savedPhone}), Địa chỉ nhận hàng (${savedAddress}), và cảm ơn bạn ${fallbackCustomerName} đã tiếp tục tin tưởng đồng hành cùng shop!
     + Nếu khách báo muốn gửi về địa chỉ hoặc SĐT khác (vd: "gửi về địa chỉ khác", "đổi sđt...", hoặc khách gõ SĐT/Địa chỉ mới như "đổi địa chỉ Hà Nam", "ship về Hà Nội", "đổi sang Đà Nẵng"):
       * BẮT BUỘC KIỂM TRA ĐỊA CHỈ: Địa chỉ giao hàng BẮT BUỘC phải có tối thiểu 3 cấp hành chính: [Số nhà + Tên đường/ngõ/thôn/xóm] + [Phường/Xã] + [Quận/Huyện/Thị xã] + [Tỉnh/Thành phố].
       * LỖI ĐỊA CHỈ THIẾU CẤP (Khách chỉ nhắn mỗi tên tỉnh/thành hoặc quận/huyện như "Hà Nam", "Hà Nội", "Đà Nẵng", "Cầu Giấy", "Hải Phòng"... mà THIẾU số nhà, tên đường, thôn/xóm):
         > TUYỆT ĐỐI CẤM TÓM TẮT ĐƠN HÀNG ĐỂ CHỐT!
         > TUYỆT ĐỐI CẤM BẢO KHÁCH "nhắn Đúng hoặc Xác nhận để lên đơn"!
         > TUYỆT ĐỐI CẤM BÁO "tiến hành lên đơn", "đã lên đơn", "đã tạo đơn", "sớm đóng gói và gửi"!
         > BẮT BUỘC ĐẶT: "is_order_intent": false, "order_data": null.
         > BẮT BUỘC phản hồi theo đúng quy chuẩn từ chối trong kho tri thức:
           "Dạ nàng ơi, để gói hàng được giao tận tay nhanh nhất, nàng bổ sung giúp shop chi tiết: Số nhà, Tên đường (hoặc thôn/xóm), Phường/Xã và Quận/Huyện/Tỉnh nhé ạ! ❤️"
     + KHI KHÁCH NHẮN "OK CHỐT", "XÁC NHẬN", "ĐÚNG RỒI", "LÊN ĐƠN ĐI" NHƯNG ĐỊA CHỈ TRONG ĐƠN CHƯA ĐỦ SỐ NHÀ/ĐƯỜNG (CHỈ CÓ TÊN TỈNH/THÀNH CHUNG CHUNG):
       * TUYỆT ĐỐI CẤM XÁC NHẬN ĐÃ TẠO ĐƠN THÀNH CÔNG!
       * BẮT BUỘC ĐẶT: "is_order_intent": false, "order_data": null.
       * Nhẹ nhàng thông báo: "Dạ nàng ơi, đơn hàng của mình sắp hoàn tất rồi ạ! Để shipper giao tận tay, nàng bổ sung giúp shop chi tiết: Số nhà, Tên đường (hoặc thôn/xóm), Phường/Xã và Quận/Huyện/Tỉnh nhé ạ! ❤️"
   - ĐỐI VỚI KHÁCH HÀNG MỚI HOẶC TỰ CUNG CẤP SĐT VÀ ĐỊA CHỈ MỚI:
     + KIỂM TRA SỐ ĐIỆN THOẠI (BẮT BUỘC ĐÚNG 10 CHỮ SỐ):
       * Số điện thoại di động Việt Nam hợp lệ phải có ĐÚNG 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).
       * Nếu khách nhập số điện thoại thừa số (như 11-14 số ví dụ 03938828282828), thiếu số (<10 số) hoặc số ảo lặp: TUYỆT ĐỐI KHÔNG XÁC NHẬN "đã ghi nhận SĐT"! Bắt buộc phải phản hồi lịch sự nhắc khách kiểm tra lại (Ví dụ: "Dạ số điện thoại của mình hình như chưa đúng định dạng 10 chữ số, anh/chị kiểm tra và nhắn lại giúp em nha!"). Đặt "is_order_intent": false.
     + KIỂM TRA ĐỊA CHỈ NHẬN HÀNG:
       * Địa chỉ hợp lệ phải có đủ thông tin để shipper có thể giao hàng (Số nhà, tên đường/ngõ/thôn/xóm kèm phường/xã, quận/huyện, tỉnh/TP).
       * Nếu khách nhập địa chỉ trêu đùa, vu vơ hoặc quá chung chung (như "nhà bà nào", "ở nhà", "hà nội", "gần trường học"): Bắt buộc giữ lại số điện thoại (nếu hợp lệ) và nhẹ nhàng xin lại địa chỉ cụ thể chi tiết. Đặt "is_order_intent": false.
     + CHỈ ĐẶT "is_order_intent": true KHI CẢ SĐT (CHUẨN 10 CHỮ SỐ) VÀ ĐỊA CHỈ (CỤ THỂ, GIAO HÀNG ĐƯỢC) ĐỀU HOÀN TOÀN ĐẦY ĐỦ! Khi đó mới tóm tắt đơn hàng và gửi lời cảm ơn.
5. PHÁT HIỆN YÊU CẦU GẶP NHÂN VIÊN (Handover):
   - Nếu khách yêu cầu gặp người thật, khiếu nại gay gắt hoặc tức giận, đặt "handover_to_staff": true.
6. NHẬN DIỆN SẢN PHẨM QUA HÌNH ẢNH (MULTIMODAL VISION):
   - Khi khách gửi hình ảnh hoặc trích dẫn ảnh hỏi ("ảnh này là sản phẩm nào", "mẫu này còn không", "cho mình xin giá cái này", "sản phẩm trong hình là gì", "mẫu này là mẫu nào"):
     + Bạn ĐANG ĐƯỢC TRUYỀN HÌNH ẢNH THẬT đính kèm tin nhắn này. Hãy quan sát thật kỹ hình ảnh: nhận diện màu sắc, chi tiết, đặc điểm nhân vật, con vật, trang phục hoặc hình dáng.
     + So sánh đối chiếu trực tiếp với Danh mục sản phẩm ở trên.
     + Khẳng định chính xác sản phẩm tương ứng trong kho (Ví dụ: "Dạ hình ảnh bạn vừa hỏi chính là mẫu [Tên sản phẩm] (SKU: [Mã SKU]) bên em đó ạ! Mẫu này có giá [Giá] VND...").
     + Trích xuất URL ảnh của sản phẩm này vào mảng "image_urls" của JSON trả về để tiếp tục hiển thị cho khách.
7. TRA CỨU & KIỂM TRA ĐƠN HÀNG ĐÃ ĐẶT (ORDER INQUIRY - PHÂN TÁCH KÊNH ĐỘC QUYỀN):
   - Khi khách hỏi "tôi cần biết thông tin đơn hàng vừa đặt", "kiểm tra đơn hàng", "đơn hàng của tôi", "khi nào giao hàng", "xem lại đơn hàng", "tôi đã đặt những gì", "tôi có đang đặt đơn hàng nào ở shop mình chưa", "tôi có đơn nào không", "xem tôi có đơn hàng nào":
     + TUYỆT ĐỐI KHÔNG TẠO ĐƠN HÀNG MỚI! KHÔNG lấy câu hỏi này làm địa chỉ giao hàng! BẮT BUỘC đặt "is_order_intent": false và "order_data": null.
     + NGUYÊN TẮC PHÂN TÁCH KÊNH (CHANNEL ISOLATION):
       * Bạn là đại diện của shop/kênh: "${channelName}".
       * Bạn CHỈ tra cứu và phản hồi các đơn hàng thuộc đúng shop "${channelName}" được cung cấp ở mục "=== THÔNG TIN ĐƠN HÀNG GẦN NHẤT CỦA KHÁCH HÀNG TẠI CỬA HÀNG \"${channelName}\" (RAG) ===".
       * Nếu có đơn hàng (#DH-...): Báo rõ mã đơn, tên sản phẩm, địa chỉ, trạng thái.
       * Nếu mục RAG ghi "Khách hàng này hiện chưa có đơn hàng nào tại shop \"${channelName}\"" (hoặc không có đơn hàng nào):
         BẮT BUỘC trả lời rõ ràng rằng khách chưa có đơn nào tại shop "${channelName}".
         Ví dụ: "Dạ em kiểm tra trên hệ thống của shop ${channelName} thì hiện tại mình chưa có đơn hàng nào đang đặt ạ. Bạn có muốn tham khảo mẫu nào bên shop em để em hỗ trợ tư vấn và lên đơn cho mình không nha! ❤️"
          TUYỆT ĐỐI KHÔNG nhận vơ đơn hàng của các shop/fanpage khác!

8. QUY TẮC THỰC THI HÀNH ĐỘNG HỆ THỐNG (ACTIONABLE RAG - CỰC KỲ QUAN TRỌNG):
   Bạn ĐƯỢC PHÉP thay đổi CSDL khi khách hàng thỏa mãn các điều kiện trong mục "CÁC QUY TRÌNH ĐƯỢC PHÉP CAN THIỆP HỆ THỐNG":

   A. HỦY ĐƠN HÀNG (CANCEL_ORDER):
      - ĐIỀU KIỆN TIÊN QUYẾT: CHỈ ĐƯỢC PHÉP HỦY ĐƠN khi đơn hàng đang ở trạng thái "Chờ xác nhận" (PENDING) hoặc "Đã xác nhận" (CONFIRMED).
      - Khi khách yêu cầu hủy đơn (ví dụ: "tôi muốn hủy", "hủy đơn giúp mình", "hủy hàng", "không lấy nữa"):
        + Trường hợp 1: Đơn đang ở trạng thái PENDING hoặc CONFIRMED:
          * Bước 1: Hỏi xác nhận lịch sự, nêu rõ mã đơn, tên sản phẩm và tổng tiền (Ví dụ: "Dạ bạn ơi, shop thấy bạn có đơn #DH-... gồm... Bạn có muốn xác nhận hủy đơn này không để shop hỗ trợ cập nhật trên hệ thống cho mình nhé? ❤️"). Lúc này đặt "order_action": null.
          * Bước 2: Khi khách phản hồi ĐỒNG Ý / XÁC NHẬN HỦY (ví dụ: "đúng", "ừ", "hủy đi", "xác nhận", "ok", "chuẩn rồi"):
            > Phản hồi (reply): Lịch sự thông báo shop đã cập nhật hủy đơn hàng #DH-... trên hệ thống cho bạn rồi ạ.
            > Trả về trong JSON: "order_action": { "type": "CANCEL_ORDER", "order_code": "Mã đơn hàng", "reason": "Khách xác nhận hủy đơn qua chat" }
        + Trường hợp 2: Đơn đang ở trạng thái "Đang giao hàng" (SHIPPING):
          * TUYỆT ĐỐI NGHIÊM CẤM KHÔNG ĐƯỢC HỦY ĐƠN! TUYỆT ĐỐI KHÔNG xuất action CANCEL_ORDER!
          * Phản hồi (reply): Giải thích rõ ràng và nhã nhặn: "Dạ bạn ơi, đơn hàng #DH-... của bạn hiện đã được đóng gói và bàn giao cho bưu tá đi giao rồi ạ, nên hệ thống không thể hủy trực tiếp được nữa. Khi shipper liên hệ giao hàng, bạn có thể từ chối nhận giúp shop hoặc liên hệ hotline để bên em hỗ trợ xử lý hoàn đơn nhé ạ! Cảm ơn bạn rất nhiều ạ! ❤️"
        + Trường hợp 3: Đơn đã ở trạng thái "Hoàn thành" (COMPLETED) hoặc "Đã giao thành công" (DELIVERED):
          * Không hủy đơn. Hướng dẫn khách chính sách đổi trả / đổi size trong vòng 3 ngày nếu sản phẩm chưa vừa ý.
        + Trường hợp 4: Đơn đã ở trạng thái "Đã hủy" (CANCELLED):
          * Giải thích rõ đơn hàng này đã được ghi nhận hủy trên hệ thống từ trước rồi ạ.

   B. CẬP NHẬT ĐƠN HÀNG (UPDATE_ORDER):
      - ĐIỀU KIỆN TIÊN QUYẾT: CHỈ ĐƯỢC PHÉP CẬP NHẬT khi đơn hàng cần sửa đang ở trạng thái "Chờ xác nhận" (PENDING) hoặc "Đã xác nhận" (CONFIRMED).
      - Trường hợp 1: Đơn đang ở trạng thái PENDING hoặc CONFIRMED:
        + Khi khách muốn sửa đơn, đổi mẫu/màu/size, tăng/giảm số lượng, hoặc mua thêm vào đơn vừa đặt:
        + BẮT BUỘC ĐẶT "is_order_intent": false và "order_data": null (để không tạo đơn mới trùng lặp).
        + BẮT BUỘC trả về trong JSON:
          "order_action": {
            "type": "UPDATE_ORDER",
            "order_code": "Mã đơn hàng cần sửa (ví dụ: DH-1005642 hoặc lấy mã đơn gần nhất)",
            "reason": "Khách sửa sản phẩm / đổi thông tin đơn",
            "update_payload": {
              "shipping_address": "địa chỉ mới nếu đổi",
              "phone": "SĐT mới nếu đổi",
              "items": [
                {
                  "product_name": "Tên sản phẩm",
                  "quantity": 2, // Số lượng mới đầy đủ sau khi thêm/sửa
                  "size": "Size nếu có",
                  "color": "Màu nếu có"
                }
              ]
            }
          }
        + Phản hồi (reply): Xác nhận rõ ràng với khách: "Dạ vâng bạn ơi, shop đã cập nhật đơn hàng #DH-... của mình thành [Tên SP] x [Số lượng mới] rồi ạ! Shop sẽ chuẩn bị gửi đơn hàng này cho mình nha. Cảm ơn bạn rất nhiều ạ! ❤️"
      - Trường hợp 2: ĐƠN HÀNG ĐANG Ở TRẠNG THÁI "Đang giao hàng" (SHIPPING) hoặc "Hoàn thành / Đã giao" (COMPLETED / DELIVERED):
        + TUYỆT ĐỐI NGHIÊM CẤM: KHÔNG xuất action UPDATE_ORDER, KHÔNG nói "đã cập nhật vào đơn #DH-...", KHÔNG hứa hẹn sửa đổi kiện hàng đang giao!
        + BẮT BUỘC GIẢI THÍCH VÀ ĐỀ XUẤT TẠO ĐƠN MỚI:
          * Giải thích rõ: Đơn hàng cũ #DH-... của bạn đã được đóng gói và bàn giao cho bên vận chuyển (đang trên đường giao) rồi ạ, nên shop không thể sửa đổi hoặc nhét thêm đồ vào kiện hàng này được nữa.
          * Nếu khách muốn mua thêm sản phẩm: Chủ động đề xuất tạo đơn hàng mới riêng: "Để bạn nhận được đồ sớm nhất, em xin phép hỗ trợ tạo MỘT ĐƠN HÀNG MỚI riêng cho [Tên sản phẩm muốn mua thêm] nhé ạ? Shop gửi về cùng địa chỉ cũ cho bạn luôn nhé?".
          * Lúc này đặt "is_order_intent": false, đưa thông tin sản phẩm mới vào "order_draft" hoặc "order_data" để chờ khách đồng ý ở câu sau thì mới chốt đơn mới.
      - Trường hợp 3: Đơn hàng đã ở trạng thái "Đã hủy" (CANCELLED):
        + Tuyệt đối không sửa đơn đã hủy. Giải thích đơn đã hủy và mời khách chọn mẫu để lên đơn mới.

   C. CẬP NHẬT THÔNG TIN KHÁCH HÀNG (UPDATE_CUSTOMER):
      - Khi khách cung cấp thông tin cá nhân mới hoặc yêu cầu lưu lại (họ tên đầy đủ, SĐT chính, địa chỉ mặc định):
        + Trả về: "customer_action": { "type": "UPDATE_CUSTOMER", "full_name": "Tên khách", "phone": "SĐT", "shipping_address": "Địa chỉ" }

   D. TRA CỨU DANH MỤC & GỢI Ý SẢN PHẨM (LOOKUP_CATALOG):
      - Khi tài liệu tri thức có mã lệnh LOOKUP_CATALOG được kích hoạt HOẶC khi khách hỏi theo danh mục/bộ sưu tập/dòng sản phẩm:
        + BẮT BUỘC tra cứu mục "BẢN ĐỒ DANH MỤC & NHÓM SẢN PHẨM CỦA SHOP" để tìm đúng danh mục (ví dụ Titan, Chima...).
        + Liệt kê đầy đủ tên các sản phẩm, giá bán của từng sản phẩm.
        + BẮT BUỘC trích xuất TOÀN BỘ URL ảnh sản phẩm thuộc danh mục đó vào mảng "image_urls" của JSON.
        + Chủ động gợi ý so sánh và hỏi khách thích mẫu nào hơn để tư vấn chốt đơn.

   E. HẸN GIỜ CHĂM SÓC LẠI SAU 24H (SCHEDULE_FOLLOWUP):
      - Khi tài liệu tri thức có mã lệnh SCHEDULE_FOLLOWUP được kích hoạt, HOẶC khi khách đã xem/hỏi sản phẩm/danh mục mà chưa chốt mua trong lượt chat này:
      - BẮT BUỘC trả về trong JSON:
        "followup_action": {
          "type": "SCHEDULE_FOLLOWUP",
          "target": "Tên sản phẩm hoặc danh mục khách vừa quan tâm (ví dụ: Lego Titan)",
          "hours": 22
        }

   F. KIỂM TRA & THẨM ĐỊNH THÔNG TIN CHỐT ĐƠN (VALIDATE_CHECKOUT):
      - Khi tài liệu tri thức có mã lệnh VALIDATE_CHECKOUT được kích hoạt (hoặc có quy chuẩn kiểm tra địa chỉ/SĐT trước khi chốt đơn):
        + BẮT BUỘC thẩm định tính hợp lệ của SĐT (đúng 10 chữ số) và Địa chỉ giao hàng (tối thiểu 3 cấp hành chính: Số nhà/đường + Phường/Xã + Quận/Huyện/Tỉnh).
        + NẾU ĐỊA CHỈ THIẾU CẤP (như chỉ nhắn "Hà Nam", "Hà Nội", "Đà Nẵng", "Cầu Giấy"): BẮT BUỘC ĐẶT "is_order_intent": false, "order_data": null, TUYỆT ĐỐI KHÔNG TÓM TẮT ĐƠN VÀ KHÔNG BÁO LÊN ĐƠN! Bắt buộc phản hồi yêu cầu khách bổ sung đầy đủ chi tiết đúng theo mẫu câu trong tài liệu!

=== ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON ONLY) ===
Bạn PHẢI trả về duy nhất 1 chuỗi JSON hợp lệ (không kèm Markdown code block) theo schema sau:
{
  "reply": "Nội dung tin nhắn bạn sẽ gửi lại cho khách hàng bằng tiếng Việt (TUYỆT ĐỐI KHÔNG chứa đường link URL ảnh, link localhost hay /uploads/ ở đây)",
  "image_urls": ["Danh sách URL ảnh sản phẩm nếu khách hỏi xem mẫu/ảnh hoặc hỏi theo danh mục"],
  "is_order_intent": true | false,
  "order_data": null hoặc {
    "customer_name": "Tên khách hàng",
    "phone": "Số điện thoại nếu khách đã cung cấp (nếu khách cũ đồng ý dùng SĐT cũ thì điền SĐT cũ ${savedPhone})",
    "shipping_address": "Địa chỉ giao hàng nếu khách đã cung cấp (nếu khách cũ đồng ý dùng địa chỉ cũ thì điền địa chỉ cũ ${savedAddress})",
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
  "order_action": null hoặc {
    "type": "NONE" | "CANCEL_ORDER" | "UPDATE_ORDER",
    "order_code": "Mã đơn hàng",
    "reason": "Lý do hủy hoặc thay đổi",
    "update_payload": {
      "shipping_address": "Địa chỉ mới nếu có",
      "phone": "SĐT mới nếu có",
      "items": []
    }
  },
  "customer_action": null hoặc {
    "type": "NONE" | "UPDATE_CUSTOMER",
    "full_name": "Tên đầy đủ nếu có",
    "phone": "SĐT nếu có",
    "shipping_address": "Địa chỉ mặc định nếu có"
  },
  "followup_action": null hoặc {
    "type": "NONE" | "SCHEDULE_FOLLOWUP",
    "target": "Tên sản phẩm hoặc danh mục khách vừa hỏi",
    "hours": 22
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

    // Tự động bù ảnh bằng cơ chế tất định (Deterministic Image Auto-Hydration)
    if (imageUrls.length === 0) {
      const autoHydratedImages = resolveImagesForReply({
        messageText,
        replyText: cleanedReply,
        orderDraft,
        rawProducts,
        rawCategories,
        chatHistoryText
      });
      if (autoHydratedImages.length > 0) {
        console.log(`[Gemini AI Auto-Hydration] 🖼️ Đã tự động bù ${autoHydratedImages.length} ảnh cho phản hồi khách hàng:`, autoHydratedImages);
        imageUrls.push(...autoHydratedImages);
      }
    }

    return {
      reply: cleanedReply,
      image_urls: imageUrls,
      is_order_intent: Boolean(parsed.is_order_intent),
      order_data: parsed.order_data || null,
      order_action: parsed.order_action || null,
      customer_action: parsed.customer_action || null,
      followup_action: parsed.followup_action || null,
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
      categories: rawCategories,
      chatHistoryText,
      ordersContextText,
      defaultCustomerName: customerName,
      existingDraft: orderDraft,
      customerImageUrls,
      savedPhone,
      savedAddress,
      channelName
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
  categories = [],
  chatHistoryText,
  ordersContextText = '',
  defaultCustomerName = '',
  existingDraft = null,
  customerImageUrls = [],
  savedPhone = '',
  savedAddress = '',
  channelName = 'Cửa hàng'
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
  if (!matchedProduct && chatHistoryText) {
    const lowerHist = chatHistoryText.toLowerCase();
    for (const p of rawProducts) {
      const pSku = (p.sku || '').toLowerCase();
      const pName = (p.product_name || '').toLowerCase();
      if ((pSku && lowerHist.includes(pSku)) || (pName && lowerHist.includes(pName))) {
        matchedProduct = p;
        break;
      }
    }
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

  // D. Ý định tra cứu / hỏi thông tin đơn hàng đã đặt (phân tách theo từng shop/kênh)
  const isOrderTrackingIntent = /(?:thông\s*tin\s*đơn|kiểm\s*tra\s*đơn|tra\s*cứu\s*đơn|đơn\s*(?:hàng\s*)?(?:vừa|đã)\s*đặt|đơn\s*của\s*(?:tôi|mình|em)|khi\s*nào\s*giao|bao\s*giờ\s*giao|tình\s*trạng\s*đơn|mã\s*đơn\s*hàng|xem\s*lại\s*đơn|có\s*(?:đang\s*)?đặt\s*đơn|có\s*đơn\s*(?:nào|gì)|xem\s*(?:tôi|mình|em)?\s*có\s*đơn|đang\s*đặt\s*đơn)/i.test(text);

  // Kiểm tra câu xác nhận dùng địa chỉ cũ (dành cho khách quen)
  const isConfirmedOldAddress = /(?:^(?:ừ|u|ok|okie|oke|đúng rồi|đúng r|gửi về đó|gửi về địa chỉ cũ|chuẩn rồi|vâng|vâng ạ|giao về đó|chuẩn|ok shop|gửi luôn|gửi đi|đúng nhé|đúng nha)[\s.!❤️😊✨]*$)/i.test(text.trim());

  // E. Ý định chốt mua hàng rõ ràng (chỉ bắt khi có từ hành động mua thực sự, có SĐT/Địa chỉ, hoặc đang trong quá trình đặt hàng slot-filling)
  const hasBuyingKeywords = /(?:mua|đặt\s+hàng|lấy\s+(?:\d+|cái|chiếc|áo|quần|size|màu|1|2|3|mẫu)|chốt|ship\s+(?:cho|về|1|2)|order|lấy\s+nhé|lấy\s+nha|mua\s+nhé|cho\s+mình\s+(?:\d+|1|2)\s+cái)/i.test(text);
  const isSlotFillingActive = (Boolean(existingDraft?.size) || existingDraft?.status === 'COLLECTING') && existingDraft?.status !== 'ORDER_CREATED';
  const hasContactInfo = Boolean(phoneValidation?.phone) || Boolean(cleanAddress);
  const isBuyingIntent = (hasBuyingKeywords || hasContactInfo || isSlotFillingActive || (isConfirmedOldAddress && Boolean(savedPhone && savedAddress))) && !isViewingIntent && !isConsultingIntent && !isPriceIntent && !isOrderTrackingIntent;

  // --- TRƯỜNG HỢP 0: Khách tra cứu / hỏi thăm thông tin đơn hàng đã đặt ---
  if (isOrderTrackingIntent) {
    let orderInfoReply = '';
    if (ordersContextText && !ordersContextText.includes('hiện chưa có đơn hàng nào')) {
      let subAdvice = 'Shop đang chuẩn bị hàng cẩn thận để gửi cho mình sớm nhất nhé!';
      if (ordersContextText.includes('Đang giao hàng')) {
        subAdvice = 'Đơn hàng của mình đang trên đường giao rồi ạ, bưu tá sẽ sớm liên hệ giao hàng cho bạn nhé! ❤️';
      } else if (ordersContextText.includes('Đã giao thành công') || ordersContextText.includes('Hoàn thành')) {
        subAdvice = 'Đơn hàng của mình đã được giao thành công rồi ạ! Cảm ơn bạn rất nhiều vì đã tin tưởng ủng hộ shop ❤️';
      } else if (ordersContextText.includes('Đã hủy')) {
        subAdvice = 'Đơn hàng này đã được ghi nhận hủy trên hệ thống rồi ạ. Khi nào cần mua sắm bạn cứ nhắn em nha!';
      }
      orderInfoReply = `Dạ em xin gửi thông tin đơn hàng gần nhất của bạn tại shop "${channelName}" ạ:\n${ordersContextText}\n\n${subAdvice}`;
    } else {
      orderInfoReply = `Dạ em kiểm tra trên hệ thống của shop "${channelName}" thì hiện tại mình chưa có đơn hàng nào đang đặt ạ. Bạn có muốn tham khảo mẫu nào bên shop em để em hỗ trợ tư vấn và lên đơn cho mình không nha! ❤️`;
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

  // --- TRƯỜNG HỢP 0.5: Khách hỏi xem theo DANH MỤC / BỘ SƯU TẬP (ví dụ: "có lego titan ko", "các mẫu titan", "danh mục titan", "chima") ---
  let matchedCat = null;
  let catProducts = [];
  if (Array.isArray(categories) && categories.length > 0) {
    for (const c of categories) {
      const cName = (c.category_name || '').toLowerCase();
      if (cName && (lower.includes(cName) || (cName.length >= 3 && lower.includes(cName.slice(0, 4))))) {
        matchedCat = c;
        catProducts = rawProducts.filter((p) => {
          return (p.category_ids || []).some((cid) => String(cid) === String(c._id));
        });
        if (catProducts.length > 0) break;
      }
    }
  }

  const isCategoryQuery = Boolean(matchedCat) && catProducts.length > 0 && !isBuyingIntent && !isOrderTrackingIntent;
  if (isCategoryQuery) {
    const pNamesWithPrice = catProducts.map((p) => `• ${p.product_name}: ${(p.sale_price || p.base_price || 0).toLocaleString('vi-VN')} VND`).join('\n');
    const allCatImages = catProducts.flatMap((p) => Array.isArray(p.image_urls) ? p.image_urls : []).filter(Boolean);
    const reply = `Dạ shop có dòng sản phẩm "${matchedCat.category_name}" ạ! ✨\nHiện tại danh mục "${matchedCat.category_name}" bên em đang có các mẫu sau:\n${pNamesWithPrice}\n\nShop gửi bạn xem hình ảnh các mẫu bên dưới nha. Bạn ưng mẫu nào để em hỗ trợ tư vấn và chuẩn bị hàng cho mình nhé! ❤️`;

    return {
      reply,
      image_urls: allCatImages,
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
      image_urls: getProductImages(p),
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
      image_urls: getProductImages(p),
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
      image_urls: getProductImages(p),
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

    // NẾU LÀ KHÁCH HÀNG CŨ XÁC NHẬN ("ừ", "đúng rồi", "ok shop", "gửi về đó") khi đã có sẵn SĐT và Địa chỉ
    if (isConfirmedOldAddress && savedPhone && savedAddress) {
      const p = currentProduct;
      const customerDisplayName = extractedName && extractedName !== 'Khách hàng' ? `anh/chị ${extractedName}` : (defaultCustomerName ? `bạn ${defaultCustomerName}` : 'bạn');
      const unitPrice = p ? (p.sale_price || p.base_price || 0) : 0;
      const totalAmount = (unitPrice * quantity).toLocaleString('vi-VN');

      return {
        reply: `Dạ em cảm ơn ${customerDisplayName} đã xác nhận ạ! Em đã lên đơn hàng cho mình:\n- Sản phẩm: ${p.product_name}${finalSize ? ` (Size: ${finalSize})` : ''}${finalColor ? ` (Màu: ${finalColor})` : ''} x ${quantity}\n- Người nhận: ${extractedName || defaultCustomerName || 'Khách hàng'}\n- SĐT: ${savedPhone}\n- Địa chỉ giao: ${savedAddress}\n- Tổng tiền: ${totalAmount} VND (Thanh toán khi nhận hàng).\nShop sẽ sớm liên hệ xác nhận và giao hàng cho mình nhé! ❤️`,
        image_urls: [],
        is_order_intent: true,
        order_data: {
          customer_name: extractedName || defaultCustomerName || 'Khách hàng',
          phone: savedPhone,
          shipping_address: savedAddress,
          customer_note: customerNote || text,
          product_id: p._id,
          product_name: p.product_name,
          sku: p.sku,
          price: unitPrice,
          quantity,
          size: finalSize,
          color: finalColor,
          items: [
            {
              sku: p.sku,
              product_name: p.product_name,
              size: finalSize,
              color: finalColor,
              quantity
            }
          ]
        },
        missing_fields: [],
        handover_to_staff: false
      };
    }

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
        image_urls: getProductImages(currentProduct),
        is_order_intent: false,
        order_data: {
          product_id: currentProduct._id,
          product_name: currentProduct.product_name,
          sku: currentProduct.sku,
          price: currentProduct.sale_price || currentProduct.base_price || 0,
          quantity,
          size: finalSize,
          color: finalColor,
          customer_name: extractedName || defaultCustomerName,
          phone: currentPhone,
          shipping_address: currentAddress
        },
        missing_fields: ['variant'],
        handover_to_staff: false
      };
    }

    // Bước 4.2: Đã có Size nhưng thiếu SĐT
    if (!currentPhone) {
      // Nếu là khách hàng cũ đã có sẵn SĐT và Địa chỉ đã lưu -> Đề xuất ngay thông tin cũ
      if (savedPhone && savedAddress) {
        const itemDesc = finalSize ? `${currentProduct.product_name} (Size ${finalSize}${finalColor ? `, Màu ${finalColor}` : ''})` : currentProduct.product_name;
        const customerDisplayName = extractedName && extractedName !== 'Khách hàng' ? `anh/chị ${extractedName}` : (defaultCustomerName ? `bạn ${defaultCustomerName}` : 'bạn');
        return {
          reply: `Dạ vâng ${customerDisplayName} ơi, shop ghi nhận bạn lấy mẫu ${itemDesc} rồi ạ! Em thấy địa chỉ nhận hàng trước đây của bạn là ${savedAddress} (SĐT: ${savedPhone}), shop gửi về địa chỉ này cho bạn luôn nhé ạ? Hay bạn muốn giao đến địa chỉ khác ạ? ❤️`,
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
            customer_name: extractedName || defaultCustomerName,
            phone: savedPhone,
            shipping_address: savedAddress,
            items: [
              {
                sku: currentProduct.sku,
                product_name: currentProduct.product_name,
                size: finalSize,
                color: finalColor,
                quantity
              }
            ]
          },
          missing_fields: [],
          handover_to_staff: false
        };
      }

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
          customer_name: extractedName || defaultCustomerName,
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

    // Lấy thông tin khách hàng đã lưu từ DB để làm fallback cho khách quen
    const customerRecord = customer_id ? await Customer.findById(customer_id).lean() : null;
    const savedCustomerPhone = customerRecord?.phone || customerRecord?.phone_number || '';
    const savedCustomerAddress = customerRecord?.shipping_address || customerRecord?.address || '';

    // Nếu trong tin nhắn của khách có địa chỉ hoặc SĐT mới (vd: "đổi địa chỉ Hà Nam", "sđt mới 098..."), cập nhật vào order_draft
    const directAddrCheck = evaluateAddressQuality(messageText);
    if (directAddrCheck.quality === 'VALID') {
      if (!conversation.order_draft) conversation.order_draft = {};
      conversation.order_draft.shipping_address = directAddrCheck.cleanAddress;
      conversation.order_draft.updated_at = new Date();
    } else if (directAddrCheck.quality === 'VAGUE_AREA') {
      if (!conversation.order_draft) conversation.order_draft = {};
      conversation.order_draft.vague_area = directAddrCheck.cleanAddress;
      conversation.order_draft.updated_at = new Date();
    }
    const directPhoneCheck = validateAndSanitizePhone(messageText);
    if (directPhoneCheck.isValid) {
      if (!conversation.order_draft) conversation.order_draft = {};
      conversation.order_draft.phone = directPhoneCheck.phone;
      conversation.order_draft.updated_at = new Date();
    }

    // Cập nhật các slot mới thu thập được vào order_draft
    if (aiResult.order_data) {
      const od = aiResult.order_data;
      if (!conversation.order_draft) conversation.order_draft = {};

      const firstItem = Array.isArray(od.items) && od.items[0] ? od.items[0] : null;
      const targetProductName = od.product_name || firstItem?.product_name;
      const targetSku = od.sku || firstItem?.sku;
      const targetSize = od.size !== undefined && od.size !== '' ? od.size : (firstItem?.size !== undefined ? firstItem.size : undefined);
      const targetColor = od.color !== undefined && od.color !== '' ? od.color : (firstItem?.color !== undefined ? firstItem.color : undefined);
      const targetQuantity = od.quantity || firstItem?.quantity;

      const isDifferentProduct = od.product_id && conversation.order_draft.product_id && String(conversation.order_draft.product_id) !== String(od.product_id);
      if (isDifferentProduct) {
        // Khách chuyển sang hỏi/chọn sản phẩm mới -> reset size, color của sản phẩm cũ
        conversation.order_draft.size = '';
        conversation.order_draft.color = '';
        conversation.order_draft.quantity = 1;
      }

      if (od.product_id) conversation.order_draft.product_id = od.product_id;
      if (targetProductName) conversation.order_draft.product_name = targetProductName;
      if (targetSku) conversation.order_draft.sku = targetSku;
      if (targetSize !== undefined && targetSize !== '') conversation.order_draft.size = targetSize;
      if (targetColor !== undefined && targetColor !== '') conversation.order_draft.color = targetColor;
      if (targetQuantity) conversation.order_draft.quantity = targetQuantity;
      if (od.price) conversation.order_draft.price = od.price;

      const candidateDraftPhone = od.phone || (conversation.order_draft.phone ? '' : savedCustomerPhone);
      if (candidateDraftPhone) {
        const phoneVal = validateAndSanitizePhone(candidateDraftPhone);
        if (phoneVal.isValid) {
          conversation.order_draft.phone = phoneVal.phone;
        }
      }
      const candidateDraftAddress = od.shipping_address || (directAddrCheck.quality === 'VALID' ? directAddrCheck.cleanAddress : '') || (conversation.order_draft.shipping_address ? '' : savedCustomerAddress);
      if (candidateDraftAddress) {
        const addrVal = evaluateAddressQuality(candidateDraftAddress);
        if (addrVal.quality === 'VALID') {
          conversation.order_draft.shipping_address = addrVal.cleanAddress;
        } else if (addrVal.quality === 'VAGUE_AREA') {
          conversation.order_draft.vague_area = addrVal.cleanAddress;
        }
      }
      if (od.customer_name && od.customer_name !== 'Khách hàng') conversation.order_draft.customer_name = od.customer_name;
      if (od.customer_note) conversation.order_draft.customer_note = od.customer_note;

      conversation.order_draft.status = 'COLLECTING';
      conversation.order_draft.updated_at = new Date();
    }

    // 2. Kiểm tra thẩm định điều kiện chốt ĐƠN HÀNG (Validation Gate)
    let createdOrder = null;
    const isDraftCollecting = conversation.order_draft?.status === 'COLLECTING' || Boolean(conversation.order_draft?.product_name);
    const finalPhone = aiResult.order_data?.phone || (isDraftCollecting ? conversation.order_draft?.phone : '') || savedCustomerPhone;
    const finalAddress = aiResult.order_data?.shipping_address || (isDraftCollecting ? conversation.order_draft?.shipping_address : '') || savedCustomerAddress;

    const phoneCheck = validateAndSanitizePhone(finalPhone || '');
    const addressCheck = evaluateAddressQuality(finalAddress || '');

    // CHỐT CHẶN AN TOÀN: Nếu khách đang yêu cầu sửa đơn (UPDATE_ORDER) hoặc hủy đơn (CANCEL_ORDER) -> TUYỆT ĐỐI KHÔNG TẠO ĐƠN MỚI!
    const isActionModifyingOrder =
      aiResult.order_action?.type === 'UPDATE_ORDER' ||
      aiResult.order_action?.type === 'CANCEL_ORDER';

    // BẮT BUỘC địa chỉ chi tiết (VALID) có đủ tối thiểu 3 cấp hành chính: số nhà/đường, phường/xã, quận/huyện, tỉnh/TP
    // Nếu địa chỉ chỉ là VAGUE_AREA (chỉ có tên tỉnh/thành hoặc quận/huyện chung chung) -> TUYỆT ĐỐI KHÔNG CHỐT ĐƠN!
    const isAddressAcceptable = addressCheck.quality === 'VALID';
    const lowerMsg = (messageText || '').toLowerCase();

    const isCustomerConfirming = /(?:ok\s*chốt|chốt\s*(?:đơn|luôn|nhé|nha|ạ)?|xác\s*nhận|đúng\s*rồi|lên\s*đơn\s*(?:đi|nhé|nha|cho\s*mình)?|gửi\s*(?:về\s*đó|cho\s*mình|đi)\s*(?:nhé|nha)?|đồng\s*ý)/i.test(lowerMsg);

    const isReplyPromisingOrderCreation = /(?:tiến\s*hành\s*lên\s*đơn|đã\s*lên\s*đơn|lên\s*đơn\s*mẫu|sớm\s*đóng\s*gói\s*và\s*gửi|đóng\s*gói\s*và\s*gửi\s*(?:hàng|đồ)|đã\s*tạo\s*đơn|lên\s*đơn\s*hàng\s*thành\s*công|đã\s*chốt\s*đơn)/i.test(finalReply);

    const hasOrderDraftProduct = Boolean(conversation.order_draft?.product_name || conversation.order_draft?.sku || aiResult.order_data?.product_name || (Array.isArray(aiResult.order_data?.items) && aiResult.order_data.items.length > 0));

    // CHỐT CHẶN AN TOÀN TUYỆT ĐỐI (Strict Safety Guard):
    // Nếu địa chỉ chưa đạt chuẩn VALID (còn thiếu số nhà/đường), TUYỆT ĐỐI KHÔNG cho phép AI báo đã tạo đơn hoặc tiến hành lên đơn!
    if (!isAddressAcceptable && (isReplyPromisingOrderCreation || isCustomerConfirming)) {
      console.log(`[Safety Guard] 🛡️ Chặn tạo đơn vì địa chỉ chưa đạt chuẩn (${addressCheck.quality}): "${finalAddress}" -> Ép AI hỏi lại chi tiết`);
      finalReply = addressCheck.feedbackMessage || 'Dạ nàng ơi, để gói hàng được giao tận tay nhanh nhất, nàng bổ sung giúp shop chi tiết: Số nhà, Tên đường (hoặc thôn/xóm), Phường/Xã và Quận/Huyện/Tỉnh nhé ạ! ❤️';
      aiResult.is_order_intent = false;
      aiResult.order_data = null;
      if (conversation.order_draft) {
        conversation.order_draft.status = 'COLLECTING';
      }
    }

    const shouldCreateOrder = !isActionModifyingOrder &&
      (aiResult.is_order_intent || (isCustomerConfirming && hasOrderDraftProduct) || (isReplyPromisingOrderCreation && hasOrderDraftProduct)) &&
      phoneCheck.isValid &&
      isAddressAcceptable;

    if (shouldCreateOrder) {
      try {
        const orderInfo = aiResult.order_data || conversation.order_draft || {};
        const itemsToCreate = [];

        // Xác định tên chuẩn xác của khách hàng
        let finalCustomerName = orderInfo.customer_name;
        if (!finalCustomerName || finalCustomerName === 'Khách hàng' || finalCustomerName === 'null') {
          finalCustomerName = customerFbName || customerRecord?.full_name || 'Khách hàng';
        }

        // Tìm kiếm chính xác ID và giá sản phẩm trong DB của Business này
        if (Array.isArray(orderInfo.items) && orderInfo.items.length > 0) {
          for (const it of orderInfo.items) {
            let foundProduct = null;
            if (it.sku) {
              foundProduct = await Product.findOne({ business_id, sku: it.sku });
            }
            if (!foundProduct && it.product_name) {
              foundProduct = await Product.findOne({ business_id, product_name: it.product_name });
              if (!foundProduct) {
                foundProduct = await Product.findOne({
                  business_id,
                  product_name: new RegExp(it.product_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
                });
              }
            }
            if (!foundProduct && conversation.order_draft?.product_id) {
              foundProduct = await Product.findById(conversation.order_draft.product_id);
            }

            if (foundProduct) {
              const unitPrice = foundProduct.sale_price || foundProduct.base_price || 0;
              itemsToCreate.push({
                product_id: foundProduct._id,
                variant_sku: foundProduct.sku,
                product_name: foundProduct.product_name,
                size: it.size || conversation.order_draft?.size || '',
                color: it.color || conversation.order_draft?.color || '',
                quantity: Number(it.quantity) || Number(conversation.order_draft?.quantity) || 1,
                unit_price: unitPrice,
                price: unitPrice
              });
            } else if (it.product_name) {
              // Nếu tên sản phẩm không khớp chính xác kho hàng (hoặc giá tùy chỉnh), mượn product_id của 1 sản phẩm đang bán
              const anyShopProd = await Product.findOne({ business_id, status: 'ACTIVE' });
              const customPrice = Number(it.price || it.unit_price) || Number(orderInfo.price) || (anyShopProd ? (anyShopProd.sale_price || anyShopProd.base_price) : 0);
              itemsToCreate.push({
                product_id: anyShopProd?._id || null,
                variant_sku: it.sku || anyShopProd?.sku || 'CUSTOM',
                product_name: it.product_name,
                size: it.size || conversation.order_draft?.size || '',
                color: it.color || conversation.order_draft?.color || '',
                quantity: Number(it.quantity) || Number(conversation.order_draft?.quantity) || 1,
                unit_price: customPrice,
                price: customPrice
              });
            }
          }
        }

        // Nếu itemsToCreate vẫn rỗng nhưng order_draft hoặc orderInfo có thông tin
        if (itemsToCreate.length === 0) {
          let foundProduct = null;
          if (conversation.order_draft?.product_id) {
            foundProduct = await Product.findById(conversation.order_draft.product_id);
          }
          if (!foundProduct && (conversation.order_draft?.product_name || orderInfo.product_name)) {
            const searchName = conversation.order_draft?.product_name || orderInfo.product_name;
            foundProduct = await Product.findOne({
              business_id,
              product_name: new RegExp(searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            });
          }
          const anyShopProd = await Product.findOne({ business_id, status: 'ACTIVE' });
          const targetProd = foundProduct || anyShopProd;
          const targetName = conversation.order_draft?.product_name || orderInfo.product_name || targetProd?.product_name || 'Sản phẩm đặt mua';
          const targetSku = conversation.order_draft?.sku || orderInfo.sku || targetProd?.sku || 'CUSTOM';
          const targetPrice = Number(conversation.order_draft?.price || orderInfo.price) || (targetProd ? (targetProd.sale_price || targetProd.base_price) : 0);

          itemsToCreate.push({
            product_id: targetProd?._id || null,
            variant_sku: targetSku,
            product_name: targetName,
            size: conversation.order_draft?.size || orderInfo.size || '',
            color: conversation.order_draft?.color || orderInfo.color || '',
            quantity: Number(conversation.order_draft?.quantity || orderInfo.quantity) || 1,
            unit_price: targetPrice,
            price: targetPrice
          });
        }

        // Tạo đơn hàng ở trạng thái PENDING
        if (itemsToCreate.length > 0 || addressCheck.cleanAddress) {
          const noteText = addressCheck.quality === 'VAGUE_AREA'
            ? `Đơn hàng tự động qua AI: "${addressCheck.cleanAddress}" (Khách chỉ cung cấp khu vực tỉnh/TP, CSKH cần gọi xác nhận số nhà chi tiết)`
            : `Đơn hàng tự động trích xuất bởi Trợ lý AI Gemini: "${addressCheck.customerNote || orderInfo.customer_note || messageText}"`;

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
              note: noteText
            },
            null
          );

          console.log(`[Gemini AI] 🛒 ĐÃ TỰ ĐỘNG TẠO ĐƠN HÀNG THÀNH CÔNG: Mã #${createdOrder.order_code} (Shop: ${conversation.channel_id?.page_name || 'Soulmade'} - Khách: ${finalCustomerName})`);
          if (!finalReply.includes(createdOrder.order_code)) {
            finalReply += `\n\n(Dạ em đã tạo đơn hàng thành công với mã #${createdOrder.order_code}. Shop sẽ sớm liên hệ xác nhận và giao hàng ạ!)`;
          }

          // Cập nhật SĐT & Địa chỉ vào hồ sơ Customer để luôn ghi nhớ thông tin mới nhất
          if (customer_id) {
            try {
              await Customer.findByIdAndUpdate(customer_id, {
                $set: {
                  phone: phoneCheck.phone,
                  phone_number: phoneCheck.phone,
                  shipping_address: addressCheck.cleanAddress,
                  address: addressCheck.cleanAddress,
                  ...(finalCustomerName && finalCustomerName !== 'Khách hàng' ? { full_name: finalCustomerName } : {})
                }
              });
            } catch (cErr) {
              console.warn('[Gemini AI] Customer update warning:', cErr.message);
            }
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
          // Hủy lịch nhắc hẹn vì khách đã chốt đơn thành công
          conversation.followup_status = 'CANCELLED';
        }
      } catch (orderErr) {
        console.error('[Gemini AI Order Creation Error]', orderErr.message);
      }
    }

    // ĐỒNG BỘ TUYỆT ĐỐI GIỮA NỘI DUNG CHAT VÀ CSDL:
    // Nếu đơn hàng KHÔNG tạo được, nhưng AI lỡ viết văn bản hứa hẹn "đã tạo đơn", "đóng gói gửi hàng",
    // thì BẮT BUỘC ghi đè văn bản để hỏi nốt thông tin còn thiếu, tránh việc khách hiểu lầm là đã có đơn trên hệ thống!
    if (!createdOrder) {
      const isClaimingOrder = /(?:tiến\s*hành\s*lên\s*đơn|đã\s*lên\s*đơn|đã\s*tạo\s*đơn|lên\s*đơn\s*hàng\s*thành\s*công|đóng\s*gói\s*và\s*gửi\s*(?:hàng|đồ)|sớm\s*đóng\s*gói|gửi\s*hàng\s*đi\s*sớm\s*nhất|đã\s*chốt\s*đơn)/i.test(finalReply);
      if (isClaimingOrder) {
        if (!phoneCheck.isValid) {
          finalReply = `Dạ shop xin chào ${customerFbName || customerRecord?.full_name || 'bạn'} ạ! Shop đã ghi nhận thông tin đặt hàng, bạn cho shop xin Số điện thoại nhận hàng chuẩn 10 số để bên em hoàn tất lên đơn cho mình nhé! ❤️`;
        } else if (!isAddressAcceptable) {
          finalReply = `Dạ shop đã ghi nhận SĐT ${phoneCheck.phone} của mình rồi ạ! Bạn cho shop xin thêm Địa chỉ nhận hàng (Tỉnh/Thành phố, Quận/Huyện, Số nhà, Tên đường) để shop lên đơn và gửi hàng cho mình nha! ❤️`;
        }
      }
    }

    // 2.1 Xử lý các Hành động Hệ thống Tự động (Actionable RAG Execution)
    // A. Tự động Hủy Đơn Hàng (CANCEL_ORDER)
    if (aiResult.order_action?.type === 'CANCEL_ORDER') {
      try {
        const rawCode = (aiResult.order_action.order_code || '').trim();
        const cleanCode = rawCode.replace(/^[#\s]*(?:DH-?)?/i, '');
        let targetOrder = null;

        if (cleanCode) {
          targetOrder = await Order.findOne({
            business_id,
            $or: [
              { order_code: cleanCode },
              { order_code: `DH-${cleanCode}` },
              { order_code: new RegExp(cleanCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
            ]
          });
        }

        // Nếu không khớp theo mã đơn, tìm đơn hàng gần nhất của phiên chat / khách hàng
        if (!targetOrder) {
          targetOrder = await Order.findOne({
            business_id,
            $or: [
              { conversation_id: conversation._id },
              ...(customer_id ? [{ customer_id }] : [])
            ]
          }).sort({ created_at: -1 });
        }

        if (targetOrder) {
          if (['PENDING', 'CONFIRMED'].includes(targetOrder.order_status)) {
            await updateOrderStatusService(
              targetOrder._id,
              'CANCELLED',
              business_id,
              null,
              aiResult.order_action.reason || 'Khách yêu cầu hủy qua chat',
              'Khách xác nhận hủy đơn qua AI Chat'
            );
            console.log(`[Actionable RAG] Đã hủy đơn hàng #${targetOrder.order_code} thành công`);

            // Cập nhật giỏ hàng nháp thành CANCELLED
            if (conversation.order_draft) {
              conversation.order_draft.status = 'CANCELLED';
              conversation.order_draft.updated_at = new Date();
            }
          } else if (targetOrder.order_status === 'SHIPPING') {
            console.log(`[Safety Interceptor] 🛡️ Chặn CANCEL_ORDER vì đơn #${targetOrder.order_code} đang SHIPPING`);
            finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${targetOrder.order_code} của bạn hiện đã được xuất kho và bàn giao cho đơn vị vận chuyển (đang trên đường giao) nên hệ thống không thể hủy trực tiếp được nữa ạ. Khi bưu tá liên hệ giao hàng, bạn có thể từ chối nhận giúp shop hoặc liên hệ hotline để bên em hỗ trợ xử lý hoàn đơn nhé ạ! Cảm ơn bạn rất nhiều ạ! ❤️`;
            aiResult.order_action = null;
          } else if (['COMPLETED', 'DELIVERED'].includes(targetOrder.order_status)) {
            console.log(`[Safety Interceptor] 🛡️ Chặn CANCEL_ORDER vì đơn #${targetOrder.order_code} đã hoàn tất`);
            finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${targetOrder.order_code} đã được giao thành công rồi ạ. Nếu có vấn đề về sản phẩm, shop có chính sách hỗ trợ đổi size hoặc đổi mẫu trong vòng 3 ngày kể từ khi nhận hàng. Bạn nhắn cho em để em hỗ trợ quy trình đổi hàng cho mình nhé! ❤️`;
            aiResult.order_action = null;
          } else if (targetOrder.order_status === 'CANCELLED') {
            finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${targetOrder.order_code} đã được ghi nhận hủy trên hệ thống từ trước rồi ạ, bạn hoàn toàn yên tâm nhé! ❤️`;
            aiResult.order_action = null;
          }
        }
      } catch (cancelErr) {
        console.error('[Actionable RAG Cancel Order Error]', cancelErr.message);
      }
    }

    // B. Tự động Cập Nhật Đơn Hàng (UPDATE_ORDER)
    if (aiResult.order_action?.type === 'UPDATE_ORDER' && aiResult.order_action.update_payload) {
      try {
        const rawCode = (aiResult.order_action.order_code || '').trim();
        const cleanCode = rawCode.replace(/^[#\s]*(?:DH-?)?/i, '');
        let targetOrder = null;

        if (cleanCode) {
          targetOrder = await Order.findOne({
            business_id,
            $or: [
              { order_code: cleanCode },
              { order_code: `DH-${cleanCode}` },
              { order_code: new RegExp(cleanCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
            ]
          });
        }

        if (!targetOrder) {
          targetOrder = await Order.findOne({
            business_id,
            $or: [
              { conversation_id: conversation._id },
              ...(customer_id ? [{ customer_id }] : [])
            ]
          }).sort({ created_at: -1 });
        }

        if (targetOrder) {
          if (['PENDING', 'CONFIRMED'].includes(targetOrder.order_status)) {
            const payload = aiResult.order_action.update_payload;
            const updatedOrder = await updateOrderDetailsService(
              targetOrder._id,
              {
                shipping_address: payload.shipping_address,
                phone: payload.phone,
                customer_name: payload.customer_name,
                items: payload.items,
                note: aiResult.order_action.reason || 'Khách sửa nội dung đơn qua AI Chat'
              },
              business_id
            );
            console.log(`[Actionable RAG] Đã cập nhật chi tiết đơn hàng #${updatedOrder.order_code} thành công: tổng tiền ${(updatedOrder.total_amount || 0).toLocaleString('vi-VN')} VND`);

            // Đồng bộ giỏ hàng nháp
            if (conversation.order_draft) {
              conversation.order_draft.status = 'ORDER_CREATED';
              conversation.order_draft.last_order_id = updatedOrder._id;
              conversation.order_draft.last_order_code = updatedOrder.order_code;
              if (payload.items && payload.items[0]) {
                conversation.order_draft.product_name = payload.items[0].product_name || conversation.order_draft.product_name;
                conversation.order_draft.quantity = payload.items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
              }
              conversation.order_draft.updated_at = new Date();
            }
          } else if (targetOrder.order_status === 'SHIPPING') {
            console.log(`[Safety Interceptor] 🛡️ Chặn UPDATE_ORDER vì đơn #${targetOrder.order_code} đang SHIPPING`);
            const payload = aiResult.order_action.update_payload;
            const itemNames = (payload.items || []).map(i => i.product_name || i.name).filter(Boolean).join(', ') || 'sản phẩm';
            const oldAddr = targetOrder.shipping_address || savedAddress || '';
            const oldPhone = targetOrder.shipping_phone || savedPhone || '';

            finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${targetOrder.order_code} của bạn hiện đã được đóng gói và bàn giao cho bên vận chuyển (đang trên đường giao) rồi ạ, nên shop không thể sửa đổi hoặc nhét thêm đồ vào kiện hàng này được nữa. Để bạn nhận được đồ sớm nhất, em xin phép hỗ trợ tạo MỘT ĐƠN HÀNG MỚI riêng cho ${itemNames} nhé ạ! Shop gửi về địa chỉ cũ (${oldAddr}${oldPhone ? ` - SĐT: ${oldPhone}` : ''}) cho bạn luôn nhé? ❤️`;

            aiResult.order_action = null;

            // Đưa sản phẩm khách muốn mua thêm vào order_draft mới để chuẩn bị chốt ở câu sau khi khách đồng ý
            if (conversation.order_draft) {
              conversation.order_draft.status = 'COLLECTING';
              if (payload.items && payload.items[0]) {
                conversation.order_draft.product_name = payload.items[0].product_name;
                conversation.order_draft.quantity = payload.items[0].quantity || 1;
                conversation.order_draft.size = payload.items[0].size || '';
                conversation.order_draft.color = payload.items[0].color || '';
              }
              conversation.order_draft.phone = oldPhone;
              conversation.order_draft.shipping_address = oldAddr;
              conversation.order_draft.updated_at = new Date();
            }
          } else if (['COMPLETED', 'DELIVERED'].includes(targetOrder.order_status)) {
            console.log(`[Safety Interceptor] 🛡️ Chặn UPDATE_ORDER vì đơn #${targetOrder.order_code} đã hoàn tất`);
            const payload = aiResult.order_action.update_payload;
            const itemNames = (payload.items || []).map(i => i.product_name || i.name).filter(Boolean).join(', ') || 'sản phẩm';
            finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${targetOrder.order_code} của bạn đã được giao thành công rồi ạ. Nếu bạn muốn mua thêm ${itemNames}, em xin phép hỗ trợ lên đơn hàng mới cho mình ngay nhé! Hoặc nếu cần hỗ trợ đổi size/mẫu theo chính sách đổi trả trong vòng 3 ngày, bạn cứ nhắn để em hỗ trợ nha! ❤️`;
            aiResult.order_action = null;
          } else if (targetOrder.order_status === 'CANCELLED') {
            console.log(`[Safety Interceptor] 🛡️ Chặn UPDATE_ORDER vì đơn #${targetOrder.order_code} đã hủy`);
            finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${targetOrder.order_code} trước đó đã được hủy trên hệ thống rồi ạ. Bạn có muốn chọn mẫu nào để em hỗ trợ lên một đơn hàng mới cho mình không nha! ❤️`;
            aiResult.order_action = null;
          }
        }
      } catch (updateErr) {
        console.error('[Actionable RAG Update Order Error]', updateErr.message);
      }
    }

    // CHỐT CHẶN BẢO VỆ CHỐNG ẢO GIÁC TRẠNG THÁI (State Hallucination Guard):
    // Nếu trong finalReply có câu từ khẳng định "đã cập nhật vào đơn", "đã thêm ... vào đơn", "đã hủy đơn"
    // nhưng đơn hàng gần nhất của khách đang ở trạng thái SHIPPING, COMPLETED hoặc CANCELLED:
    // BẮT BUỘC ghi đè câu trả lời, không cho phép gửi thông tin sai lệch cho khách!
    const isClaimingUpdateInText = /(?:đã\s*(?:cập\s*nhật|thêm|sửa|gộp|bổ\s*sung)\s*.*vào\s*đơn|đã\s*cập\s*nhật\s*(?:thêm|lại|chi\s*tiết)?\s*đơn|đã\s*sửa\s*đơn)/i.test(finalReply);
    const isClaimingCancelInText = /(?:đã\s*(?:hủy|huỷ)\s*đơn)/i.test(finalReply);

    if (isClaimingUpdateInText || isClaimingCancelInText) {
      const activeRecentOrder = await Order.findOne({
        business_id,
        $or: [
          { conversation_id: conversation._id },
          ...(customer_id ? [{ customer_id }] : [])
        ]
      }).sort({ created_at: -1 });

      if (activeRecentOrder && ['SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(activeRecentOrder.order_status)) {
        // Chỉ ghi đè nếu khách KHÔNG có đơn nào khác đang PENDING hoặc CONFIRMED
        const hasPendingOrder = await Order.exists({
          business_id,
          $or: [
            { conversation_id: conversation._id },
            ...(customer_id ? [{ customer_id }] : [])
          ],
          order_status: { $in: ['PENDING', 'CONFIRMED'] }
        });

        if (!hasPendingOrder) {
          if (isClaimingUpdateInText) {
            if (activeRecentOrder.order_status === 'SHIPPING') {
              console.log(`[State Hallucination Guard] 🛡️ Ghi đè câu trả lời vì AI hứa sửa đơn #${activeRecentOrder.order_code} đang SHIPPING`);
              const oldAddr = activeRecentOrder.shipping_address || savedAddress || '';
              const oldPhone = activeRecentOrder.shipping_phone || savedPhone || '';
              finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${activeRecentOrder.order_code} của bạn hiện đã được đóng gói và bàn giao cho bên vận chuyển (đang trên đường giao) rồi ạ, nên shop không thể sửa đổi hoặc nhét thêm đồ vào kiện hàng này được nữa. Để bạn nhận được đồ sớm nhất, em xin phép hỗ trợ tạo MỘT ĐƠN HÀNG MỚI riêng cho sản phẩm bạn muốn lấy thêm này nhé ạ! Shop gửi về địa chỉ cũ (${oldAddr}${oldPhone ? ` - SĐT: ${oldPhone}` : ''}) cho bạn luôn nhé? ❤️`;
            } else if (['COMPLETED', 'DELIVERED'].includes(activeRecentOrder.order_status)) {
              console.log(`[State Hallucination Guard] 🛡️ Ghi đè câu trả lời vì AI hứa sửa đơn #${activeRecentOrder.order_code} đã COMPLETED`);
              finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${activeRecentOrder.order_code} của bạn đã được giao thành công rồi ạ. Nếu bạn muốn mua thêm sản phẩm, em xin phép hỗ trợ lên đơn hàng mới cho mình ngay nhé! Hoặc nếu cần hỗ trợ đổi size/mẫu theo chính sách đổi trả trong vòng 3 ngày, bạn cứ nhắn để em hỗ trợ nha! ❤️`;
            } else if (activeRecentOrder.order_status === 'CANCELLED') {
              finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${activeRecentOrder.order_code} trước đó đã được hủy trên hệ thống rồi ạ. Bạn có muốn chọn mẫu nào để em hỗ trợ lên một đơn hàng mới cho mình không nha! ❤️`;
            }
          } else if (isClaimingCancelInText) {
            if (activeRecentOrder.order_status === 'SHIPPING') {
              console.log(`[State Hallucination Guard] 🛡️ Ghi đè câu trả lời vì AI hứa hủy đơn #${activeRecentOrder.order_code} đang SHIPPING`);
              finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${activeRecentOrder.order_code} của bạn hiện đã được xuất kho và bàn giao cho đơn vị vận chuyển (đang trên đường giao) nên hệ thống không thể hủy trực tiếp được nữa ạ. Khi bưu tá liên hệ giao hàng, bạn có thể từ chối nhận giúp shop hoặc liên hệ hotline để bên em hỗ trợ xử lý hoàn đơn nhé ạ! Cảm ơn bạn rất nhiều ạ! ❤️`;
            } else if (['COMPLETED', 'DELIVERED'].includes(activeRecentOrder.order_status)) {
              finalReply = `Dạ ${fallbackCustomerName} ơi, đơn hàng #${activeRecentOrder.order_code} đã được giao thành công rồi ạ. Nếu sản phẩm chưa vừa ý, shop có chính sách hỗ trợ đổi size hoặc đổi mẫu trong vòng 3 ngày kể từ khi nhận hàng. Bạn nhắn cho em để em hỗ trợ quy trình đổi hàng cho mình nhé! ❤️`;
            }
          }
        }
      }
    }

    // C. Tự động Cập Nhật Thông Tin Khách Hàng (UPDATE_CUSTOMER)
    if (aiResult.customer_action?.type === 'UPDATE_CUSTOMER' && customer_id) {
      try {
        const custPayload = aiResult.customer_action;
        const custUpdates = {};
        if (custPayload.full_name && custPayload.full_name !== 'Khách hàng') custUpdates.full_name = custPayload.full_name;
        if (custPayload.phone) {
          const pVal = validateAndSanitizePhone(custPayload.phone);
          if (pVal.isValid) {
            custUpdates.phone = pVal.phone;
            custUpdates.phone_number = pVal.phone;
          }
        }
        if (custPayload.shipping_address) {
          const aVal = evaluateAddressQuality(custPayload.shipping_address);
          if (aVal.quality === 'VALID') {
            custUpdates.shipping_address = aVal.cleanAddress;
            custUpdates.address = aVal.cleanAddress;
          }
        }
        if (Object.keys(custUpdates).length > 0) {
          custUpdates.updated_at = new Date();
          await Customer.findByIdAndUpdate(customer_id, { $set: custUpdates });
          console.log(`[Actionable RAG] Đã cập nhật thông tin khách hàng #${customer_id} thành công`);
        }
      } catch (custErr) {
        console.error('[Actionable RAG Update Customer Error]', custErr.message);
      }
    }

    // D. Tự động Hẹn giờ chăm sóc lại sau 24h nếu chưa chốt đơn (SCHEDULE_FOLLOWUP)
    if (aiResult.followup_action?.type === 'SCHEDULE_FOLLOWUP' && conversation.order_draft?.status !== 'ORDER_CREATED') {
      try {
        const hours = Number(aiResult.followup_action.hours) || 22;
        conversation.followup_status = 'PENDING';
        conversation.followup_due_at = new Date(Date.now() + hours * 60 * 60 * 1000);
        conversation.followup_note = aiResult.followup_action.target || 'Khách quan tâm sản phẩm nhưng chưa chốt đơn';
        console.log(`[Actionable RAG] ⏰ Đã hẹn lịch chăm sóc lại sau ${hours}h cho hội thoại #${conversation._id} (${conversation.followup_note})`);
      } catch (flErr) {
        console.warn('[Actionable RAG Followup Warning]', flErr.message);
      }
    }

    // 3. Nếu AI yêu cầu bàn giao nhân viên (Handover)
    if (aiResult.handover_to_staff) {
      conversation.is_bot_active = false;
      conversation.conversation_status = 'PENDING_STAFF';
      await conversation.save();
    }

    // Chốt chặn an toàn kép: Nếu aiResult.image_urls vẫn rỗng, tự động tra cứu sản phẩm bù ảnh lớp 2
    if (!Array.isArray(aiResult.image_urls) || aiResult.image_urls.length === 0) {
      try {
        const fallbackProds = await Product.find({ business_id, status: { $ne: 'HIDDEN' } })
          .select('product_name sku image_urls category_ids')
          .limit(50)
          .lean();
        const doubleCheckImages = resolveImagesForReply({
          messageText,
          replyText: finalReply,
          orderDraft: conversation.order_draft,
          rawProducts: fallbackProds,
          chatHistoryText: ''
        });
        if (doubleCheckImages.length > 0) {
          aiResult.image_urls = doubleCheckImages;
          console.log(`[Process Gemini Safety Net] 🖼️ Bù ảnh lớp 2 thành công (${doubleCheckImages.length} ảnh):`, doubleCheckImages);
        }
      } catch (safeErr) {
        console.warn('[Process Gemini Safety Net Warn]', safeErr.message);
      }
    }

    const backendUrl = process.env.BACKEND_URL || 'https://ai-auto-backend.onrender.com';
    const normalizedImageUrls = (aiResult.image_urls || [])
      .map((url) => normalizeImageUrl(url, backendUrl))
      .filter(Boolean);

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
        const check = evaluateAddressQuality(aiResult.order_data.shipping_address);
        if (check.quality === 'VALID') {
          updateFields.shipping_address = check.cleanAddress;
          updateFields.address = check.cleanAddress;
        }
      } else if (directAddrCheck.quality === 'VALID') {
        updateFields.shipping_address = directAddrCheck.cleanAddress;
        updateFields.address = directAddrCheck.cleanAddress;
      } else if (conversation.order_draft?.shipping_address) {
        const check = evaluateAddressQuality(conversation.order_draft.shipping_address);
        if (check.quality === 'VALID') {
          updateFields.shipping_address = check.cleanAddress;
          updateFields.address = check.cleanAddress;
        }
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
