import { Router } from 'express';
import { getAIConfig, updateAIConfig } from '../controllers/aiConfig.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAIConfig);
router.put('/', updateAIConfig);

export default router;
