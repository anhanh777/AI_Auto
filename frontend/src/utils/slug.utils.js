/**
 * Utility: Chuyển đổi chuỗi tiếng Việt có dấu thành không dấu và tạo Slug / Code chuẩn
 */

export const removeVietnameseTones = (str) => {
  if (!str) return '';
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/[đĐ]/g, 'd');
  return str;
};

/**
 * Tự động tạo Business Code: In hoa, ngăn cách bởi dấu gạch dưới (_)
 * Ví dụ: "Soulmade Premium Fashion" -> "SOULMADE_PREMIUM_FASHION"
 */
export const generateBusinessCode = (name) => {
  if (!name) return '';
  const clean = removeVietnameseTones(name)
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
  return clean;
};

/**
 * Tự động tạo Slug danh mục / URL: Chữ thường, ngăn cách bởi dấu gạch ngang (-)
 * Ví dụ: "Áo Thun Nam Cotton" -> "ao-thun-nam-cotton"
 */
export const generateSlug = (name) => {
  if (!name) return '';
  const clean = removeVietnameseTones(name)
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
  return clean;
};

/**
 * Tự động tạo SKU Sản phẩm thông minh (Cách 1):
 * Lấy chữ cái đầu của 3-4 từ đầu tiên + hậu tố 3 số ngẫu nhiên
 * Ví dụ: "Kem Massage Body Thon Gọn Săn Chắc Sline 6D" -> "KMB-108"
 * Ví dụ: "Áo Thun Nam Cao Cấp" -> "ATN-452"
 * Nếu tên quá ngắn hoặc rỗng -> "SP-108"
 */
export const generateSku = (name) => {
  if (!name || !name.trim()) {
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `SP-${randomNum}`;
  }

  const clean = removeVietnameseTones(name)
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);

  // Lấy chữ cái đầu của tối đa 3-4 từ đầu tiên
  const maxWords = Math.min(words.length, 3);
  let prefix = words
    .slice(0, maxWords)
    .map((w) => w[0].toUpperCase())
    .join('');

  if (!prefix || prefix.length < 2) {
    prefix = 'SP';
  }

  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${randomNum}`;
};
