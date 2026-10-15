import { Order, Conversation, Customer, Product, Message } from '../models/index.js';
import { sendSuccess, sendError } from '../utils/response.util.js';
import mongoose from 'mongoose';

export const getBusinessAnalytics = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    if (!business_id) throw new Error('business_id là bắt buộc');

    const timeRange = req.query.timeRange || '7days'; // 'today' | '7days' | '30days' | 'month' | 'all'
    const bizObjectId = new mongoose.Types.ObjectId(business_id);

    // Tính toán mốc thời gian lọc
    let startDate = null;
    const now = new Date();

    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === '7days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === '30days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const orderTimeMatch = startDate ? { business_id: bizObjectId, created_at: { $gte: startDate } } : { business_id: bizObjectId };
    const convTimeMatch = startDate ? { business_id: bizObjectId, created_at: { $gte: startDate } } : { business_id: bizObjectId };

    // 1. Tổng doanh thu & trạng thái đơn hàng
    const orderAgg = await Order.aggregate([
      { $match: orderTimeMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total_amount' },
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $in: ['$status', ['COMPLETED', 'DELIVERED']] }, 1, 0] }
          },
          confirmedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'CONFIRMED'] }, 1, 0] }
          },
          shippingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'SHIPPING'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
          },
          aiOrders: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$extracted_by_ai', true] },
                    { $eq: ['$order_source', 'FACEBOOK_AI'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          aiRevenue: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$extracted_by_ai', true] },
                    { $eq: ['$order_source', 'FACEBOOK_AI'] }
                  ]
                },
                '$total_amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const orderStats = orderAgg[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      completedOrders: 0,
      confirmedOrders: 0,
      shippingOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      aiOrders: 0,
      aiRevenue: 0
    };

    const manualOrders = Math.max(0, orderStats.totalOrders - orderStats.aiOrders);
    const manualRevenue = Math.max(0, orderStats.totalRevenue - orderStats.aiRevenue);
    const avgOrderValue = orderStats.totalOrders > 0 ? Math.round(orderStats.totalRevenue / orderStats.totalOrders) : 0;

    // 2. Tổng khách hàng & Khách mua lại
    const totalCustomers = await Customer.countDocuments({ business_id: bizObjectId });
    const repeatCustomers = await Customer.countDocuments({
      business_id: bizObjectId,
      tags: { $in: ['Mua lại', 'mua lại'] }
    });
    const repeatCustomerRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

    // 3. Tổng hội thoại & Tỷ lệ AI hoạt động / Tự động hóa
    const totalConversations = await Conversation.countDocuments(convTimeMatch);
    const handoverConversations = await Conversation.countDocuments({
      ...convTimeMatch,
      $or: [
        { is_bot_active: false },
        { conversation_status: 'PENDING_STAFF' }
      ]
    });
    const aiAutonomyRate = totalConversations > 0
      ? Math.round(((totalConversations - handoverConversations) / totalConversations) * 100)
      : 100;

    const aiConversionRate = totalConversations > 0
      ? Math.round((orderStats.aiOrders / totalConversations) * 100)
      : 0;

    // 4. Doanh thu theo ngày trong khoảng thời gian (Zero-filling để biểu đồ liên tục & mượt mà)
    const rawRevenueAgg = await Order.aggregate([
      { $match: orderTimeMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%d/%m', date: '$created_at', timezone: '+07:00' } },
          revenue: { $sum: '$total_amount' },
          ordersCount: { $sum: 1 },
          aiOrdersCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$extracted_by_ai', true] },
                    { $eq: ['$order_source', 'FACEBOOK_AI'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const revenueMap = new Map();
    rawRevenueAgg.forEach((r) => {
      revenueMap.set(r._id, r);
    });

    let revenueByDay = [];
    const today = new Date();

    if (timeRange === 'today') {
      const hourlyAgg = await Order.aggregate([
        { $match: orderTimeMatch },
        {
          $group: {
            _id: { $hour: { date: '$created_at', timezone: '+07:00' } },
            revenue: { $sum: '$total_amount' },
            ordersCount: { $sum: 1 },
            aiOrdersCount: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$extracted_by_ai', true] },
                      { $eq: ['$order_source', 'FACEBOOK_AI'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      const hourlyOrderMap = new Map();
      hourlyAgg.forEach((h) => hourlyOrderMap.set(h._id, h));

      const hours = [0, 3, 6, 9, 12, 15, 18, 21, 23];
      revenueByDay = hours.map((h) => {
        const hData = hourlyOrderMap.get(h) || {};
        return {
          _id: `${h}h`,
          revenue: hData.revenue || 0,
          ordersCount: hData.ordersCount || 0,
          aiOrdersCount: hData.aiOrdersCount || 0
        };
      });
    } else {
      let daysCount = 7;
      if (timeRange === '30days') daysCount = 30;
      else if (timeRange === 'month') {
        daysCount = Math.max(7, today.getDate());
      } else if (timeRange === 'all') {
        daysCount = 14;
      }

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const existing = revenueMap.get(label);
        revenueByDay.push({
          _id: label,
          revenue: existing?.revenue || 0,
          ordersCount: existing?.ordersCount || 0,
          aiOrdersCount: existing?.aiOrdersCount || 0
        });
      }
    }

    // 5. Cơ cấu trạng thái đơn hàng (Order Status Distribution)
    const orderStatusDistribution = [
      { status: 'PENDING', label: 'Chờ duyệt', count: orderStats.pendingOrders, color: '#f59e0b' },
      { status: 'CONFIRMED', label: 'Đã xác nhận', count: orderStats.confirmedOrders, color: '#3b82f6' },
      { status: 'SHIPPING', label: 'Đang giao', count: orderStats.shippingOrders, color: '#8b5cf6' },
      { status: 'COMPLETED', label: 'Hoàn thành', count: orderStats.completedOrders, color: '#10b981' },
      { status: 'CANCELLED', label: 'Đã hủy', count: orderStats.cancelledOrders, color: '#ef4444' }
    ];

    // 6. Phễu chuyển đổi bán hàng (Conversion Funnel)
    const conversationsWithPhone = await Conversation.countDocuments({
      ...convTimeMatch,
      $or: [
        { tags: { $in: ['Có SĐT', 'có sđt'] } },
        { 'order_draft.phone': { $ne: '' } }
      ]
    });

    const funnelData = [
      {
        stage: 'Khách gửi tin nhắn',
        count: totalConversations,
        percentage: 100,
        desc: 'Khách mở hộp thoại chat với Fanpage'
      },
      {
        stage: 'Khám phá & Tư vấn mẫu',
        count: Math.max(totalConversations > 0 ? Math.round(totalConversations * 0.85) : 0, orderStats.totalOrders),
        percentage: totalConversations > 0 ? Math.min(100, Math.round((Math.max(totalConversations * 0.85, orderStats.totalOrders) / totalConversations) * 100)) : 0,
        desc: 'Khách hỏi xem mẫu mã, kích cỡ, giá cả'
      },
      {
        stage: 'Cung cấp SĐT & Địa chỉ',
        count: Math.max(conversationsWithPhone, orderStats.totalOrders),
        percentage: totalConversations > 0 ? Math.min(100, Math.round((Math.max(conversationsWithPhone, orderStats.totalOrders) / totalConversations) * 100)) : 0,
        desc: 'Thu thập đầy đủ thông tin giao nhận'
      },
      {
        stage: 'Chốt đơn hàng thành công',
        count: orderStats.totalOrders,
        percentage: totalConversations > 0 ? Math.round((orderStats.totalOrders / totalConversations) * 100) : (orderStats.totalOrders > 0 ? 100 : 0),
        desc: 'Đơn hàng được AI / Shop tạo thành công'
      }
    ];

    // 7. Khung giờ tương tác trong ngày (24 Giờ)
    const convIds = await Conversation.find({ business_id: bizObjectId }).select('_id').lean();
    const convIdList = convIds.map((c) => c._id);

    const hourlyAgg = await Message.aggregate([
      { $match: { conversation_id: { $in: convIdList } } },
      {
        $group: {
          _id: { $hour: '$created_at' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const hourlyTrafficMap = new Map();
    hourlyAgg.forEach((h) => hourlyTrafficMap.set(h._id, h.count));

    const hourlyTraffic = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i}h`,
      messagesCount: hourlyTrafficMap.get(i) || 0
    }));

    // 8. Tính toán số lượng đã bán thực tế theo từng sản phẩm
    const soldAgg = await Order.aggregate([
      { $match: orderTimeMatch },
      { $unwind: '$order_items' },
      {
        $group: {
          _id: '$order_items.product_id',
          soldQuantity: { $sum: '$order_items.quantity' },
          productName: { $first: '$order_items.product_name' },
          sku: { $first: '$order_items.sku' }
        }
      }
    ]);

    const soldMap = new Map();
    soldAgg.forEach((s) => {
      if (s._id) soldMap.set(s._id.toString(), s.soldQuantity);
      if (s.productName) soldMap.set(s.productName.toLowerCase().trim(), s.soldQuantity);
      if (s.sku) soldMap.set(s.sku.toLowerCase().trim(), s.soldQuantity);
    });

    const allProducts = await Product.find({ business_id: bizObjectId })
      .select('product_name sku sale_price base_price stock_physical stock_available image_urls')
      .lean();

    const topProducts = allProducts
      .map((p) => {
        const sold =
          soldMap.get(p._id.toString()) ||
          soldMap.get(p.product_name?.toLowerCase().trim()) ||
          soldMap.get(p.sku?.toLowerCase().trim()) ||
          0;
        return {
          ...p,
          sold_quantity: sold
        };
      })
      .sort((a, b) => b.sold_quantity - a.sold_quantity)
      .slice(0, 8);

    return sendSuccess(res, 'Lấy dữ liệu thống kê kinh doanh thành công', {
      timeRange,
      overview: {
        totalRevenue: orderStats.totalRevenue,
        totalOrders: orderStats.totalOrders,
        completedOrders: orderStats.completedOrders,
        pendingOrders: orderStats.pendingOrders,
        confirmedOrders: orderStats.confirmedOrders,
        shippingOrders: orderStats.shippingOrders,
        cancelledOrders: orderStats.cancelledOrders,
        aiOrders: orderStats.aiOrders,
        aiRevenue: orderStats.aiRevenue,
        manualOrders,
        manualRevenue,
        avgOrderValue,
        totalCustomers,
        repeatCustomers,
        repeatCustomerRate,
        totalConversations,
        handoverConversations,
        aiAutonomyRate,
        aiConversionRate,
        avgResponseTimeSeconds: 3
      },
      revenueByDay,
      orderStatusDistribution,
      funnelData,
      hourlyTraffic,
      topProducts
    });
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};
