import {
  getKnowledgeService,
  getKnowledgeByIdService,
  createKnowledgeService,
  updateKnowledgeService,
  deleteKnowledgeService
} from '../services/knowledge.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getKnowledgeList = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    const items = await getKnowledgeService({ ...req.query, business_id });
    return sendSuccess(res, 'Lấy danh mục tri thức thành công', items);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getKnowledgeById = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    const item = await getKnowledgeByIdService(req.params.id, business_id);
    return sendSuccess(res, 'Lấy chi tiết tài liệu tri thức thành công', item);
  } catch (error) {
    return sendError(res, error.message, null, 404);
  }
};

export const createKnowledge = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.body.business_id;
    const item = await createKnowledgeService({ ...req.body, business_id }, req.user?._id);
    return sendSuccess(res, 'Tạo tài liệu tri thức thành công', item, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const updateKnowledge = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.body.business_id;
    const item = await updateKnowledgeService(req.params.id, req.body, business_id);
    return sendSuccess(res, 'Cập nhật tài liệu tri thức thành công', item);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const deleteKnowledge = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    const result = await deleteKnowledgeService(req.params.id, business_id);
    return sendSuccess(res, result.message);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};
