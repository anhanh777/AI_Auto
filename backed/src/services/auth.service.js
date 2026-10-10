import { User, Role } from '../models/index.js';
import { generateToken } from '../helpers/jwt.helper.js';
import { sanitizeUser } from '../helpers/user.helper.js';
import { SYSTEM_PERMISSIONS } from '../constants/permissions.constant.js';

/**
 * Xử lý đăng nhập tài khoản nội bộ (Hỗ trợ đăng nhập bằng Tên đăng nhập HOẶC Email)
 */
export const loginService = async ({ username, password }) => {
  const cleanInput = (username || '').toLowerCase().trim();
  const user = await User.findOne({
    $or: [
      { username: cleanInput },
      { email: cleanInput }
    ]
  }).populate('role_id');

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

  // Cập nhật thời điểm đăng nhập gần nhất
  user.last_login_at = new Date();
  await user.save();

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
 * Xử lý đăng ký tài khoản mới (Bắt trùng Tên đăng nhập, Email, và Số điện thoại)
 */
export const registerService = async ({ full_name, username, email, phone, password }) => {
  const cleanUsername = username.toLowerCase().trim();
  const cleanEmail = email.toLowerCase().trim();
  const cleanPhone = phone.trim().replace(/\s+/g, '');

  // 1. Kiểm tra trùng lặp Tên đăng nhập
  const existingUsername = await User.findOne({ username: cleanUsername });
  if (existingUsername) {
    throw new Error('Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác');
  }

  // 2. Kiểm tra trùng lặp Email
  const existingEmail = await User.findOne({ email: cleanEmail });
  if (existingEmail) {
    throw new Error('Địa chỉ email này đã được sử dụng. Vui lòng chọn email khác');
  }

  // 3. Kiểm tra trùng lặp Số điện thoại (bắt cả 2 trường phone và phone_number)
  if (cleanPhone) {
    const existingPhone = await User.findOne({
      $or: [
        { phone: cleanPhone },
        { phone_number: cleanPhone }
      ]
    });
    if (existingPhone) {
      throw new Error('Số điện thoại này đã được đăng ký cho một tài khoản khác');
    }
  }

  // 4. Lấy hoặc tạo vai trò Quản trị viên (ADMIN) mặc định cho người đăng ký
  let adminRole = await Role.findOne({ name: 'ADMIN' });
  if (!adminRole) {
    adminRole = await Role.create({
      name: 'ADMIN',
      role_name: 'ADMIN',
      description: 'Quản trị viên toàn quyền hệ thống',
      permissions: ['ALL']
    });
  }

  // 5. Khởi tạo tài khoản Người dùng mới
  const newUser = await User.create({
    full_name: full_name.trim(),
    username: cleanUsername,
    email: cleanEmail,
    phone: cleanPhone,
    phone_number: cleanPhone,
    password,
    role_id: adminRole._id,
    custom_permissions: ['ALL'],
    is_active: true,
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
  });

  const populatedUser = await User.findById(newUser._id).populate('role_id');

  // 6. Cấp phát Token tự động
  const token = generateToken({
    id: populatedUser._id,
    username: populatedUser.username,
    role: populatedUser.role_id?.name || 'ADMIN',
    permissions: populatedUser.role_id?.permissions || ['ALL']
  });

  return {
    token,
    user: sanitizeUser(populatedUser)
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
