import { Router } from 'express';
import { getBusinessAnalytics } from '../controllers/analytics.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getBusinessAnalytics);

export default router;
