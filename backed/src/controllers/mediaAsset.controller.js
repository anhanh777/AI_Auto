import {
  getMediaAssetsService,
  getMediaStatsService,
  createMediaAssetsFromUploadService,
  createMediaAssetManualService,
  syncProductMediaService,
  updateMediaAssetService,
  deleteMediaAssetService,
  bulkDeleteMediaAssetsService
} from '../services/mediaAsset.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

const getBusinessId = (req) => {
  return (
    req.query.business_id ||
    req.body.business_id ||
    req.headers['x-business-id'] ||
    req.user?.active_business_id ||
    req.user?.business_id
  );
};

export const getMediaAssets = async (req, res) => {
  try {
    const business_id = getBusinessId(req);
    const result = await getMediaAssetsService({
      ...req.query,
      business_id
    });
    return sendSuccess(res, 'Lấy danh sách ảnh thành công', result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getMediaStats = async (req, res) => {
  try {
    const business_id = getBusinessId(req);
    const stats = await getMediaStatsService(business_id);
    return sendSuccess(res, 'Lấy thống kê kho ảnh thành công', stats);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const uploadMedia = async (req, res) => {
  try {
    const business_id = getBusinessId(req);
    const files = req.files || (req.file ? [req.file] : []);

    let parsedTags = [];
    if (req.body.tags) {
      try {
        parsedTags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
      } catch (e) {
        parsedTags = String(req.body.tags).split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    const created = await createMediaAssetsFromUploadService({
      business_id,
      uploaded_by: req.user?._id,
      files,
      folder: req.body.folder || req.query.folder || 'general',
      tags: parsedTags,
      caption: req.body.caption || '',
      host: req.get('host'),
      protocol: req.protocol
    });

    return sendSuccess(res, `Đã tải lên thành công ${created.length} ảnh vào kho`, created, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const createManualMedia = async (req, res) => {
  try {
    const business_id = getBusinessId(req);
    const asset = await createMediaAssetManualService({
      business_id,
      uploaded_by: req.user?._id,
      ...req.body
    });
    return sendSuccess(res, 'Lưu ảnh vào kho thành công', asset, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const syncProductMedia = async (req, res) => {
  try {
    const business_id = getBusinessId(req);
    const result = await syncProductMediaService(business_id);
    return sendSuccess(
      res,
      `Đồng bộ hoàn tất: Đã quét ${result.totalScannedProducts} sản phẩm và thêm mới ${result.addedCount} ảnh vào kho`,
      result
    );
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const updateMediaAsset = async (req, res) => {
  try {
    const business_id = getBusinessId(req);
    const updated = await updateMediaAssetService(req.params.id, business_id, req.body);
    return sendSuccess(res, 'Cập nhật thông tin ảnh thành công', updated);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const deleteMediaAsset = async (req, res) => {
  try {
    const business_id = getBusinessId(req);
    const result = await deleteMediaAssetService(req.params.id, business_id);
    return sendSuccess(res, 'Xóa ảnh khỏi kho thành công', result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const bulkDeleteMediaAssets = async (req, res) => {
  try {
    const business_id = getBusinessId(req);
    const { ids } = req.body;
    const result = await bulkDeleteMediaAssetsService(ids, business_id);
    return sendSuccess(res, `Đã xóa thành công ${result.deletedCount} ảnh khỏi kho`, result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};
