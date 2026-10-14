import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
  getMediaAssets,
  getMediaStats,
  uploadMedia,
  createManualMedia,
  syncProductMedia,
  updateMediaAsset,
  deleteMediaAsset,
  bulkDeleteMediaAssets
} from '../controllers/mediaAsset.controller.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/v1/media
 * @desc    Lấy danh sách ảnh trong Kho Media (có phân trang & lọc folder/search/tag)
 */
router.get('/', getMediaAssets);

/**
 * @route   GET /api/v1/media/stats
 * @desc    Thống kê tổng số lượng file và dung lượng lưu trữ của shop
 */
router.get('/stats', getMediaStats);

/**
 * @route   POST /api/v1/media/upload
 * @desc    Tải ảnh mới trực tiếp vào Kho Media (tối đa 20 ảnh/lần)
 */
router.post('/upload', upload.array('images', 20), uploadMedia);

/**
 * @route   POST /api/v1/media/manual
 * @desc    Lưu ảnh vào kho từ URL có sẵn
 */
router.post('/manual', createManualMedia);

/**
 * @route   POST /api/v1/media/sync-products
 * @desc    Tự động quét và gom tất cả ảnh sản phẩm vào Kho Media
 */
router.post('/sync-products', syncProductMedia);

/**
 * @route   PUT /api/v1/media/:id
 * @desc    Cập nhật thông tin ảnh (tên, folder, tags, caption)
 */
router.put('/:id', updateMediaAsset);

/**
 * @route   DELETE /api/v1/media/bulk
 * @desc    Xóa nhiều ảnh được chọn
 */
router.delete('/bulk', bulkDeleteMediaAssets);

/**
 * @route   DELETE /api/v1/media/:id
 * @desc    Xóa 1 ảnh khỏi kho
 */
router.delete('/:id', deleteMediaAsset);

export default router;
