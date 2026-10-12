import { Router } from 'express';
import {
  verifyFacebookWebhook,
  handleFacebookWebhook
} from '../controllers/webhook.controller.js';

const webhookRouter = Router();

// Facebook Webhook Verification & Event Ingestion
// URL: /api/v1/webhooks/facebook (Công khai, không yêu cầu JWT vì Meta gọi đến)
webhookRouter.get('/facebook', verifyFacebookWebhook);
webhookRouter.post('/facebook', handleFacebookWebhook);

export default webhookRouter;
