import {
  getBusinessesService,
  getBusinessByIdService,
  createBusinessService,
  joinBusinessByCodeService,
  getBusinessJoinRequestsService,
  approveJoinRequestService,
  rejectJoinRequestService,
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
    const result = await joinBusinessByCodeService(code, req.user?._id);
    return sendSuccess(res, result.message, result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getBusinessJoinRequests = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;
    const requests = await getBusinessJoinRequestsService(id, status);
    return sendSuccess(res, 'Lấy danh sách yêu cầu tham gia thành công', requests);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const approveJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await approveJoinRequestService(requestId, req.user?._id);
    return sendSuccess(res, result.message, result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const rejectJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { note } = req.body;
    const result = await rejectJoinRequestService(requestId, req.user?._id, note);
    return sendSuccess(res, result.message, result);
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
