import { Router } from 'express';

const rootRouter = Router();

rootRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
});

export default rootRouter;
