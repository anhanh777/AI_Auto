import express from 'express';
import cors from 'cors';
import rootRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ file tĩnh (Ảnh upload)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check / root route
app.get('/', (req, res) => {
  res.status(200).send('AI Sales System Backend OK');
});

// Root API routes
app.use('/api/v1', rootRouter);

// Centralized error handling
app.use(errorHandler);

export default app;
