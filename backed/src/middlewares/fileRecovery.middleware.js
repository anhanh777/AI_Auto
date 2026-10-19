import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { StoredFile } from '../models/StoredFile.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

/**
 * Middleware tự phục hồi file tĩnh (Self-Healing Upload Recovery):
 * Nếu file ảnh trên container Render bị xóa do redeploy/restart,
 * middleware này tự động truy vấn MongoDB Atlas StoredFile để lấy nhị phân ảnh,
 * phục hồi lại vào ổ cứng và gửi về cho Client / Facebook Send API với HTTP 200.
 */
export const serveOrRecoverUploadFile = async (req, res, next) => {
  try {
    const rawPath = req.path.replace(/^\/+/, '');
    const parts = rawPath.split('/');
    let folder = 'general';
    let filename = '';

    if (parts.length >= 2) {
      folder = parts[0];
      filename = parts.slice(1).join('/');
    } else {
      filename = parts[0];
    }

    if (!filename) return next();

    // 1. Kiểm tra lại local disk (nếu đã có sẵn thì gửi ngay)
    const localFilePath = path.join(uploadDir, folder, filename);
    if (fs.existsSync(localFilePath)) {
      return res.sendFile(localFilePath);
    }

    // 2. Tìm trong MongoDB Atlas StoredFile
    const stored = await StoredFile.findOne({
      $or: [
        { filename, folder },
        { filename }
      ]
    }).lean();

    if (stored && stored.data) {
      try {
        const dir = path.dirname(localFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(localFilePath, stored.data);
      } catch (cacheErr) {
        console.warn('[FileRecovery Cache Warn]', cacheErr.message);
      }

      res.set('Content-Type', stored.mimetype || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(stored.data);
    }

    // 3. Fallback an toàn nếu file hoàn toàn không tồn tại (tránh lỗi 404 cho Facebook và LiveChat)
    const fallbackImage = path.join(uploadDir, 'products', 'akn_474_theu_hoa.jpg');
    if (fs.existsSync(fallbackImage)) {
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=3600');
      return res.sendFile(fallbackImage);
    }

    return next();
  } catch (error) {
    console.error('[FileRecovery Error]', error.message);
    return next();
  }
};
