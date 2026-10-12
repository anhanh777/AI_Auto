import {
  verifyWebhookService,
  handleWebhookPayloadService
} from '../services/facebookWebhook.service.js';

/**
 * GET /api/v1/webhooks/facebook
 * Xác thực Webhook từ Meta Developers (Verify Token)
 */
export const verifyFacebookWebhook = async (req, res, next) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const validChallenge = await verifyWebhookService({ mode, token, challenge });
    if (validChallenge) {
      console.log('[Facebook Webhook] Xác thực Webhook thành công từ Meta!');
      return res.status(200).send(validChallenge);
    }

    console.warn('[Facebook Webhook] Xác thực thất bại: Verify Token không hợp lệ');
    return res.status(403).send('Forbidden: Invalid Verify Token');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/webhooks/facebook
 * Tiếp nhận sự kiện tin nhắn từ Meta Facebook (Webhook Callback)
 */
export const handleFacebookWebhook = async (req, res, next) => {
  try {
    // Luôn phản hồi 200 OK ngay lập tức cho Facebook để tránh Facebook retry
    res.status(200).send('EVENT_RECEIVED');

    // Xử lý sự kiện tin nhắn bất đồng bộ
    await handleWebhookPayloadService(req.body);
  } catch (error) {
    console.error('[Facebook Webhook Error]', error);
  }
};
