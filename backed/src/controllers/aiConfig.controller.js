import { getAIConfigService, updateAIConfigService } from '../services/aiConfig.service.js';
import { consultWithGeminiAI } from '../services/geminiAI.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getAIConfig = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    const channel_id = req.query.channel_id || null;
    const config = await getAIConfigService(business_id, channel_id);
    return sendSuccess(res, 'Lấy cấu hình Bot AI thành công', config);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const updateAIConfig = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.body.business_id;
    const channel_id = req.body.channel_id || null;
    const updated = await updateAIConfigService(business_id, req.body, req.user?._id, channel_id);
    return sendSuccess(res, 'Cập nhật cấu hình Bot AI thành công', updated);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const testAIChat = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.body.business_id;
    const { messageText } = req.body;
    if (!messageText) return sendError(res, 'Vui lòng nhập nội dung tin nhắn để thử nghiệm', null, 400);

    const result = await consultWithGeminiAI({
      business_id,
      messageText
    });

    return sendSuccess(res, 'Trợ lý AI đã phản hồi thử nghiệm', result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};
