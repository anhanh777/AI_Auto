import {
  getCustomersService,
  getCustomerByIdService,
  createCustomerService,
  updateCustomerService,
  deleteCustomerService,
  getCustomerStatsService,
  getCustomerOrdersService
} from '../services/customer.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getCustomerStats = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const stats = await getCustomerStatsService(business_id);
    return sendSuccess(res, 'Lấy thống kê khách hàng thành công', stats);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const orders = await getCustomerOrdersService(req.params.id, business_id);
    return sendSuccess(res, 'Lấy lịch sử đơn hàng của khách thành công', orders);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getCustomers = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const result = await getCustomersService({ ...req.query, business_id });
    return sendSuccess(res, 'Lấy danh sách khách hàng thành công', result.customers, 200, {
      pagination: result.pagination
    });
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const customer = await getCustomerByIdService(req.params.id, business_id);
    return sendSuccess(res, 'Lấy chi tiết khách hàng thành công', customer);
  } catch (error) {
    return sendError(res, error.message, null, 404);
  }
};

export const createCustomer = async (req, res) => {
  try {
    const business_id = req.body.business_id || req.headers['x-business-id'];
    const customer = await createCustomerService({ ...req.body, business_id }, req.user?._id);
    return sendSuccess(res, 'Thêm khách hàng thành công', customer, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const business_id = req.body.business_id || req.headers['x-business-id'];
    const customer = await updateCustomerService(req.params.id, req.body, business_id);
    return sendSuccess(res, 'Cập nhật thông tin khách hàng thành công', customer);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const business_id = req.query.business_id || req.headers['x-business-id'];
    const result = await deleteCustomerService(req.params.id, business_id);
    return sendSuccess(res, result.message);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};
