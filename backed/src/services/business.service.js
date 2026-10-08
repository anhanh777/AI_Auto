import { Business } from '../models/index.js';

/**
 * Lấy danh sách doanh nghiệp
 */
export const getBusinessesService = async ({ search = '', is_active }) => {
  const filter = {};
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { business_name: searchRegex },
      { code: searchRegex },
      { industry: searchRegex },
      { email: searchRegex }
    ];
  }
  if (is_active !== undefined && is_active !== '') {
    filter.is_active = is_active === 'true' || is_active === true;
  }

  const businesses = await Business.find(filter).sort({ created_at: -1 });
  return businesses;
};

/**
 * Chi tiết doanh nghiệp theo ID
 */
export const getBusinessByIdService = async (businessId) => {
  const business = await Business.findById(businessId);
  if (!business) {
    throw new Error('Không tìm thấy doanh nghiệp');
  }
  return business;
};

/**
 * Tạo mới doanh nghiệp
 */
export const createBusinessService = async (data, userId) => {
  const existingCode = await Business.findOne({ code: data.code.trim().toUpperCase() });
  if (existingCode) {
    throw new Error(`Mã doanh nghiệp "${data.code}" đã tồn tại trong hệ thống`);
  }

  const newBusiness = await Business.create({
    business_name: data.business_name.trim(),
    code: data.code.trim().toUpperCase(),
    industry: data.industry || 'Thời trang & May mặc',
    logo_url: data.logo_url || '',
    phone: data.phone || '',
    email: data.email || '',
    gemini_api_key: data.gemini_api_key || '',
    is_active: data.is_active !== undefined ? data.is_active : true,
    owner_user_id: userId || null,
    created_by: userId || null
  });

  return newBusiness;
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
