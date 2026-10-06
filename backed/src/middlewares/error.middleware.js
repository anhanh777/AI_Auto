import { sendError } from '../utils/response.util.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[Error Middleware]:', err);
  const status = err.statusCode || 500;
  const message = err.message || 'Lỗi máy chủ nội bộ (Internal Server Error)';
  return sendError(res, message, err.errors || undefined, status);
};
