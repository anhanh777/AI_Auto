import { Business, User, Channel, BusinessJoinRequest, Notification } from '../models/index.js';

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
      : `Đã chuyển "${business.business_name}" vào danh sách lưu trữ`
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
    hotline: data.hotline || data.phone || '',
    phone: data.phone || data.hotline || '',
    email: data.email || '',
    address: data.address || '',
    gemini_api_key: data.gemini_api_key || '',
    subscription_tier: data.subscription_tier || 'FREE',
    status: data.status || (data.is_active === false ? 'ARCHIVED' : 'ACTIVE'),
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
 * Gửi Yêu cầu Tham gia Doanh nghiệp theo Mã Code (Trạng thái: PENDING & Bắn thông báo Admin)
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

  // Kiểm tra xem đã có yêu cầu nào đang chờ xét duyệt chưa
  const existingPendingRequest = await BusinessJoinRequest.findOne({
    business_id: business._id,
    user_id: userId,
    status: 'PENDING'
  });

  if (existingPendingRequest) {
    throw new Error(`Bạn đã gửi yêu cầu tham gia "${business.business_name}" trước đó. Vui lòng chờ Quản trị viên xét duyệt!`);
  }

  // Khởi tạo phiếu yêu cầu tham gia mới với trạng thái PENDING
  const joinRequest = await BusinessJoinRequest.create({
    business_id: business._id,
    user_id: userId,
    status: 'PENDING'
  });

  // Bắn thông báo tới Chủ doanh nghiệp (Owner) hoặc Admin
  const targetRecipientId = business.owner_user_id || business.created_by;
  if (targetRecipientId) {
    await Notification.create({
      user_id: targetRecipientId,
      business_id: business._id,
      title: 'Yêu cầu tham gia cửa hàng mới',
      message: `Thành viên ${user.full_name || user.username} (${user.email || ''} - ${user.phone || ''}) vừa gửi yêu cầu tham gia cửa hàng "${business.business_name}".`,
      type: 'join_request',
      link: '/settings/users',
      metadata: {
        request_id: joinRequest._id,
        requester_id: user._id,
        requester_name: user.full_name || user.username,
        business_id: business._id
      }
    });
  }

  return {
    pending: true,
    business_name: business.business_name,
    message: `Yêu cầu tham gia cửa hàng "${business.business_name}" đã được gửi thành công! Vui lòng chờ Quản trị viên xét duyệt.`
  };
};

/**
 * Lấy danh sách các yêu cầu tham gia cửa hàng (Dành cho Quản trị viên/Chủ cửa hàng)
 */
export const getBusinessJoinRequestsService = async (businessId, status = 'PENDING') => {
  const filter = { business_id: businessId };
  if (status && status !== 'ALL') {
    filter.status = status;
  }

  const requests = await BusinessJoinRequest.find(filter)
    .populate('user_id', 'full_name username email phone avatar created_at')
    .sort({ created_at: -1 });

  return requests;
};

/**
 * Phê duyệt yêu cầu tham gia Doanh nghiệp
 */
export const approveJoinRequestService = async (requestId, reviewerId) => {
  const request = await BusinessJoinRequest.findById(requestId);
  if (!request) {
    throw new Error('Không tìm thấy yêu cầu tham gia');
  }

  if (request.status !== 'PENDING') {
    throw new Error(`Yêu cầu này đã được xử lý trước đó (${request.status})`);
  }

  const [business, user] = await Promise.all([
    Business.findById(request.business_id),
    User.findById(request.user_id)
  ]);

  if (!business || !user) {
    throw new Error('Dữ liệu cửa hàng hoặc người dùng không còn tồn tại');
  }

  // Thêm business_id vào danh sách của user
  if (!Array.isArray(user.business_ids)) user.business_ids = [];
  if (!user.business_ids.some((id) => id.toString() === business._id.toString())) {
    user.business_ids.push(business._id);
    await user.save();
  }

  // Cập nhật trạng thái phiếu yêu cầu
  request.status = 'APPROVED';
  request.reviewed_by = reviewerId;
  request.reviewed_at = new Date();
  await request.save();

  // Bắn thông báo xác nhận thành công tới Người dùng được duyệt
  await Notification.create({
    user_id: user._id,
    business_id: business._id,
    title: 'Yêu cầu tham gia đã được chấp thuận! 🎉',
    message: `Chúc mừng! Quản trị viên đã phê duyệt yêu cầu gia nhập vào cửa hàng "${business.business_name}".`,
    type: 'success',
    link: '/dashboard',
    metadata: {
      business_id: business._id,
      business_name: business.business_name
    }
  });

  return {
    success: true,
    message: `Đã phê duyệt tài khoản ${user.full_name || user.username} tham gia cửa hàng "${business.business_name}" thành công!`
  };
};

/**
 * Từ chối yêu cầu tham gia Doanh nghiệp
 */
export const rejectJoinRequestService = async (requestId, reviewerId, note = '') => {
  const request = await BusinessJoinRequest.findById(requestId);
  if (!request) {
    throw new Error('Không tìm thấy yêu cầu tham gia');
  }

  if (request.status !== 'PENDING') {
    throw new Error(`Yêu cầu này đã được xử lý trước đó (${request.status})`);
  }

  const [business, user] = await Promise.all([
    Business.findById(request.business_id),
    User.findById(request.user_id)
  ]);

  request.status = 'REJECTED';
  request.note = note || 'Từ chối bởi Quản trị viên';
  request.reviewed_by = reviewerId;
  request.reviewed_at = new Date();
  await request.save();

  if (user && business) {
    await Notification.create({
      user_id: user._id,
      business_id: business._id,
      title: 'Yêu cầu tham gia chưa được phê duyệt',
      message: `Yêu cầu tham gia vào cửa hàng "${business.business_name}" của bạn đã bị Quản trị viên từ chối.${note ? ` Lý do: ${note}` : ''}`,
      type: 'warning',
      link: '/dashboard'
    });
  }

  return {
    success: true,
    message: `Đã từ chối yêu cầu tham gia của ${user?.full_name || 'người dùng'}`
  };
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
  if (data.hotline !== undefined) {
    business.hotline = data.hotline;
    business.phone = data.hotline;
  }
  if (data.phone !== undefined) {
    business.phone = data.phone;
    business.hotline = data.phone;
  }
  if (data.email !== undefined) business.email = data.email;
  if (data.address !== undefined) business.address = data.address;
  if (data.gemini_api_key !== undefined) business.gemini_api_key = data.gemini_api_key;
  if (data.subscription_tier !== undefined) business.subscription_tier = data.subscription_tier;
  if (data.status !== undefined) {
    business.status = data.status;
    business.is_active = data.status === 'ACTIVE';
  }
  if (data.is_active !== undefined) {
    business.is_active = data.is_active;
    business.status = data.is_active ? 'ACTIVE' : 'ARCHIVED';
  }
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
