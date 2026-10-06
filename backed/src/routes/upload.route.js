import express from 'express';
import { upload } from '../middlewares/upload.middleware.js';
import { uploadSingleImage, uploadMultipleImages } from '../controllers/upload.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/v1/upload/single
 * @desc    Upload 1 file ảnh (avatar, logo, danh mục)
 * @access  Private
 */
router.post('/single', authenticate, upload.single('image'), uploadSingleImage);

/**
 * @route   POST /api/v1/upload/multiple
 * @desc    Upload nhiều file ảnh cùng lúc (tối đa 10 ảnh)
 * @access  Private
 */
router.post('/multiple', authenticate, upload.array('images', 10), uploadMultipleImages);

export default router;
