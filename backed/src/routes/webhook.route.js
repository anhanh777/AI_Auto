import { Router } from 'express';
import {
  verifyFacebookWebhook,
  handleFacebookWebhook
} from '../controllers/webhook.controller.js';

const webhookRouter = Router();

// Facebook Webhook Verification & Event Ingestion
// Hỗ trợ cả / và /facebook (Công khai, không yêu cầu JWT vì Meta gọi đến)
webhookRouter.get('/', verifyFacebookWebhook);
webhookRouter.post('/', handleFacebookWebhook);
webhookRouter.get('/facebook', verifyFacebookWebhook);
webhookRouter.post('/facebook', handleFacebookWebhook);

export default webhookRouter;
