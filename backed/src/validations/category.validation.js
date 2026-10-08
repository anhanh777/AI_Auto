export const validateCategoryInput = ({ business_id, category_name }) => {
  const errors = [];
  if (!business_id) {
    errors.push('Doanh nghiệp (business_id) là bắt buộc');
  }
  if (!category_name || category_name.trim().length < 2) {
    errors.push('Tên danh mục sản phẩm phải từ 2 ký tự trở lên');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};
