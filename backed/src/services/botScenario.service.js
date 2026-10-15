import mongoose from 'mongoose';
import xlsx from 'xlsx';
import { BotScenario } from '../models/index.js';

/**
 * 1. Lấy danh sách Kịch bản của Doanh nghiệp
 */
export const getBotScenariosService = async ({
  business_id,
  channel_id = '',
  search = '',
  trigger_type = '',
  is_active = ''
}) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  let bId;
  try {
    bId = new mongoose.Types.ObjectId(business_id);
  } catch {
    bId = business_id;
  }

  const filter = { business_id: bId };

  if (channel_id && channel_id.trim() !== '') {
    try {
      filter.$or = [
        { channel_id: new mongoose.Types.ObjectId(channel_id.trim()) },
        { channel_id: null }
      ];
    } catch {
      filter.channel_id = channel_id.trim();
    }
  }

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { scenario_name: searchRegex },
      { keywords: searchRegex },
      { response_content: searchRegex }
    ];
  }

  if (trigger_type && trigger_type.trim() !== '') {
    filter.trigger_type = trigger_type.trim();
  }

  if (is_active !== '' && is_active !== undefined) {
    filter.is_active = is_active === 'true' || is_active === true;
  }

  const scenarios = await BotScenario.find(filter)
    .populate('channel_id', 'page_name page_id platform')
    .populate('created_by', 'full_name email')
    .sort({ priority: -1, created_at: -1 });

  return scenarios;
};

/**
 * 2. Lấy chi tiết 1 Kịch bản
 */
export const getBotScenarioByIdService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;

  const scenario = await BotScenario.findOne(filter)
    .populate('channel_id', 'page_name page_id platform');
  if (!scenario) throw new Error('Không tìm thấy kịch bản');
  return scenario;
};

/**
 * 3. Tạo Kịch bản mới (Chủ shop tự thiết lập)
 */
export const createBotScenarioService = async (data, userId) => {
  if (!data.business_id) throw new Error('business_id là bắt buộc');
  if (!data.scenario_name || data.scenario_name.trim() === '') {
    throw new Error('Tên kịch bản không được để trống');
  }

  // Chuẩn hóa danh sách từ khóa
  let cleanKeywords = [];
  if (Array.isArray(data.keywords)) {
    cleanKeywords = data.keywords.map((k) => String(k).trim()).filter(Boolean);
  } else if (typeof data.keywords === 'string') {
    cleanKeywords = data.keywords.split(',').map((k) => k.trim()).filter(Boolean);
  }

  // Chuẩn hóa danh sách ảnh đính kèm
  let cleanImageUrls = [];
  if (Array.isArray(data.image_urls)) {
    cleanImageUrls = data.image_urls.map((u) => String(u).trim()).filter(Boolean);
  } else if (data.image_url) {
    cleanImageUrls = [String(data.image_url).trim()];
  }

  const scenario = await BotScenario.create({
    business_id: data.business_id,
    channel_id: data.channel_id || null,
    scenario_name: data.scenario_name.trim(),
    trigger_type: data.trigger_type || 'KEYWORD_CONTAINS',
    keywords: cleanKeywords,
    action_type: data.action_type || 'REPLY_TEXT',
    response_content: data.response_content || '',
    image_urls: cleanImageUrls,
    image_url: cleanImageUrls[0] || '',
    tag_to_add: data.tag_to_add || '',
    is_active: data.is_active !== undefined ? data.is_active : true,
    priority: Number(data.priority) || 0,
    created_by: userId || null,
    updated_by: userId || null
  });

  return scenario;
};

/**
 * 4. Cập nhật Kịch bản
 */
export const updateBotScenarioService = async (id, data, business_id, userId) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;

  const scenario = await BotScenario.findOne(filter);
  if (!scenario) throw new Error('Không tìm thấy kịch bản để cập nhật');

  if (data.scenario_name !== undefined) scenario.scenario_name = data.scenario_name.trim();
  if (data.channel_id !== undefined) scenario.channel_id = data.channel_id || null;
  if (data.trigger_type !== undefined) scenario.trigger_type = data.trigger_type;
  if (data.action_type !== undefined) scenario.action_type = data.action_type;
  if (data.response_content !== undefined) scenario.response_content = data.response_content;
  if (data.image_urls !== undefined) {
    if (Array.isArray(data.image_urls)) {
      scenario.image_urls = data.image_urls.map((u) => String(u).trim()).filter(Boolean);
      scenario.image_url = scenario.image_urls[0] || '';
    }
  } else if (data.image_url !== undefined) {
    scenario.image_url = data.image_url;
    scenario.image_urls = data.image_url ? [data.image_url] : [];
  }
  if (data.tag_to_add !== undefined) scenario.tag_to_add = data.tag_to_add;
  if (data.is_active !== undefined) scenario.is_active = data.is_active;
  if (data.priority !== undefined) scenario.priority = Number(data.priority) || 0;

  if (data.keywords !== undefined) {
    if (Array.isArray(data.keywords)) {
      scenario.keywords = data.keywords.map((k) => String(k).trim()).filter(Boolean);
    } else if (typeof data.keywords === 'string') {
      scenario.keywords = data.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    }
  }

  scenario.updated_by = userId || null;
  await scenario.save();
  return scenario;
};

/**
 * 5. Bật / Tắt nhanh Kịch bản (Toggle active)
 */
export const toggleBotScenarioService = async (id, business_id, userId) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;

  const scenario = await BotScenario.findOne(filter);
  if (!scenario) throw new Error('Không tìm thấy kịch bản');

  scenario.is_active = !scenario.is_active;
  scenario.updated_by = userId || null;
  await scenario.save();
  return scenario;
};

/**
 * 6. Xóa Kịch bản
 */
export const deleteBotScenarioService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;

  const result = await BotScenario.findOneAndDelete(filter);
  if (!result) throw new Error('Không tìm thấy kịch bản để xóa');
  return { message: 'Đã xóa kịch bản thành công' };
};

/**
 * 7. BỘ ĐIỀU PHỐI: Khớp tin nhắn của khách với Kịch bản của Chủ shop
 * Trả về Kịch bản đầu tiên khớp với tin nhắn, hoặc null nếu không khớp
 */
export const matchIncomingMessageToScenario = async ({
  business_id,
  channel_id,
  messageText = '',
  isFirstMessage = false
}) => {
  if (!business_id) return null;

  let bId;
  try {
    bId = new mongoose.Types.ObjectId(business_id);
  } catch {
    bId = business_id;
  }

  // Lấy toàn bộ kịch bản đang ACTIVE của cửa hàng (áp dụng cho toàn shop hoặc đúng channel)
  const channelFilter = channel_id ? [{ channel_id }, { channel_id: null }, { channel_id: { $exists: false } }] : [{ channel_id: null }];

  const activeScenarios = await BotScenario.find({
    business_id: bId,
    is_active: true,
    $or: channelFilter
  }).sort({ priority: -1, created_at: -1 });

  if (!activeScenarios || activeScenarios.length === 0) return null;

  const normalizedText = messageText.trim().toLowerCase();

  // A. Nếu là tin nhắn đầu tiên của khách
  if (isFirstMessage) {
    const firstMsgScenario = activeScenarios.find((s) => s.trigger_type === 'FIRST_MESSAGE');
    if (firstMsgScenario) return firstMsgScenario;
  }

  // B. Quét qua từng kịch bản
  for (const scenario of activeScenarios) {
    // 1. Kiểm tra kịch bản từ khóa yêu cầu gặp nhân viên / khiếu nại (HANDOVER_KEYWORD)
    if (scenario.trigger_type === 'HANDOVER_KEYWORD') {
      const isMatched = scenario.keywords.some((kw) => {
        const k = kw.trim().toLowerCase();
        return k && normalizedText.includes(k);
      });
      if (isMatched) return scenario;
    }

    // 2. Kiểm tra khớp chính xác 100% (KEYWORD_EXACT)
    if (scenario.trigger_type === 'KEYWORD_EXACT') {
      const isMatched = scenario.keywords.some((kw) => {
        const k = kw.trim().toLowerCase();
        return k && normalizedText === k;
      });
      if (isMatched) return scenario;
    }

    // 3. Kiểm tra chứa từ khóa (KEYWORD_CONTAINS)
    if (scenario.trigger_type === 'KEYWORD_CONTAINS') {
      const isMatched = scenario.keywords.some((kw) => {
        const k = kw.trim().toLowerCase();
        if (!k) return false;

        // Nếu từ khóa là câu chào thông thường (hi, xin chào, hello...)
        const isGreetingKw = ['hi', 'hello', 'xin chào', 'chào shop', 'chào bạn', 'alo'].includes(k);
        if (isGreetingKw) {
          // Nếu khách có câu hỏi cụ thể hoặc không phải lời chào thuần túy, nhường quyền cho AI Gemini
          const hasSpecificIntent = /(tư vấn|giá|bao nhiêu|mua|đặt|lấy|ship|size|màu|sản phẩm|còn không|shop ở đâu)/i.test(normalizedText);
          if (hasSpecificIntent) {
            return false;
          }
          // Chỉ coi là chào nếu tin nhắn ngắn (dưới 5 từ)
          if (normalizedText.split(/\s+/).length > 4) {
            return false;
          }
        }

        // Bổ sung: Nếu từ khóa là hành động đặt mua chung (mua hàng, đặt hàng, mua, đặt, chốt đơn, order, lấy hàng...)
        // nhưng khách đang hỏi lịch sử đơn, hỏi chính sách/quy định, câu nghi vấn hoặc phủ định -> Nhường cho Gemini AI
        const isPurchaseKw = ['mua hàng', 'đặt hàng', 'mua', 'đặt', 'chốt đơn', 'order', 'lấy hàng'].includes(k);
        if (isPurchaseKw) {
          const isHistoryOrInquiryOrPolicy = /(từng|đã từng|lịch sử|tra cứu|kiểm tra|hỏi|chính sách|quy định|thắc mắc|chưa\?|chưa$|không mua|chẳng mua|huỷ|hủy)/i.test(normalizedText);
          if (isHistoryOrInquiryOrPolicy) {
            return false;
          }
        }

        return normalizedText.includes(k);
      });
      if (isMatched) return scenario;
    }
  }

  return null;
};

/**
 * 8. Phân tích nội dung file Excel / CSV kịch bản thành mảng dữ liệu có validate
 */
export const parseScenarioFile = (fileBuffer) => {
  if (!fileBuffer) throw new Error('File không hợp lệ hoặc rỗng');

  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  let targetSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('kich_ban') || s.toLowerCase().includes('scenario')) || workbook.SheetNames[0];
  if (targetSheetName && targetSheetName.toLowerCase().includes('huong_dan') && workbook.SheetNames.length > 1) {
    targetSheetName = workbook.SheetNames.find((s) => !s.toLowerCase().includes('huong_dan')) || workbook.SheetNames[0];
  }
  if (!targetSheetName) throw new Error('File không chứa trang tính (sheet) nào');

  const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[targetSheetName], { defval: '' });
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error('File không có dữ liệu hàng nào trong trang tính');
  }

  const normalizeHeaderKey = (header) => {
    return String(header || '')
      .trim()
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');
  };

  const rows = rawRows.map((rawRow, index) => {
    // Map linh hoạt các tên cột (hỗ trợ cả tiếng Việt có/không dấu & tiếng Anh)
    let scenarioName = '';
    let triggerTypeRaw = '';
    let keywordsRaw = '';
    let responseContent = '';
    let actionTypeRaw = '';
    let tagToAdd = '';
    let priorityRaw = 0;

    for (const [key, val] of Object.entries(rawRow)) {
      const normKey = normalizeHeaderKey(key);
      const strVal = String(val !== undefined && val !== null ? val : '').trim();

      if (normKey.includes('ten_kich_ban') || normKey.includes('scenario_name') || normKey === 'ten') {
        scenarioName = strVal;
      } else if (normKey.includes('loai_kich_hoat') || normKey.includes('trigger_type') || normKey.includes('loai_dieu_kien') || normKey === 'trigger') {
        triggerTypeRaw = strVal;
      } else if (normKey.includes('tu_khoa') || normKey.includes('keywords') || normKey === 'keyword') {
        keywordsRaw = strVal;
      } else if (normKey.includes('noi_dung') || normKey.includes('response_content') || normKey.includes('cau_tra_loi') || normKey === 'reply') {
        responseContent = strVal;
      } else if (normKey.includes('hanh_dong') || normKey.includes('action_type') || normKey === 'action') {
        actionTypeRaw = strVal;
      } else if (normKey.includes('gan_nhan') || normKey.includes('tag_to_add') || normKey.includes('nhan') || normKey === 'tag') {
        tagToAdd = strVal;
      } else if (normKey.includes('do_uu_tien') || normKey.includes('priority') || normKey.includes('uu_tien')) {
        priorityRaw = strVal;
      }
    }

    // Chuẩn hóa trigger_type
    let triggerType = 'KEYWORD_CONTAINS';
    const normTrigger = normalizeHeaderKey(triggerTypeRaw);
    if (normTrigger.includes('chinh_xac') || normTrigger.includes('exact') || normTrigger === 'keyword_exact') {
      triggerType = 'KEYWORD_EXACT';
    } else if (normTrigger.includes('tin_nhan_dau') || normTrigger.includes('first') || normTrigger === 'first_message') {
      triggerType = 'FIRST_MESSAGE';
    } else if (normTrigger.includes('chuyen_nhan_vien') || normTrigger.includes('handover') || normTrigger === 'handover_keyword') {
      triggerType = 'HANDOVER_KEYWORD';
    }

    // Chuẩn hóa action_type
    let actionType = 'REPLY_TEXT';
    const normAction = normalizeHeaderKey(actionTypeRaw);
    if (normAction.includes('chuyen_nhan_vien') || normAction.includes('handover') || normAction === 'handover_staff') {
      actionType = 'HANDOVER_STAFF';
    } else if (normAction.includes('bao_nhan_vien') || normAction.includes('notify') || normAction === 'notify_staff') {
      actionType = 'NOTIFY_STAFF';
    }

    // Chuẩn hóa danh sách từ khóa
    const cleanKeywords = keywordsRaw
      ? keywordsRaw.split(/[,;\n\r]+/).map((k) => k.trim()).filter(Boolean)
      : [];

    const priority = Number(priorityRaw) || 0;

    // Kiểm tra tính hợp lệ của từng dòng
    const errors = [];
    if (!scenarioName) {
      errors.push('Tên kịch bản không được để trống');
    }
    if (triggerType !== 'FIRST_MESSAGE' && cleanKeywords.length === 0) {
      errors.push('Cần ít nhất 1 từ khóa kích hoạt');
    }
    if (actionType === 'REPLY_TEXT' && !responseContent) {
      errors.push('Nội dung trả lời không được để trống');
    }

    return {
      row_index: index + 2, // Excel bắt đầu từ dòng 2 (dòng 1 là tiêu đề)
      scenario_name: scenarioName,
      trigger_type: triggerType,
      keywords: cleanKeywords,
      response_content: responseContent,
      action_type: actionType,
      tag_to_add: tagToAdd,
      priority,
      isValid: errors.length === 0,
      errors
    };
  });

  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.length - validCount;

  return {
    total: rows.length,
    validCount,
    invalidCount,
    rows
  };
};

/**
 * 9. Xem trước dữ liệu kịch bản trước khi lưu vào CSDL
 */
export const previewScenariosFromFile = ({ fileBuffer }) => {
  return parseScenarioFile(fileBuffer);
};

/**
 * 10. Nhập hàng loạt Kịch bản từ File Excel/CSV
 */
export const importScenariosFromBuffer = async ({
  business_id,
  channel_id = null,
  fileBuffer,
  overwriteMode = 'SKIP', // 'OVERWRITE' | 'SKIP' | 'CREATE_NEW'
  userId = null
}) => {
  if (!business_id) throw new Error('business_id là bắt buộc');
  const parsed = parseScenarioFile(fileBuffer);

  const validRows = parsed.rows.filter((r) => r.isValid);
  if (validRows.length === 0) {
    return {
      total: parsed.total,
      successCount: 0,
      updatedCount: 0,
      skippedCount: parsed.invalidCount,
      errors: parsed.rows
        .filter((r) => !r.isValid)
        .map((r) => ({ row: r.row_index, scenario_name: r.scenario_name, errors: r.errors }))
    };
  }

  let successCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of validRows) {
    const filter = {
      business_id,
      scenario_name: row.scenario_name
    };
    if (channel_id) filter.channel_id = channel_id;

    const existing = await BotScenario.findOne(filter);

    if (existing) {
      if (overwriteMode === 'OVERWRITE') {
        existing.trigger_type = row.trigger_type;
        existing.keywords = row.keywords;
        existing.action_type = row.action_type;
        existing.response_content = row.response_content;
        existing.tag_to_add = row.tag_to_add;
        existing.priority = row.priority;
        existing.updated_by = userId;
        await existing.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    } else {
      await BotScenario.create({
        business_id,
        channel_id: channel_id || null,
        scenario_name: row.scenario_name,
        trigger_type: row.trigger_type,
        keywords: row.keywords,
        action_type: row.action_type,
        response_content: row.response_content,
        image_urls: [],
        image_url: '',
        tag_to_add: row.tag_to_add,
        priority: row.priority,
        is_active: true,
        created_by: userId,
        updated_by: userId
      });
      successCount++;
    }
  }

  return {
    total: parsed.total,
    successCount,
    updatedCount,
    skippedCount: skippedCount + parsed.invalidCount,
    errors: parsed.rows
      .filter((r) => !r.isValid)
      .map((r) => ({ row: r.row_index, scenario_name: r.scenario_name, errors: r.errors }))
  };
};

/**
 * 11. Tạo file Excel mẫu chuẩn cho chủ shop tải về
 */
export const generateScenarioTemplateBuffer = () => {
  const wb = xlsx.utils.book_new();

  // Sheet 1: Trang điền kịch bản
  const headers = [
    'Tên kịch bản (* Bắt buộc)',
    'Loại kích hoạt (CHUA_TU_KHOA / CHINH_XAC / TIN_NHAN_DAU / CHUYEN_NHAN_VIEN)',
    'Từ khóa kích hoạt (Cách nhau bằng dấu phẩy)',
    'Nội dung trả lời (* Bắt buộc nếu gửi tin nhắn)',
    'Hành động (GUI_TIN_NHAN / CHUYEN_NHAN_VIEN / BAO_NHAN_VIEN)',
    'Gắn nhãn khách (Tùy chọn)',
    'Độ ưu tiên (Số nguyên, mặc định 0)'
  ];

  const sampleData = [
    [
      'Hỏi địa chỉ shop',
      'CHUA_TU_KHOA',
      'địa chỉ, ở đâu, shop ở đâu, chi nhánh, xem hàng trực tiếp',
      'Dạ shop ở số 123 đường Cầu Giấy, Hà Nội ạ! Mời {customer_name} ghé shop xem hàng nha.',
      'GUI_TIN_NHAN',
      'Hỏi địa chỉ',
      10
    ],
    [
      'Chính sách đổi trả & bảo hành',
      'CHUA_TU_KHOA',
      'đổi trả, bảo hành, đổi size, hàng lỗi',
      'Dạ shop hỗ trợ đổi trả miễn phí trong 7 ngày nếu lỗi từ nhà sản xuất hoặc đổi size tận nơi cho mình ạ!',
      'GUI_TIN_NHAN',
      'Hỏi đổi trả',
      5
    ],
    [
      'Thời gian làm việc & Mở cửa',
      'CHUA_TU_KHOA',
      'mở cửa, mấy giờ, giờ làm việc, đóng cửa',
      'Dạ shop mở cửa từ 8h30 đến 22h00 tất cả các ngày trong tuần (kể cả Thứ 7 & Chủ Nhật) ạ!',
      'GUI_TIN_NHAN',
      'Hỏi giờ mở cửa',
      5
    ],
    [
      'Lời chào tin nhắn đầu tiên',
      'TIN_NHAN_DAU',
      '',
      'Dạ shop xin chào {customer_name}! Shop có thể hỗ trợ gì cho mình hôm nay ạ?',
      'GUI_TIN_NHAN',
      'Khách mới',
      1
    ],
    [
      'Yêu cầu gặp nhân viên trực tiếp',
      'CHUYEN_NHAN_VIEN',
      'gặp nhân viên, tư vấn viên, khiếu nại, người thật',
      'Dạ em đã chuyển tiếp cuộc trò chuyện đến nhân viên trực chat. Nhân viên sẽ hỗ trợ {customer_name} ngay trong giây lát ạ!',
      'CHUYEN_NHAN_VIEN',
      'Cần hỗ trợ',
      20
    ]
  ];

  const ws = xlsx.utils.aoa_to_sheet([headers, ...sampleData]);
  ws['!cols'] = [
    { wch: 32 }, // Tên kịch bản
    { wch: 38 }, // Loại kích hoạt
    { wch: 50 }, // Từ khóa
    { wch: 65 }, // Nội dung trả lời
    { wch: 25 }, // Hành động
    { wch: 20 }, // Gắn nhãn
    { wch: 15 }  // Độ ưu tiên
  ];
  xlsx.utils.book_append_sheet(wb, ws, 'Kich_Ban_Mau');

  // Sheet 2: Trang hướng dẫn chi tiết
  const guideHeaders = ['HƯỚNG DẪN CẤU TRÚC VÀ QUY TẮC FILE KỊCH BẢN TỰ ĐỘNG'];
  const guideData = [
    [''],
    ['1. QUY TẮC ĐIỀN CÁC CỘT (Sheet "Kich_Ban_Mau"):'],
    ['- Tên kịch bản (*): Bắt buộc điền. Là tên gợi nhớ của kịch bản (VD: Tư vấn địa chỉ, Chính sách bảo hành).'],
    ['- Loại kích hoạt: Hỗ trợ 4 loại giá trị:'],
    ['    + CHUA_TU_KHOA: Tin nhắn khách có chứa bất kỳ từ khóa nào trong danh sách (khuyên dùng).'],
    ['    + CHINH_XAC: Tin nhắn khách phải trùng khớp 100% với từ khóa.'],
    ['    + TIN_NHAN_DAU: Kích hoạt khi khách gửi tin nhắn đầu tiên mở cuộc trò chuyện.'],
    ['    + CHUYEN_NHAN_VIEN: Kích hoạt khi khách yêu cầu gặp nhân viên hoặc khiếu nại.'],
    ['- Từ khóa kích hoạt: Bắt buộc nếu loại là CHUA_TU_KHOA, CHINH_XAC, CHUYEN_NHAN_VIEN. Các từ khóa phân cách nhau bằng dấu phẩy (,).'],
    ['- Nội dung trả lời: Bắt buộc nếu hành động là GUI_TIN_NHAN. Lời nhắn bot tự động phản hồi cho khách.'],
    ['- Hành động: Hỗ trợ các giá trị:'],
    ['    + GUI_TIN_NHAN: Bot tự động trả lời nội dung mẫu.'],
    ['    + CHUYEN_NHAN_VIEN: Tắt bot và chuyển giao hội thoại cho nhân viên trực chat.'],
    ['    + BAO_NHAN_VIEN: Gửi tin nhắn trả lời kèm thông báo nội bộ cho nhân viên.'],
    ['- Gắn nhãn khách: Tùy chọn. Tự động gắn tag cho khách hàng khi kích hoạt kịch bản (VD: Hỏi địa chỉ, Cần tư vấn).'],
    ['- Độ ưu tiên: Số nguyên (mặc định 0). Số càng lớn thì bot sẽ ưu tiên quét và kích hoạt trước.'],
    [''],
    ['2. CÁC BIẾN DỮ LIỆU ĐỘNG ĐƯỢC HỖ TRỢ TRONG NỘI DUNG (Hệ thống tự động thay thế theo thông tin thực tế của khách):'],
    ['    + {customer_name}: Tên Facebook thật của khách hàng.'],
    ['    + {shop_name}: Tên Fanpage / Cửa hàng của bạn.'],
    ['    + {phone}: Số điện thoại của khách nếu đã cung cấp.'],
    ['    + {shipping_address}: Địa chỉ nhận hàng của khách nếu có.'],
    [''],
    ['3. LƯU Ý QUAN TRỌNG:'],
    ['    - File mẫu KHÔNG chứa hình ảnh. Hình ảnh đính kèm (nếu cần) có thể tải lên bổ sung trong giao diện quản trị.'],
    ['    - Hãy nhập dữ liệu vào sheet "Kich_Ban_Mau". Không sửa đổi tiêu đề của dòng đầu tiên.']
  ];

  const wsGuide = xlsx.utils.aoa_to_sheet([guideHeaders, ...guideData]);
  wsGuide['!cols'] = [{ wch: 100 }];
  xlsx.utils.book_append_sheet(wb, wsGuide, 'Huong_Dan_Chi_Tiet');

  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * 12. Xuất toàn bộ kịch bản hiện tại ra file Excel để backup/chỉnh sửa
 */
export const exportScenariosToExcelBuffer = async ({ business_id, channel_id = '' }) => {
  const scenarios = await getBotScenariosService({ business_id, channel_id });
  const wb = xlsx.utils.book_new();
  const headers = [
    'Tên kịch bản',
    'Loại kích hoạt',
    'Từ khóa kích hoạt',
    'Nội dung trả lời',
    'Hành động',
    'Gắn nhãn khách',
    'Độ ưu tiên',
    'Trạng thái'
  ];

  const triggerTypeMap = {
    KEYWORD_CONTAINS: 'CHUA_TU_KHOA',
    KEYWORD_EXACT: 'CHINH_XAC',
    FIRST_MESSAGE: 'TIN_NHAN_DAU',
    HANDOVER_KEYWORD: 'CHUYEN_NHAN_VIEN'
  };

  const actionTypeMap = {
    REPLY_TEXT: 'GUI_TIN_NHAN',
    HANDOVER_STAFF: 'CHUYEN_NHAN_VIEN',
    NOTIFY_STAFF: 'BAO_NHAN_VIEN'
  };

  const rows = scenarios.map((s) => [
    s.scenario_name || '',
    triggerTypeMap[s.trigger_type] || s.trigger_type,
    (s.keywords || []).join(', '),
    s.response_content || '',
    actionTypeMap[s.action_type] || s.action_type,
    s.tag_to_add || '',
    s.priority || 0,
    s.is_active ? 'Đang bật' : 'Đang tắt'
  ]);

  const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 45 },
    { wch: 55 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 }
  ];

  xlsx.utils.book_append_sheet(wb, ws, 'Danh_Sach_Kich_Ban');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

