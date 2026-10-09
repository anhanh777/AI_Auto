import { Customer } from '../models/index.js';
import { getPagination } from '../helpers/pagination.helper.js';

export const getCustomersService = async ({ business_id, page = 1, limit = 10, search = '', tag = '' }) => {
  if (!business_id) {
    throw new Error('business_id là bắt buộc');
  }

  const filter = { business_id };

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { full_name: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
      { psid: searchRegex }
    ];
  }

  if (tag && tag.trim() !== '') {
    filter.tags = tag;
  }

  const totalItems = await Customer.countDocuments(filter);
  const pagination = getPagination(page, limit, totalItems);

  const customers = await Customer.find(filter)
    .sort({ updated_at: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  return {
    customers,
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

export const getCustomerByIdService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const customer = await Customer.findOne(filter);
  if (!customer) throw new Error('Không tìm thấy khách hàng');
  return customer;
};

export const createCustomerService = async (data, userId) => {
  if (!data.business_id) throw new Error('business_id là bắt buộc');
  const customer = await Customer.create({
    ...data,
    created_by: userId
  });
  return customer;
};

export const updateCustomerService = async (id, data, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const customer = await Customer.findOneAndUpdate(filter, data, { new: true });
  if (!customer) throw new Error('Không tìm thấy khách hàng để cập nhật');
  return customer;
};

export const deleteCustomerService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const result = await Customer.findOneAndDelete(filter);
  if (!result) throw new Error('Không tìm thấy khách hàng để xóa');
  return { message: 'Đã xóa khách hàng thành công' };
};
