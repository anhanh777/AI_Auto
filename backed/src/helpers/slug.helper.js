/**
 * Chuyển chuỗi tiếng Việt có dấu thành URL Slug không dấu
 * @param {string} str - Chuỗi ban đầu (VD: "Áo Thun Nam Cao Cấp")
 * @returns {string} Slug chuẩn (VD: "ao-thun-nam-cao-cap")
 */
export const createSlug = (str) => {
  if (!str) return '';
  let slug = str.toLowerCase();

  // Đổi ký tự có dấu thành không dấu
  slug = slug.replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a');
  slug = slug.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e');
  slug = slug.replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i');
  slug = slug.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o');
  slug = slug.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u');
  slug = slug.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y');
  slug = slug.replace(/đ/gi, 'd');

  // Xóa các ký tự đặc biệt
  slug = slug.replace(/[^a-z0-9 -]/g, '');
  // Đổi khoảng trắng thành dấu gạch ngang
  slug = slug.replace(/\s+/g, '-');
  // Gom nhiều dấu gạch ngang liên tiếp thành 1
  slug = slug.replace(/-+/g, '-');
  // Cắt gạch ngang ở đầu và cuối
  slug = slug.replace(/^-+|-+$/g, '');

  return slug;
};
