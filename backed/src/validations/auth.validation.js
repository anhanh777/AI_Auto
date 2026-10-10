export const validateLoginInput = ({ username, password }) => {
  const errors = [];
  if (!username || typeof username !== 'string' || username.trim() === '') {
    errors.push('Tên đăng nhập không được để trống');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Mật khẩu phải từ 6 ký tự trở lên');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateChangePasswordInput = ({ oldPassword, newPassword }) => {
  const errors = [];
  if (!oldPassword || typeof oldPassword !== 'string') {
    errors.push('Mật khẩu hiện tại không được để trống');
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    errors.push('Mật khẩu mới phải từ 6 ký tự trở lên');
  }
  if (oldPassword && newPassword && oldPassword === newPassword) {
    errors.push('Mật khẩu mới không được trùng với mật khẩu cũ');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Kiểm tra định dạng số điện thoại Việt Nam (10 chữ số, đầu 03, 05, 07, 08, 09)
 */
export const isValidVietnamesePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.trim().replace(/\s+/g, '');
  return /^(0[3|5|7|8|9])[0-9]{8}$/.test(clean);
};

export const validateRegisterInput = ({ full_name, username, email, phone, password }) => {
  const errors = [];

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    errors.push('Họ và tên là bắt buộc (tối thiểu 2 ký tự)');
  }

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    errors.push('Tên đăng nhập là bắt buộc (tối thiểu 3 ký tự)');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    errors.push('Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới');
  }

  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.push('Địa chỉ email không hợp lệ');
  }

  if (!phone || typeof phone !== 'string' || !isValidVietnamesePhone(phone)) {
    errors.push('Số điện thoại không hợp lệ (yêu cầu 10 chữ số, ví dụ: 0901234567)');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Mật khẩu phải từ 6 ký tự trở lên');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
