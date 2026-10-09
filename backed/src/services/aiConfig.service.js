import { AIConfig } from '../models/index.js';

export const getAIConfigService = async (business_id, channel_id = null) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  const filter = { business_id };
  if (channel_id) filter.channel_id = channel_id;
  else filter.channel_id = null;

  let config = await AIConfig.findOne(filter);
  if (!config) {
    // Tạo cấu hình mặc định cho business
    config = await AIConfig.create({
      business_id,
      channel_id: channel_id || null,
      bot_name: 'AI Assistant',
      ai_persona_tone: 'FRIENDLY',
      system_prompt: 'Bạn là chuyên viên tư vấn bán hàng thời trang thông minh, nhiệt tình và chu đáo.',
      welcome_message: 'Dạ shop xin chào bạn ạ! Bạn đang quan tâm đến mẫu sản phẩm nào để shop hỗ trợ tư vấn ngay cho mình nhé?',
      guardrail_blocklist: ['chửi bậy', 'lừa đảo', 'hoàn tiền gấp', 'hàng giả', 'đối thủ'],
      smart_delay_seconds: 3,
      auto_order_extraction: true,
      is_active: true
    });
  }
  return config;
};

export const updateAIConfigService = async (business_id, data, userId, channel_id = null) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  const filter = { business_id };
  if (channel_id) filter.channel_id = channel_id;
  else filter.channel_id = null;

  const updated = await AIConfig.findOneAndUpdate(
    filter,
    { ...data, business_id, channel_id: channel_id || null, updated_by: userId },
    { new: true, upsert: true }
  );
  return updated;
};
