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
 * Tự động tạo SKU Sản phẩm: In hoa, ngăn cách bởi dấu gạch ngang (-)
 * Ví dụ: "Áo Polo Nam Trắng Size L" -> "AO-POLO-NAM-TRANG-SIZE-L"
 */
export const generateSku = (name) => {
  if (!name) return '';
  const clean = removeVietnameseTones(name)
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .toUpperCase();
  return clean;
};
