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
    const rawPath = (req.path || req.url || '').split('?')[0].replace(/^\/+/, '');
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

    // 2. Tìm trong MongoDB Atlas StoredFile (tìm trên cả storedfiles và stored_files)
    let stored = await StoredFile.findOne({
      $or: [
        { filename, folder },
        { filename }
      ]
    }).lean();

    if (!stored) {
      try {
        const altCollection = StoredFile.db?.collection('stored_files');
        if (altCollection) {
          stored = await altCollection.findOne({
            $or: [
              { filename, folder },
              { filename }
            ]
          });
        }
      } catch (altErr) {}
    }

    if (stored && stored.data) {
      const fileBuffer = Buffer.isBuffer(stored.data)
        ? stored.data
        : (stored.data.buffer ? Buffer.from(stored.data.buffer) : Buffer.from(stored.data));

      try {
        const dir = path.dirname(localFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(localFilePath, fileBuffer);
      } catch (cacheErr) {
        console.warn('[FileRecovery Cache Warn]', cacheErr.message);
      }

      let mimeType = stored.mimetype || 'image/jpeg';
      if (fileBuffer.length >= 4) {
        const hex = fileBuffer.slice(0, 4).toString('hex').toLowerCase();
        if (hex.startsWith('ffd8')) mimeType = 'image/jpeg';
        else if (hex.startsWith('89504e47')) mimeType = 'image/png';
        else if (hex.startsWith('52494646')) mimeType = 'image/webp';
        else if (hex.startsWith('47494638')) mimeType = 'image/gif';
      }

      res.set('Content-Type', mimeType);
      res.set('Cache-Control', 'public, max-age=86400');
      return res.end(fileBuffer);
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
