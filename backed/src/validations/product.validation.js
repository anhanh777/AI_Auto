export const validateProductInput = ({ name, category_id, sku, base_price }) => {
  const errors = [];
  if (!name || name.trim() === '') {
    errors.push('Tên sản phẩm không được để trống');
  }
  if (!category_id) {
    errors.push('Danh mục sản phẩm là bắt buộc');
  }
  if (!sku || sku.trim() === '') {
    errors.push('Mã SKU không được để trống');
  }
  if (base_price === undefined || base_price === null || Number(base_price) < 0) {
    errors.push('Giá bán phải là số dương lớn hơn hoặc bằng 0');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};
