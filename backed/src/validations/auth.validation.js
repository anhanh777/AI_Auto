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
