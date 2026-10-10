import { User, Role, Business, BusinessJoinRequest, Notification } from '../models/index.js';
import { sanitizeUser } from '../helpers/user.helper.js';
import { getPagination } from '../helpers/pagination.helper.js';

/**
 * Lấy danh sách nhân viên có phân trang, tìm kiếm theo tên/email/username, lọc vai trò
 */
export const getUsersService = async ({ page = 1, limit = 10, search = '', role_id = '', is_active, business_id }) => {
  const filter = {};

  if (business_id && business_id.trim() !== '') {
    filter.business_ids = business_id;
  }

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
  role_id,
  business_id
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

  // 3. Kiểm tra trùng lặp Số điện thoại (bắt cả phone và phone_number)
  const cleanPhone = phone ? phone.trim().replace(/\s+/g, '') : '';
  if (cleanPhone) {
    const existingPhone = await User.findOne({
      $or: [
        { phone: cleanPhone },
        { phone_number: cleanPhone }
      ]
    });
    if (existingPhone) {
      throw new Error('Số điện thoại này đã được sử dụng bởi một tài khoản khác');
    }
  }

  // 4. Kiểm tra vai trò có tồn tại không
  const role = await Role.findById(role_id);
  if (!role) {
    throw new Error('Vai trò được chỉ định không hợp lệ');
  }

  // 5. Tạo tài khoản mới
  const newUser = await User.create({
    username: username.toLowerCase().trim(),
    password,
    full_name: full_name.trim(),
    email: email.toLowerCase().trim(),
    phone: cleanPhone,
    phone_number: cleanPhone,
    avatar,
    custom_permissions: Array.isArray(custom_permissions) ? custom_permissions : [],
    role_id,
    business_ids: business_id ? [business_id] : [],
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

  // Kiểm tra trùng số điện thoại nếu phone thay đổi
  if (phone !== undefined) {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (cleanPhone && cleanPhone !== user.phone && cleanPhone !== user.phone_number) {
      const existingPhone = await User.findOne({
        _id: { $ne: userId },
        $or: [
          { phone: cleanPhone },
          { phone_number: cleanPhone }
        ]
      });
      if (existingPhone) {
        throw new Error('Số điện thoại này đã được sử dụng bởi một tài khoản khác');
      }
    }
    user.phone = cleanPhone;
    user.phone_number = cleanPhone;
  }
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
 * Xóa thành viên khỏi cửa hàng / Doanh nghiệp (Không xóa vĩnh viễn tài khoản người dùng)
 */
export const deleteUserService = async (userId, currentAdminId, businessId) => {
  if (userId.toString() === currentAdminId.toString()) {
    throw new Error('Bạn không thể tự xóa tài khoản của chính mình khỏi cửa hàng');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Không tìm thấy tài khoản nhân viên');
  }

  if (user.username === 'admin') {
    throw new Error('Không thể xóa tài khoản Quản trị viên mặc định của hệ thống');
  }

  if (!businessId) {
    throw new Error('Vui lòng chỉ định cửa hàng cần xóa thành viên');
  }

  const business = await Business.findById(businessId);
  if (!business) {
    throw new Error('Không tìm thấy dữ liệu cửa hàng');
  }

  // Không cho phép xóa chủ sở hữu doanh nghiệp
  if (business.owner_user_id && business.owner_user_id.toString() === userId.toString()) {
    throw new Error('Không thể xóa Chủ sở hữu (Owner) khỏi cửa hàng');
  }

  // 1. Gỡ businessId khỏi mảng business_ids của User
  if (Array.isArray(user.business_ids)) {
    user.business_ids = user.business_ids.filter(
      (id) => id.toString() !== businessId.toString()
    );
    await user.save();
  }

  // 2. Dọn dẹp các yêu cầu tham gia liên quan của user tại business này
  await BusinessJoinRequest.deleteMany({
    business_id: business._id,
    user_id: user._id
  });

  // 3. Gửi thông báo đến tài khoản người dùng bị xóa khỏi cửa hàng
  await Notification.create({
    user_id: user._id,
    business_id: business._id,
    title: 'Thông báo về tư cách thành viên',
    message: `Bạn đã được gỡ khỏi danh sách thành viên của cửa hàng "${business.business_name}".`,
    type: 'warning',
    link: '/dashboard',
    metadata: {
      business_id: business._id,
      business_name: business.business_name
    }
  });

  return {
    success: true,
    message: `Đã xóa thành viên "${user.full_name || user.username}" khỏi cửa hàng "${business.business_name}" thành công!`
  };
};
