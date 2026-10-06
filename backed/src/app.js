import express from 'express';
import cors from 'cors';
import rootRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ file tĩnh (Ảnh upload)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Root API routes
app.use('/api/v1', rootRouter);

// Centralized error handling
app.use(errorHandler);

export default app;
