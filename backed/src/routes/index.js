import { Router } from 'express';
import authRouter from './auth.route.js';
import userRouter from './user.route.js';
import uploadRouter from './upload.route.js';
import businessRouter from './business.route.js';
import categoryRouter from './category.route.js';
import productRouter from './product.route.js';

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
rootRouter.use('/businesses', businessRouter);
rootRouter.use('/categories', categoryRouter);
rootRouter.use('/products', productRouter);

export default rootRouter;
