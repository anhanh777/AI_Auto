import { sendSuccess, sendError } from '../utils/response.util.js';
import { StoredFile } from '../models/StoredFile.model.js';
import fs from 'fs';

/**
 * Upload 1 file ảnh
 */
export const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'Vui lòng chọn một file ảnh hợp lệ', null, 400);
    }

    const folderType = req.query.folder || 'general';
    // Đường dẫn tương đối phục vụ qua express.static
    const relativePath = `/uploads/${folderType}/${req.file.filename}`;

    // Tạo Full URL đầy đủ (đảm bảo luôn dùng https khi chạy production / proxy)
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = process.env.BACKEND_URL || `${proto}://${host}`;
    const fullUrl = `${baseUrl}${relativePath}`;

    // Lưu ngay vào MongoDB Atlas StoredFile để chống mất file khi Render restart/redeploy
    if (req.file.path && fs.existsSync(req.file.path)) {
      try {
        const fileBuf = fs.readFileSync(req.file.path);
        await StoredFile.updateOne(
          { filename: req.file.filename, folder: folderType },
          {
            $set: {
              filename: req.file.filename,
              folder: folderType,
              mimetype: req.file.mimetype || 'image/jpeg',
              size: req.file.size || fileBuf.length,
              data: fileBuf
            }
          },
          { upsert: true }
        );
      } catch (storeErr) {
        console.warn('[UploadSingleImage StoredFile Warn]', storeErr.message);
      }
    }

    return sendSuccess(res, 'Tải ảnh lên thành công', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: relativePath,
      url: fullUrl
    }, 201);
  } catch (error) {
    return sendError(res, error.message || 'Lỗi khi upload ảnh', null, 500);
  }
};

/**
 * Upload nhiều file ảnh cùng lúc (Dùng cho album ảnh sản phẩm)
 */
export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 'Vui lòng chọn ít nhất một file ảnh hợp lệ', null, 400);
    }

    const folderType = req.query.folder || 'general';
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = process.env.BACKEND_URL || `${proto}://${host}`;

    const uploadedFiles = req.files.map((file) => {
      const relativePath = `/uploads/${folderType}/${file.filename}`;
      const fullUrl = `${baseUrl}${relativePath}`;

      // Lưu file vào MongoDB Atlas StoredFile
      if (file.path && fs.existsSync(file.path)) {
        try {
          const fileBuf = fs.readFileSync(file.path);
          StoredFile.updateOne(
            { filename: file.filename, folder: folderType },
            {
              $set: {
                filename: file.filename,
                folder: folderType,
                mimetype: file.mimetype || 'image/jpeg',
                size: file.size || fileBuf.length,
                data: fileBuf
              }
            },
            { upsert: true }
          ).catch((e) => console.warn('[UploadMultiple StoredFile Async Warn]', e.message));
        } catch (storeErr) {
          console.warn('[UploadMultiple StoredFile Warn]', storeErr.message);
        }
      }

      return {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: relativePath,
        url: fullUrl
      };
    });

    return sendSuccess(res, `Đã tải lên thành công ${uploadedFiles.length} ảnh`, uploadedFiles, 201);
  } catch (error) {
    return sendError(res, error.message || 'Lỗi khi upload danh sách ảnh', null, 500);
  }
};
