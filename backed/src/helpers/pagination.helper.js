/**
 * Hàm tính toán phân trang chuẩn dùng chung cho toàn bộ hệ thống
 * @param {number|string} queryPage - Số trang từ URL query (mặc định 1)
 * @param {number|string} queryLimit - Số lượng bản ghi mỗi trang (mặc định 10)
 * @param {number} totalItems - Tổng số bản ghi đếm được từ CSDL
 * @returns {Object} Thông tin phân trang { page, limit, skip, totalItems, totalPages, hasNext, hasPrev }
 */
export const getPagination = (queryPage = 1, queryLimit = 10, totalItems = 0) => {
  const page = Math.max(1, parseInt(queryPage, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryLimit, 10) || 10)); // Giới hạn tối đa 100
  const skip = (page - 1) * limit;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    page,
    limit,
    skip,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};
