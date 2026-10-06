import { sendSuccess, sendError } from '../utils/response.util.js';

/**
 * Upload 1 file ảnh
 */
export const uploadSingleImage = (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'Vui lòng chọn một file ảnh hợp lệ', null, 400);
    }

    const folderType = req.query.folder || 'general';
    // Đường dẫn tương đối phục vụ qua express.static
    const relativePath = `/uploads/${folderType}/${req.file.filename}`;

    // Tạo Full URL đầy đủ
    const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

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
export const uploadMultipleImages = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 'Vui lòng chọn ít nhất một file ảnh hợp lệ', null, 400);
    }

    const folderType = req.query.folder || 'general';
    const uploadedFiles = req.files.map((file) => {
      const relativePath = `/uploads/${folderType}/${file.filename}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

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
