import mongoose from 'mongoose';
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
        return k && normalizedText.includes(k);
      });
      if (isMatched) return scenario;
    }
  }

  return null;
};
