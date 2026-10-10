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

  const cleanPhone = (data.phone || data.phone_number || '').trim().replace(/\s+/g, '');
  if (cleanPhone) {
    const existingCustomer = await Customer.findOne({
      business_id: data.business_id,
      $or: [
        { phone: cleanPhone },
        { phone_number: cleanPhone }
      ]
    });
    if (existingCustomer) {
      throw new Error(`Khách hàng với số điện thoại "${cleanPhone}" đã tồn tại trong cửa hàng`);
    }
  }

  const customer = await Customer.create({
    ...data,
    phone: cleanPhone,
    phone_number: cleanPhone,
    created_by: userId
  });
  return customer;
};

export const updateCustomerService = async (id, data, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;

  const currentCustomer = await Customer.findOne(filter);
  if (!currentCustomer) throw new Error('Không tìm thấy khách hàng để cập nhật');

  const cleanPhone = (data.phone !== undefined ? data.phone : data.phone_number);
  if (cleanPhone !== undefined) {
    const formattedPhone = cleanPhone.trim().replace(/\s+/g, '');
    if (formattedPhone && formattedPhone !== currentCustomer.phone && formattedPhone !== currentCustomer.phone_number) {
      const existingCustomer = await Customer.findOne({
        _id: { $ne: id },
        business_id: currentCustomer.business_id,
        $or: [
          { phone: formattedPhone },
          { phone_number: formattedPhone }
        ]
      });
      if (existingCustomer) {
        throw new Error(`Khách hàng với số điện thoại "${formattedPhone}" đã tồn tại trong cửa hàng`);
      }
    }
    data.phone = formattedPhone;
    data.phone_number = formattedPhone;
  }

  const customer = await Customer.findOneAndUpdate(filter, data, { new: true });
  return customer;
};

export const deleteCustomerService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const result = await Customer.findOneAndDelete(filter);
  if (!result) throw new Error('Không tìm thấy khách hàng để xóa');
  return { message: 'Đã xóa khách hàng thành công' };
};
