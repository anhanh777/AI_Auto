import mongoose from 'mongoose';
import { Customer, Order, Conversation, Channel } from '../models/index.js';
import { getPagination } from '../helpers/pagination.helper.js';

export const getCustomersService = async ({
  business_id,
  page = 1,
  limit = 10,
  search = '',
  tag = '',
  source = '',
  has_phone = '',
  sortBy = 'updated_at',
  order = 'desc'
}) => {
  if (!business_id) {
    throw new Error('business_id là bắt buộc');
  }

  const filter = { business_id };

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { full_name: searchRegex },
      { phone: searchRegex },
      { phone_number: searchRegex },
      { email: searchRegex },
      { psid: searchRegex },
      { shipping_address: searchRegex },
      { address: searchRegex }
    ];
  }

  if (tag && tag.trim() !== '') {
    filter.$or = [
      { tags: tag.trim() },
      { customer_tags: tag.trim() }
    ];
  }

  if (source && source.trim() !== '') {
    if (source === 'facebook') {
      filter.$or = [
        { source: 'facebook' },
        { psid: { $exists: true, $ne: null, $ne: '' } }
      ];
    } else {
      filter.source = source.trim();
    }
  }

  if (has_phone === 'yes') {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { phone: { $exists: true, $ne: '' } },
        { phone_number: { $exists: true, $ne: '' } }
      ]
    });
  } else if (has_phone === 'no') {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { phone: { $in: ['', null] } },
        { phone_number: { $in: ['', null] } }
      ]
    });
  }

  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  const totalItems = await Customer.countDocuments(filter);
  const pagination = getPagination(page, limit, totalItems);

  const rawCustomers = await Customer.find(filter)
    .sort(sortOptions)
    .skip(pagination.skip)
    .limit(pagination.limit);

  // Gắn thêm conversation_id và chi tiết Kênh (Channel) nếu khách có phiên chat
  const customerIds = rawCustomers.map((c) => c._id);
  const conversations = await Conversation.find({
    customer_id: { $in: customerIds }
  })
    .sort({ last_message_at: -1, updated_at: -1 })
    .populate('channel_id', 'page_name page_id platform avatar_url')
    .lean();

  const convMap = new Map();
  // Ưu tiên hội thoại mới nhất của khách
  conversations.forEach((cv) => {
    const custKey = cv.customer_id.toString();
    if (!convMap.has(custKey)) {
      convMap.set(custKey, cv);
    }
  });

  const customers = rawCustomers.map((c) => {
    const obj = c.toObject();
    const cv = convMap.get(c._id.toString());
    if (cv) {
      obj.conversation_id = cv._id;
      const ch = cv.channel_id;
      if (ch && typeof ch === 'object') {
        obj.channel_id = ch._id;
        obj.channel_name = ch.page_name || ch.name || '';
        obj.channel_platform = ch.platform || 'facebook';
        obj.channel_page_id = ch.page_id || '';
        obj.channel_avatar = ch.avatar_url || '';
      } else {
        obj.channel_id = cv.channel_id;
      }
    }
    return obj;
  });

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

export const getCustomerStatsService = async (business_id) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  let bId;
  try {
    bId = new mongoose.Types.ObjectId(business_id);
  } catch (err) {
    bId = business_id;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalCustomers, vipCustomers, fbCustomers, withPhoneCount, newThisMonth, spendAgg] = await Promise.all([
    Customer.countDocuments({ business_id }),
    Customer.countDocuments({
      business_id,
      $or: [
        { tags: { $in: ['VIP', 'Khách VIP', 'vip', 'VIP Customer'] } },
        { customer_tags: { $in: ['VIP', 'Khách VIP', 'vip', 'VIP Customer'] } }
      ]
    }),
    Customer.countDocuments({
      business_id,
      $or: [
        { source: 'facebook' },
        { psid: { $exists: true, $ne: null, $ne: '' } }
      ]
    }),
    Customer.countDocuments({
      business_id,
      $or: [
        { phone: { $exists: true, $ne: '' } },
        { phone_number: { $exists: true, $ne: '' } }
      ]
    }),
    Customer.countDocuments({
      business_id,
      created_at: { $gte: startOfMonth }
    }),
    Customer.aggregate([
      { $match: { business_id: bId } },
      { $group: { _id: null, totalSpend: { $sum: '$total_spend_amount' }, totalOrders: { $sum: '$total_orders_count' } } }
    ])
  ]);

  const totalSpend = spendAgg.length > 0 ? spendAgg[0].totalSpend : 0;
  const totalOrders = spendAgg.length > 0 ? spendAgg[0].totalOrders : 0;

  return {
    total_customers: totalCustomers,
    vip_customers: vipCustomers,
    facebook_customers: fbCustomers,
    with_phone_count: withPhoneCount,
    new_customers_this_month: newThisMonth,
    total_spend: totalSpend,
    total_orders: totalOrders
  };
};

export const getCustomerOrdersService = async (customerId, business_id) => {
  if (!customerId) throw new Error('customerId là bắt buộc');
  const filter = { customer_id: customerId };
  if (business_id) filter.business_id = business_id;

  const orders = await Order.find(filter)
    .sort({ created_at: -1 })
    .limit(50)
    .lean();

  return orders;
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
  if (customer && (data.full_name || data.avatar || data.profile_pic_url)) {
    await Conversation.updateMany(
      { customer_id: customer._id },
      {
        $set: {
          customer_name: customer.full_name,
          customer_avatar: customer.avatar
        }
      }
    );
  }
  return customer;
};

export const deleteCustomerService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const result = await Customer.findOneAndDelete(filter);
  if (!result) throw new Error('Không tìm thấy khách hàng để xóa');
  return { message: 'Đã xóa khách hàng thành công' };
};
