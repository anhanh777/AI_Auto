import express from 'express';
import cors from 'cors';
import rootRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root API routes
app.use('/api/v1', rootRouter);

// Centralized error handling
app.use(errorHandler);

export default app;
