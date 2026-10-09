import { Order } from '../models/index.js';
import { getPagination } from '../helpers/pagination.helper.js';

export const getOrdersService = async ({ business_id, page = 1, limit = 10, search = '', status = '' }) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  const filter = { business_id };

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { order_code: searchRegex },
      { customer_name: searchRegex },
      { customer_phone: searchRegex },
      { shipping_address: searchRegex }
    ];
  }

  if (status && status.trim() !== '') {
    filter.status = status;
  }

  const totalItems = await Order.countDocuments(filter);
  const pagination = getPagination(page, limit, totalItems);

  const orders = await Order.find(filter)
    .populate('customer_id')
    .sort({ created_at: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  // Tính tổng doanh thu và đơn hàng theo trạng thái
  const summaryAgg = await Order.aggregate([
    { $match: { business_id: filter.business_id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total_revenue: { $sum: '$total_amount' }
      }
    }
  ]);

  return {
    orders,
    summary: summaryAgg,
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

export const getOrderByIdService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const order = await Order.findOne(filter).populate('customer_id');
  if (!order) throw new Error('Không tìm thấy đơn hàng');
  return order;
};

export const createOrderService = async (data, userId) => {
  if (!data.business_id) throw new Error('business_id là bắt buộc');
  const count = await Order.countDocuments({ business_id: data.business_id });
  const orderCode = data.order_code || `DH_${String(count + 1001).padStart(5, '0')}`;

  const order = await Order.create({
    ...data,
    order_code: orderCode,
    created_by_user_id: userId
  });
  return order;
};

export const updateOrderStatusService = async (id, status, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const order = await Order.findOneAndUpdate(filter, { status }, { new: true });
  if (!order) throw new Error('Không tìm thấy đơn hàng để cập nhật trạng thái');
  return order;
};

export const deleteOrderService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const result = await Order.findOneAndDelete(filter);
  if (!result) throw new Error('Không tìm thấy đơn hàng để xóa');
  return { message: 'Đã xóa đơn hàng thành công' };
};
