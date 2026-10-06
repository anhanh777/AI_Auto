import { Router } from 'express';
import authRouter from './auth.route.js';
import userRouter from './user.route.js';
import uploadRouter from './upload.route.js';

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

// Đăng ký các router phân hệ
rootRouter.use('/auth', authRouter);
rootRouter.use('/users', userRouter);
rootRouter.use('/upload', uploadRouter);

export default rootRouter;
