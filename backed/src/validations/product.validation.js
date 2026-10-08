export const validateProductInput = ({
  business_id,
  category_ids,
  category_id,
  sku,
  product_name,
  base_price
}) => {
  const errors = [];
  if (!business_id) {
    errors.push('Doanh nghiệp (business_id) là bắt buộc');
  }
  const hasCategory =
    (Array.isArray(category_ids) && category_ids.length > 0) ||
    (category_id && String(category_id).trim() !== '');
  if (!hasCategory) {
    errors.push('Danh mục sản phẩm (category_ids) là bắt buộc');
  }
  if (!sku || sku.trim().length < 2) {
    errors.push('Mã SKU sản phẩm là bắt buộc');
  }
  if (!product_name || product_name.trim().length < 2) {
    errors.push('Tên sản phẩm phải từ 2 ký tự trở lên');
  }
  if (base_price === undefined || base_price === null || Number(base_price) < 0) {
    errors.push('Giá bán niêm yết gốc không hợp lệ (phải >= 0)');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};
