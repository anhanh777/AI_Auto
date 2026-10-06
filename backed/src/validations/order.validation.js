export const validateOrderInput = ({ customer_name, customer_phone, shipping_address, items }) => {
  const errors = [];
  if (!customer_name || customer_name.trim() === '') {
    errors.push('Tên khách hàng nhận đơn không được để trống');
  }
  if (!customer_phone || customer_phone.trim() === '') {
    errors.push('Số điện thoại khách hàng không được để trống');
  }
  if (!shipping_address || shipping_address.trim() === '') {
    errors.push('Địa chỉ giao hàng không được để trống');
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Đơn hàng phải có ít nhất 1 sản phẩm');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};
