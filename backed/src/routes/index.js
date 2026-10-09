import { Router } from 'express';
import authRouter from './auth.route.js';
import userRouter from './user.route.js';
import uploadRouter from './upload.route.js';
import businessRouter from './business.route.js';
import channelRouter from './channel.route.js';
import conversationRouter from './conversation.route.js';
import categoryRouter from './category.route.js';
import productRouter from './product.route.js';
import customerRouter from './customer.route.js';
import aiConfigRouter from './aiConfig.route.js';
import orderRouter from './order.route.js';
import knowledgeRouter from './knowledge.route.js';
import analyticsRouter from './analytics.route.js';

const rootRouter = Router();

// Health check endpoint
rootRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'AI Sales Consultant API',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// Đăng ký toàn bộ các router phân hệ của Business
rootRouter.use('/auth', authRouter);
rootRouter.use('/users', userRouter);
rootRouter.use('/upload', uploadRouter);
rootRouter.use('/businesses', businessRouter);
rootRouter.use('/channels', channelRouter);
rootRouter.use('/conversations', conversationRouter);
rootRouter.use('/categories', categoryRouter);
rootRouter.use('/products', productRouter);
rootRouter.use('/customers', customerRouter);
rootRouter.use('/ai-config', aiConfigRouter);
rootRouter.use('/orders', orderRouter);
rootRouter.use('/knowledge', knowledgeRouter);
rootRouter.use('/analytics', analyticsRouter);

export default rootRouter;
