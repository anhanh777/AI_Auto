import { Order, Conversation, Customer, Product } from '../models/index.js';
import { sendSuccess, sendError } from '../utils/response.util.js';
import mongoose from 'mongoose';

export const getBusinessAnalytics = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    if (!business_id) throw new Error('business_id là bắt buộc');

    const bizObjectId = new mongoose.Types.ObjectId(business_id);

    // 1. Tổng doanh thu & tổng đơn hàng
    const orderAgg = await Order.aggregate([
      { $match: { business_id: bizObjectId } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total_amount' },
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $in: ['$status', ['COMPLETED', 'DELIVERED']] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
          },
          aiOrders: {
            $sum: { $cond: [{ $eq: ['$extracted_by_ai', true] }, 1, 0] }
          }
        }
      }
    ]);

    const orderStats = orderAgg[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0,
      aiOrders: 0
    };

    // 2. Tổng khách hàng
    const totalCustomers = await Customer.countDocuments({ business_id: bizObjectId });

    // 3. Tổng hội thoại & Tỷ lệ AI hoạt động
    const totalConversations = await Conversation.countDocuments({ business_id: bizObjectId });
    const aiActiveConversations = await Conversation.countDocuments({
      business_id: bizObjectId,
      is_bot_active: true
    });

    // 4. Doanh thu 7 ngày gần nhất
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const revenueByDay = await Order.aggregate([
      {
        $match: {
          business_id: bizObjectId,
          created_at: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%d/%m', date: '$created_at' } },
          revenue: { $sum: '$total_amount' },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 5. Top sản phẩm bán chạy
    const topProducts = await Product.find({ business_id: bizObjectId })
      .sort({ stock_physical: -1 })
      .limit(5)
      .select('product_name sku sale_price base_price stock_physical stock_available image_urls');

    return sendSuccess(res, 'Lấy dữ liệu thống kê kinh doanh thành công', {
      overview: {
        totalRevenue: orderStats.totalRevenue,
        totalOrders: orderStats.totalOrders,
        completedOrders: orderStats.completedOrders,
        pendingOrders: orderStats.pendingOrders,
        aiOrders: orderStats.aiOrders,
        totalCustomers,
        totalConversations,
        aiActiveConversations,
        aiConversionRate:
          totalConversations > 0
            ? Math.round((orderStats.aiOrders / totalConversations) * 100)
            : 0
      },
      revenueByDay,
      topProducts
    });
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};
