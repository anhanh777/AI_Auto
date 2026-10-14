import { Router } from 'express';
import { getAIConfig, updateAIConfig, testAIChat } from '../controllers/aiConfig.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAIConfig);
router.put('/', updateAIConfig);
router.post('/chat-test', testAIChat);

export default router;
