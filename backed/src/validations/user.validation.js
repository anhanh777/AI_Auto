export const validateCreateUserInput = ({ username, password, full_name, email, role_id }) => {
  const errors = [];
  if (!username || username.trim().length < 3) {
    errors.push('Tên đăng nhập phải từ 3 ký tự trở lên');
  }
  if (!password || password.length < 6) {
    errors.push('Mật khẩu phải từ 6 ký tự trở lên');
  }
  if (!full_name || full_name.trim() === '') {
    errors.push('Họ và tên không được để trống');
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Địa chỉ email không hợp lệ');
  }
  if (!role_id) {
    errors.push('Vai trò người dùng là bắt buộc');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};
