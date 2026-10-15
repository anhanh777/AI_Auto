/**
 * Media URL Resolver
 * Chuẩn hóa URL ảnh (local / relative / localhost -> Cloud Render Backend HTTPS)
 */
const DEFAULT_BACKEND_URL = 'https://ai-auto-backend.onrender.com';

export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  // Giữ nguyên blob/data URL preview
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  const backendBase = (import.meta.env.VITE_SOCKET_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');

  // Xử lý link localhost:5000 từ dữ liệu cũ
  if (url.includes('localhost:5000') || url.includes('127.0.0.1:5000')) {
    return url.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):5000/g, backendBase);
  }

  // Xử lý relative path (/uploads/... hoặc /stickers/...)
  if (url.startsWith('/uploads/') || url.startsWith('/stickers/')) {
    return `${backendBase}${url}`;
  }

  return url;
};
