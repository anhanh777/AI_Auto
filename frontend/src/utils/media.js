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

/**
 * Chuẩn hóa Avatar Kênh / Fanpage / Doanh nghiệp
 * Đảm bảo kênh Facebook luôn dùng permanent Graph API link để không bao giờ bị lỗi 403 Forbidden do token CDN hết hạn
 */
export const resolveChannelAvatar = (channel, business = null) => {
  if (!channel && !business) return '';

  // 1. Kênh Facebook có page_id -> Dùng Graph API URL vĩnh viễn
  if (channel?.page_id) {
    return `https://graph.facebook.com/${channel.page_id}/picture?type=large`;
  }

  // 2. Kênh có avatar_url
  if (channel?.avatar_url) {
    if (channel.avatar_url.includes('scontent.') && channel.avatar_url.includes('fbcdn.net') && channel.page_id) {
      return `https://graph.facebook.com/${channel.page_id}/picture?type=large`;
    }
    return resolveMediaUrl(channel.avatar_url);
  }

  // 3. Fallback sang logo của business
  if (business?.logo_url) {
    return resolveMediaUrl(business.logo_url);
  }

  return '';
};

/**
 * Lấy 2 chữ cái viết tắt của tên (để làm Avatar Fallback sang trọng khi không có ảnh hoặc ảnh lỗi)
 */
export const getInitials = (name, fallback = 'AI') => {
  if (!name || typeof name !== 'string') return fallback;
  const clean = name.trim();
  if (!clean) return fallback;
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};
