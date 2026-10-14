import mongoose from 'mongoose';
import { Order, OrderDetail, Product, Customer, Inventory } from '../models/index.js';
import { getPagination } from '../helpers/pagination.helper.js';
import { getIO } from '../config/socket.config.js';
import { autoTagConversationService } from './conversation.service.js';

/**
 * 1. Lấy danh sách Đơn hàng (Hỗ trợ lọc theo trạng thái, kênh bán, tìm kiếm, ngày tháng)
 */
export const getOrdersService = async ({
  business_id,
  page = 1,
  limit = 10,
  search = '',
  status = '',
  channel_id = '',
  customer_id = '',
  startDate = '',
  endDate = '',
  sortBy = 'created_at',
  order = 'desc'
}) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  let bId;
  try {
    bId = new mongoose.Types.ObjectId(business_id);
  } catch (err) {
    bId = business_id;
  }

  const filter = { business_id: bId };

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { order_code: searchRegex },
      { customer_name: searchRegex },
      { shipping_customer_name: searchRegex },
      { customer_phone: searchRegex },
      { shipping_phone: searchRegex },
      { shipping_address: searchRegex }
    ];
  }

  if (status && status.trim() !== '') {
    filter.$or = [
      { order_status: status.trim() },
      { status: status.trim() }
    ];
  }

  if (channel_id && channel_id.trim() !== '') {
    try {
      filter.channel_id = new mongoose.Types.ObjectId(channel_id.trim());
    } catch {
      filter.channel_id = channel_id.trim();
    }
  }

  if (customer_id && customer_id.trim() !== '') {
    try {
      filter.customer_id = new mongoose.Types.ObjectId(customer_id.trim());
    } catch {
      filter.customer_id = customer_id.trim();
    }
  }

  if (startDate || endDate) {
    filter.created_at = {};
    if (startDate) filter.created_at.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.created_at.$lte = end;
    }
  }

  const totalItems = await Order.countDocuments(filter);
  const pagination = getPagination(page, limit, totalItems);

  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  const orders = await Order.find(filter)
    .populate('customer_id', 'full_name phone phone_number avatar profile_pic_url psid tags')
    .populate('channel_id', 'page_name page_id platform avatar_url')
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email')
    .sort(sortOptions)
    .skip(pagination.skip)
    .limit(pagination.limit);

  // Thống kê nhanh toàn bộ đơn hàng của business
  const [pendingCount, confirmedCount, shippingCount, completedCount, cancelledCount, revenueAgg] = await Promise.all([
    Order.countDocuments({ business_id: bId, $or: [{ order_status: 'PENDING' }, { status: 'PENDING' }] }),
    Order.countDocuments({ business_id: bId, $or: [{ order_status: 'CONFIRMED' }, { status: 'CONFIRMED' }] }),
    Order.countDocuments({ business_id: bId, $or: [{ order_status: 'SHIPPING' }, { status: 'SHIPPING' }] }),
    Order.countDocuments({ business_id: bId, $or: [{ order_status: 'COMPLETED' }, { status: 'COMPLETED' }, { order_status: 'DELIVERED' }] }),
    Order.countDocuments({ business_id: bId, $or: [{ order_status: 'CANCELLED' }, { status: 'CANCELLED' }] }),
    Order.aggregate([
      {
        $match: {
          business_id: bId,
          $or: [
            { order_status: { $in: ['COMPLETED', 'DELIVERED', 'CONFIRMED', 'SHIPPING'] } },
            { status: { $in: ['COMPLETED', 'DELIVERED', 'CONFIRMED', 'SHIPPING'] } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: '$total_amount' }
        }
      }
    ])
  ]);

  const summary = {
    total_orders: await Order.countDocuments({ business_id: bId }),
    pending_count: pendingCount,
    confirmed_count: confirmedCount,
    shipping_count: shippingCount,
    completed_count: completedCount,
    cancelled_count: cancelledCount,
    total_revenue: revenueAgg[0]?.total_revenue || 0
  };

  return {
    orders,
    summary,
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
 * 2. Lấy thống kê KPI Đơn hàng
 */
export const getOrderStatsService = async (business_id) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  let bId;
  try {
    bId = new mongoose.Types.ObjectId(business_id);
  } catch (err) {
    bId = business_id;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalOrders, todayOrders, pendingOrders, completedOrders, cancelledOrders, revenueAgg] = await Promise.all([
    Order.countDocuments({ business_id: bId }),
    Order.countDocuments({ business_id: bId, created_at: { $gte: startOfToday } }),
    Order.countDocuments({ business_id: bId, $or: [{ order_status: 'PENDING' }, { status: 'PENDING' }] }),
    Order.countDocuments({ business_id: bId, $or: [{ order_status: 'COMPLETED' }, { status: 'COMPLETED' }, { order_status: 'DELIVERED' }] }),
    Order.countDocuments({ business_id: bId, $or: [{ order_status: 'CANCELLED' }, { status: 'CANCELLED' }] }),
    Order.aggregate([
      {
        $match: {
          business_id: bId,
          $or: [
            { order_status: { $in: ['COMPLETED', 'DELIVERED'] } },
            { status: { $in: ['COMPLETED', 'DELIVERED'] } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total_amount' }
        }
      }
    ])
  ]);

  return {
    total_orders: totalOrders,
    today_orders: todayOrders,
    pending_orders: pendingOrders,
    completed_orders: completedOrders,
    cancelled_orders: cancelledOrders,
    total_revenue: revenueAgg[0]?.revenue || 0
  };
};

/**
 * 3. Lấy chi tiết đơn hàng
 */
export const getOrderByIdService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;

  const order = await Order.findOne(filter)
    .populate('customer_id')
    .populate('channel_id', 'page_name page_id platform avatar_url')
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email')
    .populate('status_history.updated_by', 'full_name email');

  if (!order) throw new Error('Không tìm thấy đơn hàng');

  const orderDetails = await OrderDetail.find({ order_id: order._id })
    .populate('product_id', 'product_name sku image_url thumbnail_url');

  return {
    ...order.toObject(),
    details: orderDetails
  };
};

/**
 * 4. Tạo Đơn hàng mới (Hỗ trợ tạo từ Chat Facebook / Bot AI / POS)
 * Mặc định trạng thái là PENDING (Chờ duyệt)
 */
export const createOrderService = async (data, userId) => {
  if (!data.business_id) throw new Error('business_id là bắt buộc');

  let bId;
  try {
    bId = new mongoose.Types.ObjectId(data.business_id);
  } catch {
    bId = data.business_id;
  }

  // Tự động sinh mã đơn hàng độc nhất dạng DH-xxxxx
  const count = await Order.countDocuments({ business_id: bId });
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const orderCode = data.order_code || `DH-${String(count + 1001).slice(-4)}${randomSuffix}`;

  // Chuẩn hóa trạng thái ban đầu: PENDING (Chờ duyệt)
  const initialStatus = data.order_status || data.status || 'PENDING';

  // Lấy hoặc tạo thông tin khách hàng
  let customer = null;
  if (data.customer_id) {
    customer = await Customer.findById(data.customer_id);
  } else {
    const phone = data.shipping_phone || data.customer_phone || '';
    if (phone) {
      customer = await Customer.findOne({ business_id: bId, $or: [{ phone }, { phone_number: phone }] });
    }
    if (!customer) {
      const name = data.shipping_customer_name || data.customer_name || 'Khách vãng lai';
      customer = await Customer.create({
        business_id: bId,
        full_name: name,
        phone: phone || '',
        phone_number: phone || '',
        shipping_address: data.shipping_address || '',
        address: data.shipping_address || '',
        channel_id: data.channel_id || null,
        tags: ['Khách mới']
      });
    }
  }

  if (!customer) throw new Error('Không thể xác định hoặc tạo khách hàng cho đơn này');

  const shippingName = data.shipping_customer_name || data.customer_name || customer.full_name || '';
  const shippingPhone = data.shipping_phone || data.customer_phone || customer.phone || customer.phone_number || '';
  const shippingAddr = data.shipping_address || customer.shipping_address || customer.address || '';

  // Tính toán tiền hàng
  const items = Array.isArray(data.order_items) ? data.order_items : (data.items || []);
  let subtotal = 0;
  items.forEach((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price || item.price) || 0;
    subtotal += qty * price;
  });

  const shippingFee = Number(data.shipping_fee) || 0;
  const discountAmount = Number(data.discount_amount) || 0;
  const totalAmount = data.total_amount !== undefined ? Number(data.total_amount) : Math.max(0, subtotal + shippingFee - discountAmount);

  // Tạo đơn hàng
  const order = await Order.create({
    order_code: orderCode,
    business_id: bId,
    customer_id: customer._id,
    conversation_id: data.conversation_id || null,
    channel_id: data.channel_id || null,
    order_items: items.map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name || it.name,
      name: it.product_name || it.name,
      sku: it.sku || it.variant_sku || '',
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price || it.price) || 0,
      price: Number(it.unit_price || it.price) || 0,
      total_price: (Number(it.quantity) || 1) * (Number(it.unit_price || it.price) || 0)
    })),
    subtotal_amount: subtotal,
    shipping_fee: shippingFee,
    discount_amount: discountAmount,
    total_amount: totalAmount,
    shipping_customer_name: shippingName,
    customer_name: shippingName,
    shipping_phone: shippingPhone,
    customer_phone: shippingPhone,
    shipping_address: shippingAddr,
    order_status: initialStatus,
    status: initialStatus,
    payment_method: data.payment_method || 'COD',
    payment_status: data.payment_status || 'UNPAID',
    extracted_by_ai: data.extracted_by_ai ?? true,
    source: data.source || (data.conversation_id ? 'facebook' : 'manual'),
    notes: data.notes || '',
    created_by: userId || null,
    created_by_user_id: userId || null,
    status_history: [
      {
        status: initialStatus,
        updated_at: new Date(),
        updated_by: userId || null,
        note: data.extracted_by_ai ? 'Đơn hàng tự động trích xuất từ chat' : 'Tạo đơn hàng thủ công'
      }
    ]
  });

  // Tạo chi tiết OrderDetail và cập nhật tồn kho
  for (const it of items) {
    if (it.product_id) {
      try {
        await OrderDetail.create({
          order_id: order._id,
          product_id: it.product_id,
          variant_sku: it.sku || it.variant_sku || 'DEFAULT',
          product_name: it.product_name || it.name || 'Sản phẩm',
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price || it.price) || 0,
          total_price: (Number(it.quantity) || 1) * (Number(it.unit_price || it.price) || 0)
        });

        // Trừ tồn kho khả dụng
        await Product.findByIdAndUpdate(it.product_id, {
          $inc: { stock_available: -(Number(it.quantity) || 1) }
        });

        // Ghi nhật ký tồn kho
        await Inventory.create({
          business_id: bId,
          product_id: it.product_id,
          variant_sku: it.sku || it.variant_sku || '',
          type: 'ORDER_HOLD',
          quantity: -(Number(it.quantity) || 1),
          unit_price: Number(it.unit_price || it.price) || 0,
          note: `Giữ hàng cho đơn ${order.order_code}`,
          performed_by: userId || null
        });
      } catch (itemErr) {
        console.warn('[Create Order Detail Warning]', itemErr.message);
      }
    }
  }

  // Cập nhật thông tin khách hàng nếu khách chưa có SĐT hoặc Địa chỉ
  const custUpdates = {
    $inc: { total_orders_count: 1 },
    last_interaction_at: new Date()
  };
  if (!customer.phone && shippingPhone) {
    custUpdates.phone = shippingPhone;
    custUpdates.phone_number = shippingPhone;
  }
  if (!customer.shipping_address && shippingAddr) {
    custUpdates.shipping_address = shippingAddr;
    custUpdates.address = shippingAddr;
  }
  await Customer.findByIdAndUpdate(customer._id, custUpdates);

  // Bắn Socket.IO thông báo có đơn hàng mới
  try {
    const io = getIO();
    const populated = await Order.findById(order._id)
      .populate('customer_id')
      .populate('channel_id');
    io.to(bId.toString()).emit('new_order', populated);
    io.emit('order_created', populated);
  } catch (sockErr) {
    console.warn('[Socket Order Warn]', sockErr.message);
  }

  // Tự động gán nhãn "Đã đặt hàng" cho cuộc trò chuyện nếu tạo đơn từ chat
  if (data.conversation_id) {
    autoTagConversationService(data.conversation_id, {
      orderCreated: true,
      customerId: customer?._id,
      hasPhone: Boolean(shippingPhone),
      phone: shippingPhone
    }).catch(() => {});
  }

  return order;
};

/**
 * 5. Cập nhật Trạng thái Đơn hàng (Kèm phân quyền, hoàn kho khi hủy, tích lũy doanh thu khi hoàn thành)
 */
export const updateOrderStatusService = async (id, newStatus, business_id, userId, note = '', cancellationReason = '') => {
  if (!newStatus) throw new Error('Trạng thái mới là bắt buộc');

  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;

  const order = await Order.findOne(filter);
  if (!order) throw new Error('Không tìm thấy đơn hàng để cập nhật');

  const oldStatus = order.order_status || order.status;
  if (oldStatus === newStatus) return order;

  order.order_status = newStatus;
  order.status = newStatus;
  order.updated_by = userId || null;

  if (newStatus === 'CANCELLED') {
    order.cancellation_reason = cancellationReason || note || 'Khách hủy đơn';
  }

  order.status_history = order.status_history || [];
  order.status_history.push({
    status: newStatus,
    updated_at: new Date(),
    updated_by: userId || null,
    note: note || `Chuyển trạng thái từ ${oldStatus} sang ${newStatus}`
  });

  // A. Nếu đơn chuyển sang CANCELLED (Đã hủy) -> Hoàn lại tồn kho
  if (newStatus === 'CANCELLED' && oldStatus !== 'CANCELLED') {
    for (const item of order.order_items || []) {
      if (item.product_id) {
        try {
          await Product.findByIdAndUpdate(item.product_id, {
            $inc: { stock_available: item.quantity || 1 }
          });
          await Inventory.create({
            business_id: order.business_id,
            product_id: item.product_id,
            type: 'ORDER_RELEASE',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || item.price || 0,
            note: `Hoàn tồn kho do hủy đơn ${order.order_code}`,
            performed_by: userId || null
          });
        } catch (invErr) {
          console.warn('[Inventory Rollback Warning]', invErr.message);
        }
      }
    }
  }

  // B. Nếu đơn chuyển sang COMPLETED / DELIVERED -> Trừ kho vật lý và tích lũy chi tiêu cho khách
  if ((newStatus === 'COMPLETED' || newStatus === 'DELIVERED') && oldStatus !== 'COMPLETED' && oldStatus !== 'DELIVERED') {
    order.payment_status = 'PAID';

    // Trừ kho vật lý
    for (const item of order.order_items || []) {
      if (item.product_id) {
        try {
          await Product.findByIdAndUpdate(item.product_id, {
            $inc: { stock_physical: -(item.quantity || 1) }
          });
          await Inventory.create({
            business_id: order.business_id,
            product_id: item.product_id,
            type: 'EXPORT',
            quantity: -(item.quantity || 1),
            unit_price: item.unit_price || item.price || 0,
            note: `Xuất kho hoàn tất đơn ${order.order_code}`,
            performed_by: userId || null
          });
        } catch (invErr) {
          console.warn('[Inventory Export Warning]', invErr.message);
        }
      }
    }

    // Tích lũy chi tiêu và gắn tag khách
    if (order.customer_id) {
      try {
        const cust = await Customer.findById(order.customer_id);
        if (cust) {
          const newSpend = (cust.total_spend_amount || 0) + (order.total_amount || 0);
          const currentTags = cust.tags || cust.customer_tags || [];
          const updatedTags = [...currentTags];

          if (!updatedTags.includes('Đã mua hàng')) updatedTags.push('Đã mua hàng');
          if (newSpend >= 5000000 && !updatedTags.some((t) => t.toUpperCase().includes('VIP'))) {
            updatedTags.push('VIP');
          }

          cust.total_spend_amount = newSpend;
          cust.tags = updatedTags;
          cust.customer_tags = updatedTags;
          cust.last_interaction_at = new Date();
          await cust.save();
        }
      } catch (custErr) {
        console.warn('[Customer Spend Acc Warning]', custErr.message);
      }
    }
  }

  await order.save();

  // Bắn Socket.IO thời gian thực
  try {
    const io = getIO();
    const populated = await Order.findById(order._id)
      .populate('customer_id')
      .populate('channel_id')
      .populate('updated_by');
    io.to(order.business_id.toString()).emit('order_updated', populated);
    io.emit('order_updated', populated);
  } catch (sockErr) {
    console.warn('[Socket Order Update Warn]', sockErr.message);
  }

  return order;
};

/**
 * 6. Xóa đơn hàng
 */
export const deleteOrderService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;

  const order = await Order.findOne(filter);
  if (!order) throw new Error('Không tìm thấy đơn hàng để xóa');

  // Xóa các chi tiết đơn hàng
  await OrderDetail.deleteMany({ order_id: order._id });
  await Order.findByIdAndDelete(order._id);

  return { message: 'Đã xóa đơn hàng thành công' };
};
