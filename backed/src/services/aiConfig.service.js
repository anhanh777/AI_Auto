import { AIConfig, Business } from '../models/index.js';

export const DEFAULT_AI_PROMPT = 'Bạn là chuyên viên tư vấn bán hàng thông minh, nhiệt tình và chu đáo. Hãy chào đón khách hàng, giải đáp chi tiết thông tin sản phẩm dựa trên kho hàng và hỗ trợ khách đặt hàng một cách chuyên nghiệp, lịch sự.';
export const DEFAULT_WELCOME_MESSAGE = 'Dạ shop xin chào bạn ạ! Bạn đang quan tâm đến mẫu sản phẩm nào để shop hỗ trợ tư vấn ngay cho mình nhé?';
export const DEFAULT_GUARDRAILS = ['chửi bậy', 'lừa đảo', 'hoàn tiền gấp', 'hàng giả', 'hàng nhái', 'đối thủ'];

export const getAIConfigService = async (business_id, channel_id = null) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  const filter = { business_id };
  if (channel_id) filter.channel_id = channel_id;
  else filter.channel_id = null;

  let config = await AIConfig.findOne(filter);
  // Nếu tìm theo channel_id không thấy, fallback về cấu hình chung của business (channel_id: null)
  if (!config && channel_id) {
    config = await AIConfig.findOne({ business_id, channel_id: null });
  }
  if (!config) {
    config = await AIConfig.findOne({ business_id });
  }

  // Lấy tên business để cá nhân hóa prompt mặc định
  let shopName = 'cửa hàng';
  try {
    const biz = await Business.findById(business_id).select('business_name').lean();
    if (biz?.business_name) shopName = biz.business_name;
  } catch (err) {
    // ignore
  }

  const customDefaultPrompt = `Bạn là chuyên viên tư vấn bán hàng thông minh, nhiệt tình và chu đáo của ${shopName}. Hãy giải đáp chi tiết, giới thiệu mẫu mã sản phẩm từ kho hàng và hỗ trợ khách đặt hàng lịch sự, nhanh chóng.`;

  if (!config) {
    // Tạo cấu hình mặc định cho business
    config = await AIConfig.create({
      business_id,
      channel_id: channel_id || null,
      bot_name: 'AI Assistant',
      ai_persona_tone: 'FRIENDLY',
      system_prompt: customDefaultPrompt,
      welcome_message: DEFAULT_WELCOME_MESSAGE,
      guardrail_blocklist: DEFAULT_GUARDRAILS,
      smart_delay_seconds: 3,
      auto_order_extraction: true,
      is_active: true
    });
  }

  // Tự động phục hồi nếu dữ liệu trong DB bị rỗng (do lỗi lưu trước đây)
  let needSave = false;
  if (!config.system_prompt || !config.system_prompt.trim()) {
    config.system_prompt = customDefaultPrompt;
    needSave = true;
  }
  if (!config.welcome_message || !config.welcome_message.trim()) {
    config.welcome_message = DEFAULT_WELCOME_MESSAGE;
    needSave = true;
  }
  if (!config.guardrail_blocklist || config.guardrail_blocklist.length === 0) {
    config.guardrail_blocklist = DEFAULT_GUARDRAILS;
    needSave = true;
  }
  if (needSave) {
    await config.save();
  }

  return config;
};

export const updateAIConfigService = async (business_id, data, userId, channel_id = null) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  const filter = { business_id };
  if (channel_id) filter.channel_id = channel_id;
  else filter.channel_id = null;

  const updateData = { ...data };
  // Tránh việc lưu chuỗi rỗng làm mất prompt của AI
  if (updateData.system_prompt !== undefined && !updateData.system_prompt?.trim()) {
    let shopName = 'cửa hàng';
    try {
      const biz = await Business.findById(business_id).select('business_name').lean();
      if (biz?.business_name) shopName = biz.business_name;
    } catch (err) {}
    updateData.system_prompt = `Bạn là chuyên viên tư vấn bán hàng thông minh, nhiệt tình và chu đáo của ${shopName}. Hãy giải đáp chi tiết, giới thiệu mẫu mã sản phẩm từ kho hàng và hỗ trợ khách đặt hàng lịch sự, nhanh chóng.`;
  }
  if (updateData.welcome_message !== undefined && !updateData.welcome_message?.trim()) {
    updateData.welcome_message = DEFAULT_WELCOME_MESSAGE;
  }
  if (updateData.guardrail_blocklist !== undefined && (!Array.isArray(updateData.guardrail_blocklist) || updateData.guardrail_blocklist.length === 0)) {
    updateData.guardrail_blocklist = DEFAULT_GUARDRAILS;
  }

  const updated = await AIConfig.findOneAndUpdate(
    filter,
    { ...updateData, business_id, channel_id: channel_id || null, updated_by: userId },
    { new: true, upsert: true }
  );
  return updated;
};
