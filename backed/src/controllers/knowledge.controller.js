import {
  getKnowledgeService,
  getKnowledgeByIdService,
  createKnowledgeService,
  updateKnowledgeService,
  deleteKnowledgeService,
  previewKnowledgeFromFile,
  importKnowledgeFromBuffer,
  generateKnowledgeTemplateBuffer
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

/**
 * Xem trước dữ liệu tài liệu tri thức được phân tích từ file trước khi lưu
 */
export const previewKnowledgeFile = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return sendError(res, 'Vui lòng tải lên file Excel (.xlsx) hoặc CSV (.csv)', null, 400);
    }
    const preview = previewKnowledgeFromFile({ fileBuffer: req.file.buffer });
    return sendSuccess(res, 'Phân tích file tri thức thành công', preview);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

/**
 * Nhập hàng loạt tài liệu tri thức từ file vào cơ sở dữ liệu
 */
export const importKnowledge = async (req, res) => {
  try {
    const business_id = req.body.business_id || req.headers['x-business-id'];
    const overwriteMode = req.body.overwrite_mode || 'SKIP';

    if (!business_id) {
      return sendError(res, 'business_id là bắt buộc', null, 400);
    }
    if (!req.file || !req.file.buffer) {
      return sendError(res, 'Vui lòng tải lên file Excel (.xlsx) hoặc CSV (.csv)', null, 400);
    }

    const result = await importKnowledgeFromBuffer({
      business_id,
      fileBuffer: req.file.buffer,
      overwriteMode,
      userId: req.user?._id
    });

    return sendSuccess(res, 'Nhập tài liệu tri thức từ file thành công', result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

/**
 * Tải file Excel mẫu tài liệu tri thức cho chủ shop
 */
export const downloadKnowledgeTemplate = async (req, res) => {
  try {
    const buffer = generateKnowledgeTemplateBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Kho_Tri_Thuc_Mau_AI_Sales.xlsx"'
    );
    return res.send(buffer);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

