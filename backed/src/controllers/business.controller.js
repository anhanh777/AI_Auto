import {
  getBusinessesService,
  getBusinessByIdService,
  createBusinessService,
  joinBusinessByCodeService,
  updateBusinessService,
  deleteBusinessService,
  toggleArchiveBusinessService
} from '../services/business.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getBusinesses = async (req, res) => {
  try {
    const businesses = await getBusinessesService({
      ...req.query,
      userId: req.user?._id,
      role: req.user?.role
    });
    return sendSuccess(res, 'Lấy danh sách doanh nghiệp thành công', businesses);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const joinBusiness = async (req, res) => {
  try {
    const { code } = req.body;
    const business = await joinBusinessByCodeService(code, req.user?._id);
    return sendSuccess(res, `Đã tham gia doanh nghiệp "${business.business_name}" thành công!`, business);
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

export const toggleArchiveBusiness = async (req, res) => {
  try {
    const result = await toggleArchiveBusinessService(req.params.id, req.user?._id);
    return sendSuccess(res, result.message, result.business);
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
