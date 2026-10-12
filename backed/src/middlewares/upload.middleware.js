import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đường dẫn thư mục lưu ảnh: backed/uploads
const uploadDir = path.resolve(__dirname, '../../uploads');

// Tự động tạo thư mục nếu chưa tồn tại
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Cấu hình Disk Storage (Lưu trữ trên ổ cứng)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Có thể phân loại thư mục con theo query hoặc field: e.g. avatars, products
    const folderType = req.query.folder || 'general';
    const targetDir = path.join(uploadDir, folderType);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // Đổi tên file: [timestamp]_[random].[ext]
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// 2. Bộ lọc định dạng file (Hỗ trợ ảnh và tài liệu thông dụng)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ];
  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận các file ảnh hoặc tài liệu: PDF, Word, Excel, Text, Zip'), false);
  }
};

// 3. Khởi tạo Multer instance (Giới hạn 10MB)
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});
