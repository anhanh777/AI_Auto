import {
  getBotScenariosService,
  getBotScenarioByIdService,
  createBotScenarioService,
  updateBotScenarioService,
  toggleBotScenarioService,
  deleteBotScenarioService,
  matchIncomingMessageToScenario
} from '../services/botScenario.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getBotScenarios = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const scenarios = await getBotScenariosService({
      ...req.query,
      business_id
    });
    return sendSuccess(res, 'Lấy danh sách kịch bản bot thành công', scenarios);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getBotScenarioById = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const scenario = await getBotScenarioByIdService(req.params.id, business_id);
    return sendSuccess(res, 'Lấy thông tin kịch bản bot thành công', scenario);
  } catch (error) {
    return sendError(res, error.message, null, 404);
  }
};

export const createBotScenario = async (req, res) => {
  try {
    const business_id = req.body.business_id || req.headers['x-business-id'];
    const scenario = await createBotScenarioService(
      { ...req.body, business_id },
      req.user?._id
    );
    return sendSuccess(res, 'Tạo kịch bản bot mới thành công', scenario, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const updateBotScenario = async (req, res) => {
  try {
    const business_id = req.body.business_id || req.headers['x-business-id'];
    const scenario = await updateBotScenarioService(
      req.params.id,
      req.body,
      business_id,
      req.user?._id
    );
    return sendSuccess(res, 'Cập nhật kịch bản bot thành công', scenario);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const toggleBotScenario = async (req, res) => {
  try {
    const business_id = req.body.business_id || req.headers['x-business-id'];
    const scenario = await toggleBotScenarioService(
      req.params.id,
      business_id,
      req.user?._id
    );
    return sendSuccess(
      res,
      `Đã ${scenario.is_active ? 'bật' : 'tắt'} kịch bản "${scenario.scenario_name}"`,
      scenario
    );
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const deleteBotScenario = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const result = await deleteBotScenarioService(req.params.id, business_id);
    return sendSuccess(res, result.message);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

/**
 * Endpoint giả lập thử nghiệm kịch bản (Simulator / Sandbox)
 * Giúp chủ shop gõ thử 1 tin nhắn xem kịch bản nào sẽ được kích hoạt
 */
export const testMatchScenario = async (req, res) => {
  try {
    const business_id = req.body.business_id || req.headers['x-business-id'];
    const { message_text, channel_id, is_first_message } = req.body;
    const matched = await matchIncomingMessageToScenario({
      business_id,
      channel_id,
      messageText: message_text || '',
      isFirstMessage: !!is_first_message
    });
    return sendSuccess(res, 'Kết quả thử nghiệm kịch bản', {
      is_matched: !!matched,
      scenario: matched || null
    });
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};
