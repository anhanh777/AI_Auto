import { User, Role } from '../models/index.js';
import { generateToken } from '../helpers/jwt.helper.js';
import { sanitizeUser } from '../helpers/user.helper.js';
import { SYSTEM_PERMISSIONS } from '../constants/permissions.constant.js';

/**
 * Xử lý đăng nhập tài khoản nội bộ
 */
export const loginService = async ({ username, password }) => {
  const user = await User.findOne({ username: username.toLowerCase() }).populate('role_id');
  if (!user) {
    throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác');
  }

  if (!user.is_active) {
    throw new Error('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên');
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác');
  }

  // Tạo JWT token (nhúng ID, username, Role name và danh sách permissions)
  const token = generateToken({
    id: user._id,
    username: user.username,
    role: user.role_id?.name || 'STAFF',
    permissions: user.role_id?.permissions || []
  });

  return {
    token,
    user: sanitizeUser(user)
  };
};

/**
 * Lấy thông tin tài khoản hiện tại từ database
 */
export const getMeService = async (userId) => {
  const user = await User.findById(userId).populate('role_id');
  if (!user) {
    throw new Error('Tài khoản không tồn tại');
  }
  return sanitizeUser(user);
};

/**
 * Đổi mật khẩu tài khoản cá nhân
 */
export const changePasswordService = async (userId, { oldPassword, newPassword }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Tài khoản không tồn tại');
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new Error('Mật khẩu hiện tại không chính xác');
  }

  user.password = newPassword;
  await user.save();

  return { success: true, message: 'Đổi mật khẩu thành công' };
};

/**
 * Lấy danh sách tất cả các Role trong CSDL
 */
export const getRolesService = async () => {
  const roles = await Role.find().sort({ created_at: 1 });
  return roles;
};

/**
 * Admin cập nhật danh sách quyền (permissions) cho một Role
 */
export const updateRolePermissionsService = async (roleId, permissions = []) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new Error('Không tìm thấy vai trò cần cập nhật');
  }

  if (role.name === 'ADMIN') {
    throw new Error('Không thể thay đổi quyền của vai trò Quản trị viên tối cao (ADMIN)');
  }

  role.permissions = permissions;
  await role.save();

  return role;
};

/**
 * Lấy toàn bộ danh mục mã quyền hệ thống để Frontend vẽ bảng Checkbox
 */
export const getAllPermissionsListService = () => {
  return SYSTEM_PERMISSIONS;
};
