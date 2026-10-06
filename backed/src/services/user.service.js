import { User, Role } from '../models/index.js';
import { sanitizeUser } from '../helpers/user.helper.js';
import { getPagination } from '../helpers/pagination.helper.js';

/**
 * Lấy danh sách nhân viên có phân trang, tìm kiếm theo tên/email/username, lọc vai trò
 */
export const getUsersService = async ({ page = 1, limit = 10, search = '', role_id = '', is_active }) => {
  const filter = {};

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { full_name: searchRegex },
      { username: searchRegex },
      { email: searchRegex },
      { phone: searchRegex }
    ];
  }

  if (role_id && role_id.trim() !== '') {
    filter.role_id = role_id;
  }

  if (is_active !== undefined && is_active !== '') {
    filter.is_active = is_active === 'true' || is_active === true;
  }

  const totalItems = await User.countDocuments(filter);
  const pagination = getPagination(page, limit, totalItems);

  const users = await User.find(filter)
    .populate('role_id')
    .sort({ created_at: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  return {
    users: users.map(u => sanitizeUser(u)),
    pagination: {
      currentPage: pagination.page,
      limit: pagination.limit,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev
    }
  };
};

/**
 * Xem chi tiết 1 nhân viên theo ID
 */
export const getUserByIdService = async (userId) => {
  const user = await User.findById(userId).populate('role_id');
  if (!user) {
    throw new Error('Không tìm thấy tài khoản nhân viên');
  }
  return sanitizeUser(user);
};

/**
 * Tạo mới tài khoản nhân viên (Kiểm tra trùng username & email)
 */
export const createUserService = async ({
  username,
  password,
  full_name,
  email,
  phone = '',
  avatar = '',
  custom_permissions = [],
  role_id
}) => {
  // 1. Kiểm tra trùng lặp username
  const existingUsername = await User.findOne({ username: username.toLowerCase().trim() });
  if (existingUsername) {
    throw new Error('Tên đăng nhập này đã được sử dụng');
  }

  // 2. Kiểm tra trùng lặp email
  const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingEmail) {
    throw new Error('Địa chỉ email này đã được sử dụng');
  }

  // 3. Kiểm tra vai trò có tồn tại không
  const role = await Role.findById(role_id);
  if (!role) {
    throw new Error('Vai trò được chỉ định không hợp lệ');
  }

  // 4. Tạo tài khoản mới
  const newUser = await User.create({
    username: username.toLowerCase().trim(),
    password,
    full_name: full_name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    avatar,
    custom_permissions: Array.isArray(custom_permissions) ? custom_permissions : [],
    role_id,
    is_active: true
  });

  const populatedUser = await User.findById(newUser._id).populate('role_id');
  return sanitizeUser(populatedUser);
};

/**
 * Cập nhật thông tin nhân viên
 */
export const updateUserService = async (userId, {
  full_name,
  email,
  phone,
  avatar,
  custom_permissions,
  role_id,
  is_active
}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Không tìm thấy tài khoản nhân viên');
  }

  // Kiểm tra trùng email nếu email thay đổi
  if (email && email.toLowerCase().trim() !== user.email) {
    const existingEmail = await User.findOne({
      email: email.toLowerCase().trim(),
      _id: { $ne: userId }
    });
    if (existingEmail) {
      throw new Error('Địa chỉ email này đã được sử dụng bởi một tài khoản khác');
    }
    user.email = email.toLowerCase().trim();
  }

  if (full_name !== undefined) user.full_name = full_name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (avatar !== undefined) user.avatar = avatar;
  if (custom_permissions !== undefined && Array.isArray(custom_permissions)) {
    user.custom_permissions = custom_permissions;
  }
  if (role_id) {
    const role = await Role.findById(role_id);
    if (!role) throw new Error('Vai trò không hợp lệ');
    user.role_id = role_id;
  }
  if (is_active !== undefined) {
    user.is_active = is_active;
  }

  await user.save();

  const updatedUser = await User.findById(userId).populate('role_id');
  return sanitizeUser(updatedUser);
};

/**
 * Reset mật khẩu của nhân viên về mặc định (Mặc định: 123456)
 */
export const resetPasswordService = async (userId, defaultPassword = '123456') => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Không tìm thấy tài khoản nhân viên');
  }

  user.password = defaultPassword;
  await user.save();

  return { success: true, message: `Đã đặt lại mật khẩu của ${user.full_name} về: ${defaultPassword}` };
};

/**
 * Xóa tài khoản nhân viên
 */
export const deleteUserService = async (userId, currentAdminId) => {
  if (userId.toString() === currentAdminId.toString()) {
    throw new Error('Bạn không thể tự xóa tài khoản của chính mình');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Không tìm thấy tài khoản nhân viên');
  }

  if (user.username === 'admin') {
    throw new Error('Không thể xóa tài khoản Quản trị viên mặc định của hệ thống');
  }

  await User.findByIdAndDelete(userId);
  return { success: true, message: 'Đã xóa tài khoản nhân viên thành công' };
};
