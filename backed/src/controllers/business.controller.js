import {
  getBusinessesService,
  getBusinessByIdService,
  createBusinessService,
  updateBusinessService,
  deleteBusinessService
} from '../services/business.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getBusinesses = async (req, res) => {
  try {
    const businesses = await getBusinessesService(req.query);
    return sendSuccess(res, 'Lấy danh sách doanh nghiệp thành công', businesses);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getBusinessById = async (req, res) => {
  try {
    const business = await getBusinessByIdService(req.params.id);
    return sendSuccess(res, 'Lấy thông tin doanh nghiệp thành công', business);
  } catch (error) {
    return sendError(res, error.message, null, 404);
  }
};

export const createBusiness = async (req, res) => {
  try {
    const newBusiness = await createBusinessService(req.body, req.user?._id);
    return sendSuccess(res, 'Tạo doanh nghiệp thành công', newBusiness, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const updated = await updateBusinessService(req.params.id, req.body, req.user?._id);
    return sendSuccess(res, 'Cập nhật doanh nghiệp thành công', updated);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const deleteBusiness = async (req, res) => {
  try {
    const result = await deleteBusinessService(req.params.id);
    return sendSuccess(res, result.message, result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};
