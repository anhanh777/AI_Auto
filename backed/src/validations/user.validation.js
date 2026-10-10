import { isValidVietnamesePhone } from './auth.validation.js';

export const validateCreateUserInput = ({ username, password, full_name, email, role_id, phone }) => {
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
  if (phone && phone.trim() !== '' && !isValidVietnamesePhone(phone)) {
    errors.push('Số điện thoại không hợp lệ (yêu cầu 10 chữ số, ví dụ: 0901234567)');
  }
  if (!role_id) {
    errors.push('Vai trò người dùng là bắt buộc');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUpdateUserInput = ({ full_name, email, phone }) => {
  const errors = [];
  if (full_name !== undefined && full_name.trim() === '') {
    errors.push('Họ và tên không được để trống');
  }
  if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Địa chỉ email không hợp lệ');
  }
  if (phone !== undefined && phone.trim() !== '' && !isValidVietnamesePhone(phone)) {
    errors.push('Số điện thoại không hợp lệ (yêu cầu 10 chữ số, ví dụ: 0901234567)');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};
