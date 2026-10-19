import xlsx from 'xlsx';
import { KnowledgeBase } from '../models/index.js';

export const getKnowledgeService = async ({ business_id, search = '', category = '' }) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  const filter = { business_id };

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { content: searchRegex },
      { keywords: searchRegex }
    ];
  }

  if (category && category.trim() !== '') {
    filter.category = category;
  }

  const items = await KnowledgeBase.find(filter).sort({ updated_at: -1 });
  return items;
};

export const getKnowledgeByIdService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const item = await KnowledgeBase.findOne(filter);
  if (!item) throw new Error('Không tìm thấy tài liệu tri thức');
  return item;
};

export const createKnowledgeService = async (data, userId) => {
  if (!data.business_id) throw new Error('business_id là bắt buộc');
  const item = await KnowledgeBase.create({
    ...data,
    created_by: userId
  });
  return item;
};

export const updateKnowledgeService = async (id, data, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const item = await KnowledgeBase.findOneAndUpdate(filter, data, { new: true });
  if (!item) throw new Error('Không tìm thấy tài liệu tri thức để cập nhật');
  return item;
};

export const deleteKnowledgeService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const result = await KnowledgeBase.findOneAndDelete(filter);
  if (!result) throw new Error('Không tìm thấy tài liệu tri thức để xóa');
  return { message: 'Đã xóa tài liệu tri thức thành công' };
};

/**
 * Phân tích nội dung file Excel / CSV tài liệu tri thức thành mảng dữ liệu
 */
export const parseKnowledgeFile = (fileBuffer) => {
  if (!fileBuffer) throw new Error('File không hợp lệ hoặc rỗng');

  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  let targetSheetName = workbook.SheetNames.find(
    (s) => s.toLowerCase().includes('tri_thuc') || s.toLowerCase().includes('knowledge') || s.toLowerCase().includes('faq')
  ) || workbook.SheetNames[0];

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
    let title = '';
    let categoryRaw = '';
    let content = '';
    let keywordsRaw = '';
    let actionTypeRaw = '';

    for (const [key, val] of Object.entries(rawRow)) {
      const normKey = normalizeHeaderKey(key);
      const strVal = String(val !== undefined && val !== null ? val : '').trim();

      if (normKey.includes('tieu_de') || normKey.includes('title') || normKey === 'ten') {
        title = strVal;
      } else if (normKey.includes('phan_loai') || normKey.includes('danh_muc') || normKey.includes('category')) {
        categoryRaw = strVal;
      } else if (normKey.includes('noi_dung') || normKey.includes('content')) {
        content = strVal;
      } else if (normKey.includes('tu_khoa') || normKey.includes('keywords') || normKey === 'keyword') {
        keywordsRaw = strVal;
      } else if (normKey.includes('hanh_dong') || normKey.includes('action') || normKey.includes('co_che')) {
        actionTypeRaw = strVal;
      }
    }

    // Chuẩn hóa category linh hoạt (hỗ trợ cả danh mục mẫu lẫn danh mục tùy chỉnh người dùng tự đặt)
    let category = categoryRaw.trim() || 'Thông tin chung';
    const normCat = normalizeHeaderKey(categoryRaw);
    if (normCat.includes('van_chuyen') || normCat.includes('shipping') || normCat.includes('giao_hang') || normCat.includes('ship')) {
      category = 'Chính sách vận chuyển & Phí ship';
    } else if (normCat.includes('doi_tra') || normCat.includes('return') || normCat.includes('bao_hanh')) {
      category = 'Chính sách đổi trả & Bảo hành';
    } else if (normCat.includes('bang_size') || normCat.includes('size_guide') || normCat === 'size') {
      category = 'Bảng hướng dẫn chọn size';
    } else if (normCat.includes('khuyen_mai') || normCat.includes('promotion') || normCat.includes('voucher') || normCat.includes('giam_gia')) {
      category = 'Khuyến mãi & Ưu đãi';
    } else if (normCat.includes('faq') || normCat.includes('cau_hoi') || normCat.includes('hoi_dap')) {
      category = 'Câu hỏi thường gặp';
    } else if (normCat.includes('chung') || normCat.includes('general')) {
      category = 'Thông tin chung';
    } else if (categoryRaw.trim()) {
      // Giữ nguyên danh mục tùy chỉnh do người dùng đặt (VD: "Hướng dẫn lắp ráp", "An toàn độ tuổi",...)
      category = categoryRaw.trim();
    }

    // Chuẩn hóa keywords
    const cleanKeywords = keywordsRaw
      ? keywordsRaw.split(/[,;\n\r]+/).map((k) => k.trim()).filter(Boolean)
      : [];

    // Chuẩn hóa action_type
    let action_type = 'NONE';
    const normAct = normalizeHeaderKey(actionTypeRaw);
    if (normAct.includes('danh_muc') || normAct.includes('catalog') || normAct.includes('lookup')) {
      action_type = 'LOOKUP_CATALOG';
    } else if (normAct.includes('24h') || normAct.includes('follow') || normAct.includes('cham_soc')) {
      action_type = 'SCHEDULE_FOLLOWUP';
    } else if (normAct.includes('voucher') || normAct.includes('giam_gia') || normAct.includes('khuyen_mai') || normAct.includes('apply_voucher')) {
      action_type = 'APPLY_VOUCHER';
    } else if (normAct.includes('tag') || normAct.includes('nhan') || normAct.includes('crm')) {
      action_type = 'AUTO_TAG_CUSTOMER';
    } else if (normAct.includes('huy_don') || normAct.includes('cancel')) {
      action_type = 'CANCEL_ORDER';
    } else if (normAct.includes('cap_nhat_don') || normAct.includes('update_order') || normAct.includes('sua_don')) {
      action_type = 'UPDATE_ORDER';
    } else if (normAct.includes('khach_hang') || normAct.includes('update_customer') || normAct.includes('khach')) {
      action_type = 'UPDATE_CUSTOMER';
    }

    const errors = [];
    if (!title) {
      errors.push('Tiêu đề tài liệu không được để trống');
    }
    if (!content) {
      errors.push('Nội dung tài liệu cho AI học không được để trống');
    }

    return {
      row_index: index + 2,
      title,
      category,
      content,
      keywords: cleanKeywords,
      action_type,
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
 * Xem trước dữ liệu tài liệu tri thức trước khi lưu
 */
export const previewKnowledgeFromFile = ({ fileBuffer }) => {
  return parseKnowledgeFile(fileBuffer);
};

/**
 * Nhập hàng loạt tài liệu tri thức từ file Excel / CSV vào MongoDB
 */
export const importKnowledgeFromBuffer = async ({
  business_id,
  fileBuffer,
  overwriteMode = 'SKIP', // 'OVERWRITE' | 'SKIP'
  userId = null
}) => {
  if (!business_id) throw new Error('business_id là bắt buộc');
  const parsed = parseKnowledgeFile(fileBuffer);

  const validRows = parsed.rows.filter((r) => r.isValid);
  if (validRows.length === 0) {
    return {
      total: parsed.total,
      successCount: 0,
      updatedCount: 0,
      skippedCount: parsed.invalidCount,
      errors: parsed.rows
        .filter((r) => !r.isValid)
        .map((r) => ({ row: r.row_index, title: r.title, errors: r.errors }))
    };
  }

  let successCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of validRows) {
    const existing = await KnowledgeBase.findOne({
      business_id,
      title: row.title
    });

    if (existing) {
      if (overwriteMode === 'OVERWRITE') {
        existing.category = row.category;
        existing.content = row.content;
        existing.keywords = row.keywords;
        if (row.action_type) existing.action_type = row.action_type;
        existing.is_active = true;
        await existing.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    } else {
      await KnowledgeBase.create({
        business_id,
        title: row.title,
        category: row.category,
        content: row.content,
        keywords: row.keywords,
        action_type: row.action_type || 'NONE',
        is_active: true,
        created_by: userId
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
      .map((r) => ({ row: r.row_index, title: r.title, errors: r.errors }))
  };
};

/**
 * Tạo file Excel mẫu chuẩn cho Kho Tri Thức RAG (2 sheets)
 */
export const generateKnowledgeTemplateBuffer = () => {
  const wb = xlsx.utils.book_new();

  // Sheet 1: Trang điền tài liệu
  const headers = [
    'Tiêu đề tài liệu (* Bắt buộc)',
    'Phân loại danh mục (Tự do đặt tên theo ngành hàng hoặc dùng gợi ý có sẵn)',
    'Nội dung cho AI học (* Bắt buộc)',
    'Từ khóa liên quan (Cách nhau bằng dấu phẩy)'
  ];

  const sampleData = [
    [
      'Chính sách Giao hàng & Phí ship toàn quốc',
      'Vận chuyển & Giao hàng',
      'Shop hỗ trợ giao hàng COD toàn quốc, khách được kiểm tra hàng trước khi thanh toán. Nội thành Hà Nội nhận trong 1 - 2 ngày, tỉnh khác 2 - 4 ngày. Miễn phí vận chuyển cho đơn hàng từ 299.000đ trở lên.',
      'ship, giao hàng, phí ship, cod, kiểm hàng, hỏa tốc'
    ],
    [
      'Chính sách Đổi trả & Hỗ trợ bù mảnh Lego thiếu',
      'Chính sách Đổi trả & Bảo hành',
      'Hỗ trợ đổi trả miễn phí trong 7 ngày nếu lỗi từ nhà sản xuất. Đặc biệt, nếu khui hộp phát hiện thiếu chi tiết/mảnh ghép, shop cam kết hỗ trợ gửi bù part/mảnh thiếu miễn phí 100%.',
      'đổi trả, bảo hành, thiếu mảnh, mất chi tiết, lỗi'
    ],
    [
      'Cam kết nguồn gốc xuất xứ & Lego chính hãng',
      'Câu hỏi thường gặp',
      '100% sản phẩm tại shop là Lego chính hãng, nguyên seal hộp và đầy đủ tem phụ, mã vạch nhập khẩu rõ ràng. Cam kết hoàn tiền 200% nếu phát hiện hàng giả, hàng nhái kém chất lượng.',
      'chính hãng, auth, fake, nguồn gốc, xuất xứ, tem phụ'
    ],
    [
      'Địa chỉ Showroom & Thời gian hoạt động',
      'Thông tin chung',
      'Cửa hàng trưng bày tại: Số 123 đường Cầu Giấy, Hà Nội. Giờ mở cửa: 8h30 - 21h30 hằng ngày (kể cả Thứ 7 và Chủ Nhật). Hotline hỗ trợ khẩn cấp: 0988.123.456.',
      'địa chỉ, ở đâu, shop ở đâu, showroom, giờ mở cửa, hotline'
    ],
    [
      'Tư vấn chọn Lego theo độ tuổi và sở thích',
      'Tư vấn độ tuổi & Lắp ráp',
      'Dưới 4 tuổi chọn Lego Duplo (mảnh to an toàn). 4 đến 8 tuổi chọn Classic, City, Friends (màu sắc sinh động). Trên 9 tuổi chọn Speed Champions, Technic, Star Wars (sưu tầm, cơ khí tinh xảo).',
      'độ tuổi, mấy tuổi, cho bé, tư vấn size, lắp ráp'
    ]
  ];

  const ws = xlsx.utils.aoa_to_sheet([headers, ...sampleData]);
  ws['!cols'] = [
    { wch: 42 }, // Tiêu đề
    { wch: 38 }, // Danh mục
    { wch: 75 }, // Nội dung
    { wch: 45 }  // Từ khóa
  ];
  xlsx.utils.book_append_sheet(wb, ws, 'Tai_Lieu_Tri_Thuc_Mau');

  // Sheet 2: Trang hướng dẫn chi tiết
  const guideHeaders = ['HƯỚNG DẪN CẤU TRÚC VÀ QUY TẮC FILE KHO TRI THỨC RAG'];
  const guideData = [
    [''],
    ['1. QUY TẮC ĐIỀN CÁC CỘT (Sheet "Tai_Lieu_Tri_Thuc_Mau"):'],
    ['- Tiêu đề tài liệu (*): Bắt buộc điền. Tên ngắn gọn của chính sách (VD: Chính sách đổi trả hàng, Phí giao hàng).'],
    ['- Phân loại danh mục: TỰ DO ĐẶT TÊN theo từng ngành hàng (VD: "Hướng dẫn lắp ráp", "Độ tuổi & An toàn", "Bảo quản sản phẩm",...) hoặc dùng các nhóm phổ biến:'],
    ['    + Vận chuyển & Giao hàng (hoặc SHIPPING / VAN_CHUYEN): Quy định ship hàng, phí ship, thời gian giao, COD.'],
    ['    + Chính sách Đổi trả & Bảo hành (hoặc RETURN_POLICY / DOI_TRA): Quy định đổi trả hàng, điều kiện hoàn tiền, bù mảnh.'],
    ['    + Khuyến mãi & Ưu đãi (hoặc PROMOTION / KHUYEN_MAI): Các chương trình ưu đãi, voucher, quà tặng.'],
    ['    + Câu hỏi thường gặp (hoặc FAQ): Các câu hỏi khách hàng hay thắc mắc nhất.'],
    ['    + Thông tin chung (hoặc GENERAL / CHUNG): Địa chỉ showroom, giờ mở cửa, hotline liên hệ...'],
    ['- Nội dung cho AI học (*): Bắt buộc. Viết đầy đủ, rõ ràng và mạch lạc. AI Gemini sẽ dùng thông tin này để trả lời khách.'],
    ['- Từ khóa liên quan: Các từ ngữ khách thường hỏi liên quan đến tài liệu này, phân cách bằng dấu phẩy (,).'],
    [''],
    ['2. LƯU Ý KHI SOẠN THẢO:'],
    ['    - Không sửa đổi tên tiêu đề ở dòng 1 của sheet "Tai_Lieu_Tri_Thuc_Mau".'],
    ['    - Viết nội dung bằng tiếng Việt có dấu để AI đạt độ chính xác cao nhất.']
  ];

  const wsGuide = xlsx.utils.aoa_to_sheet([guideHeaders, ...guideData]);
  wsGuide['!cols'] = [{ wch: 100 }];
  xlsx.utils.book_append_sheet(wb, wsGuide, 'Huong_Dan_Chi_Tiet');

  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

