import { Business, User, Channel } from '../models/index.js';

/**
 * Lấy danh sách doanh nghiệp (kèm channels_count thực tế)
 */
export const getBusinessesService = async ({ search = '', is_active, userId, role }) => {
  const filter = {};

  // Nếu không phải ADMIN tổng, chỉ lấy các business mà user sở hữu hoặc trực thuộc
  if (userId && role !== 'ADMIN') {
    const user = await User.findById(userId);
    const userBizIds = user?.business_ids || [];
    filter.$or = [
      { owner_user_id: userId },
      { _id: { $in: userBizIds } }
    ];
  }

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    const searchConditions = [
      { business_name: searchRegex },
      { code: searchRegex },
      { industry: searchRegex },
      { email: searchRegex }
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  if (is_active !== undefined && is_active !== '') {
    filter.is_active = is_active === 'true' || is_active === true;
  }

  const businesses = await Business.find(filter)
    .populate('owner_user_id', 'full_name email avatar')
    .sort({ created_at: -1 })
    .lean();

  // Đếm chính xác số lượng kênh Fanpage thực tế cho từng Business
  const businessesWithCounts = await Promise.all(
    businesses.map(async (biz) => {
      const count = await Channel.countDocuments({ business_id: biz._id });
      return {
        ...biz,
        channels_count: count
      };
    })
  );

  return businessesWithCounts;
};

/**
 * Chi tiết doanh nghiệp theo ID
 */
export const getBusinessByIdService = async (businessId) => {
  const business = await Business.findById(businessId).populate('owner_user_id', 'full_name email avatar').lean();
  if (!business) {
    throw new Error('Không tìm thấy doanh nghiệp');
  }
  const count = await Channel.countDocuments({ business_id: businessId });
  return {
    ...business,
    channels_count: count
  };
};

/**
 * Chuyển trạng thái Lưu trữ / Khôi phục Business (Đóng băng hoạt động)
 */
export const toggleArchiveBusinessService = async (businessId, userId) => {
  const business = await Business.findById(businessId);
  if (!business) {
    throw new Error('Không tìm thấy doanh nghiệp');
  }

  const newActiveState = !business.is_active;
  business.is_active = newActiveState;
  business.status = newActiveState ? 'ACTIVE' : 'ARCHIVED';
  if (userId) business.updated_by = userId;

  await business.save();

  return {
    business,
    message: newActiveState
      ? `Đã khôi phục hoạt động cho "${business.business_name}"`
      : `Đã chuyển "${business.business_name}" vào danh sách lưu trữ (Đóng băng hoạt động)`
  };
};

/**
 * Tạo mới doanh nghiệp và tự động gán vào mảng business_ids của User tạo
 */
export const createBusinessService = async (data, userId) => {
  const cleanCode = data.code.trim().toUpperCase();
  const existingCode = await Business.findOne({ code: cleanCode });
  if (existingCode) {
    throw new Error(`Mã doanh nghiệp "${cleanCode}" đã tồn tại trong hệ thống`);
  }

  const newBusiness = await Business.create({
    business_name: data.business_name.trim(),
    code: cleanCode,
    industry: data.industry || 'Bán lẻ - Thời trang & Phụ kiện',
    logo_url: data.logo_url || '',
    phone: data.phone || '',
    email: data.email || '',
    gemini_api_key: data.gemini_api_key || '',
    is_active: data.is_active !== undefined ? data.is_active : true,
    owner_user_id: userId || null,
    created_by: userId || null
  });

  // Tự động thêm business_id vào tài khoản người tạo
  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      if (!Array.isArray(user.business_ids)) user.business_ids = [];
      if (!user.business_ids.some((id) => id.toString() === newBusiness._id.toString())) {
        user.business_ids.push(newBusiness._id);
        await user.save();
      }
    }
  }

  return newBusiness;
};

/**
 * Tham gia Doanh nghiệp theo Mã Code
 */
export const joinBusinessByCodeService = async (code, userId) => {
  if (!code || code.trim() === '') {
    throw new Error('Vui lòng nhập Mã doanh nghiệp');
  }

  const cleanCode = code.trim().toUpperCase();
  const business = await Business.findOne({ code: cleanCode, is_active: true });
  if (!business) {
    throw new Error(`Không tìm thấy Doanh nghiệp với mã "${cleanCode}" hoặc doanh nghiệp đã tạm ngưng/lưu trữ`);
  }

  if (!userId) {
    throw new Error('Yêu cầu xác thực tài khoản để tham gia doanh nghiệp');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Tài khoản người dùng không tồn tại');
  }

  if (!Array.isArray(user.business_ids)) {
    user.business_ids = [];
  }

  const isAlreadyMember =
    user.business_ids.some((id) => id.toString() === business._id.toString()) ||
    business.owner_user_id?.toString() === userId.toString();

  if (isAlreadyMember) {
    throw new Error(`Bạn đã là thành viên của doanh nghiệp "${business.business_name}"`);
  }

  user.business_ids.push(business._id);
  await user.save();

  return business;
};

/**
 * Cập nhật doanh nghiệp
 */
export const updateBusinessService = async (businessId, data, userId) => {
  const business = await Business.findById(businessId);
  if (!business) {
    throw new Error('Không tìm thấy doanh nghiệp để cập nhật');
  }

  if (data.code && data.code.trim().toUpperCase() !== business.code) {
    const existingCode = await Business.findOne({
      code: data.code.trim().toUpperCase(),
      _id: { $ne: businessId }
    });
    if (existingCode) {
      throw new Error(`Mã doanh nghiệp "${data.code}" đã được sử dụng`);
    }
    business.code = data.code.trim().toUpperCase();
  }

  if (data.business_name) business.business_name = data.business_name.trim();
  if (data.industry) business.industry = data.industry.trim();
  if (data.logo_url !== undefined) business.logo_url = data.logo_url;
  if (data.phone !== undefined) business.phone = data.phone;
  if (data.email !== undefined) business.email = data.email;
  if (data.gemini_api_key !== undefined) business.gemini_api_key = data.gemini_api_key;
  if (data.is_active !== undefined) business.is_active = data.is_active;
  if (userId) business.updated_by = userId;

  await business.save();
  return business;
};

/**
 * Xóa doanh nghiệp
 */
export const deleteBusinessService = async (businessId) => {
  const business = await Business.findById(businessId);
  if (!business) {
    throw new Error('Không tìm thấy doanh nghiệp để xóa');
  }
  await Business.findByIdAndDelete(businessId);
  return { success: true, message: 'Đã xóa doanh nghiệp thành công' };
};
