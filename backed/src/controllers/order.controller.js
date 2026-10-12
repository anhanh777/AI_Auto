import {
  getOrdersService,
  getOrderStatsService,
  getOrderByIdService,
  createOrderService,
  updateOrderStatusService,
  deleteOrderService
} from '../services/order.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getOrders = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const result = await getOrdersService({ ...req.query, business_id });
    return sendSuccess(res, 'Lấy danh sách đơn hàng thành công', result.orders, 200, {
      summary: result.summary,
      pagination: result.pagination
    });
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getOrderStats = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const stats = await getOrderStatsService(business_id);
    return sendSuccess(res, 'Lấy thống kê đơn hàng thành công', stats);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getOrderById = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const order = await getOrderByIdService(req.params.id, business_id);
    return sendSuccess(res, 'Lấy thông tin đơn hàng thành công', order);
  } catch (error) {
    return sendError(res, error.message, null, 404);
  }
};

export const createOrder = async (req, res) => {
  try {
    const business_id = req.body.business_id || req.headers['x-business-id'];
    const order = await createOrderService({ ...req.body, business_id }, req.user?._id);
    return sendSuccess(res, 'Tạo đơn hàng mới thành công', order, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const business_id = req.body.business_id || req.headers['x-business-id'];
    const { status, note, cancellation_reason, cancellationReason } = req.body;
    const order = await updateOrderStatusService(
      req.params.id,
      status,
      business_id,
      req.user?._id,
      note,
      cancellation_reason || cancellationReason
    );
    return sendSuccess(res, 'Cập nhật trạng thái đơn hàng thành công', order);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const result = await deleteOrderService(req.params.id, business_id);
    return sendSuccess(res, result.message);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

