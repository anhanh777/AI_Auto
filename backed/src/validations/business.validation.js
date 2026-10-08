export const validateBusinessInput = ({ business_name, code }) => {
  const errors = [];
  if (!business_name || business_name.trim().length < 2) {
    errors.push('Tên doanh nghiệp / cửa hàng phải từ 2 ký tự trở lên');
  }
  if (!code || code.trim().length < 2) {
    errors.push('Mã doanh nghiệp phải từ 2 ký tự trở lên');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};
