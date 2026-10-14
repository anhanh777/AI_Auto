import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MediaAsset } from '../models/MediaAsset.model.js';
import { Product } from '../models/Product.model.js';
import '../models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

/**
 * Lấy danh sách Media Asset có phân trang, lọc theo folder, search text
 */
export const getMediaAssetsService = async ({
  business_id,
  folder,
  search,
  tag,
  page = 1,
  limit = 24
}) => {
  if (!business_id) {
    throw new Error('Business ID là bắt buộc');
  }

  const query = { business_id };

  if (folder && folder !== 'all') {
    query.folder = folder;
  }

  if (tag) {
    query.tags = tag;
  }

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { file_name: searchRegex },
      { caption: searchRegex },
      { tags: searchRegex }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [assets, total] = await Promise.all([
    MediaAsset.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('uploaded_by', 'name email avatar')
      .lean(),
    MediaAsset.countDocuments(query)
  ]);

  return {
    assets,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1
    }
  };
};

/**
 * Thống kê tổng số ảnh và dung lượng lưu trữ của Doanh nghiệp
 */
export const getMediaStatsService = async (business_id) => {
  if (!business_id) return { totalFiles: 0, totalSizeMB: 0, byFolder: {} };

  const stats = await MediaAsset.aggregate([
    { $match: { business_id: new MediaAsset().schema.path('business_id').cast(business_id) } },
    {
      $group: {
        _id: '$folder',
        count: { $sum: 1 },
        totalBytes: { $sum: '$file_size' }
      }
    }
  ]);

  let totalFiles = 0;
  let totalBytes = 0;
  const byFolder = {};

  stats.forEach((item) => {
    totalFiles += item.count;
    totalBytes += item.totalBytes || 0;
    byFolder[item._id] = {
      count: item.count,
      sizeMB: ((item.totalBytes || 0) / (1024 * 1024)).toFixed(2)
    };
  });

  return {
    totalFiles,
    totalSizeBytes: totalBytes,
    totalSizeMB: (totalBytes / (1024 * 1024)).toFixed(2),
    byFolder
  };
};

/**
 * Tạo Media Assets từ file tải lên (Multer)
 */
export const createMediaAssetsFromUploadService = async ({
  business_id,
  uploaded_by,
  files,
  folder = 'general',
  tags = [],
  caption = '',
  host,
  protocol = 'http'
}) => {
  if (!business_id) throw new Error('Business ID là bắt buộc');
  if (!files || files.length === 0) throw new Error('Không có file ảnh nào được tải lên');

  const createdAssets = [];

  for (const file of files) {
    const folderType = folder || 'general';
    const relativePath = `/uploads/${folderType}/${file.filename}`;
    const fullUrl = host ? `${protocol}://${host}${relativePath}` : relativePath;

    const newAsset = await MediaAsset.create({
      business_id,
      uploaded_by,
      file_name: file.originalname || file.filename,
      original_name: file.originalname,
      file_url: fullUrl,
      file_path: relativePath,
      file_size: file.size || 0,
      mimetype: file.mimetype || 'image/jpeg',
      folder: folderType,
      tags: Array.isArray(tags) ? tags : [],
      caption: caption || ''
    });

    createdAssets.push(newAsset);
  }

  return createdAssets;
};

/**
 * Thêm ảnh thủ công từ URL có sẵn vào Kho
 */
export const createMediaAssetManualService = async ({
  business_id,
  uploaded_by,
  file_url,
  file_name,
  folder = 'general',
  tags = [],
  caption = ''
}) => {
  if (!business_id) throw new Error('Business ID là bắt buộc');
  if (!file_url) throw new Error('URL ảnh là bắt buộc');

  const name = file_name || file_url.split('/').pop().split('?')[0] || 'Image';

  const newAsset = await MediaAsset.create({
    business_id,
    uploaded_by,
    file_name: name,
    original_name: name,
    file_url,
    file_path: '',
    file_size: 0,
    mimetype: 'image/jpeg',
    folder,
    tags: Array.isArray(tags) ? tags : [],
    caption
  });

  return newAsset;
};

/**
 * Tự động đồng bộ toàn bộ ảnh từ danh mục Sản phẩm vào Kho Media Doanh nghiệp
 */
export const syncProductMediaService = async (business_id) => {
  if (!business_id) throw new Error('Business ID là bắt buộc');

  const products = await Product.find({ business_id })
    .select('product_name sku image_urls image_url')
    .lean();

  let addedCount = 0;

  for (const product of products) {
    const urls = [];
    if (product.image_url) urls.push(product.image_url);
    if (Array.isArray(product.image_urls)) {
      urls.push(...product.image_urls);
    }

    const uniqueUrls = [...new Set(urls.filter(Boolean))];

    for (const url of uniqueUrls) {
      // Kiểm tra xem URL này đã tồn tại trong kho ảnh của business chưa
      const exists = await MediaAsset.findOne({ business_id, file_url: url });
      if (!exists) {
        await MediaAsset.create({
          business_id,
          file_name: product.product_name,
          original_name: product.sku || product.product_name,
          file_url: url,
          file_path: url.startsWith('/uploads/') ? url : '',
          folder: 'products',
          tags: [product.product_name, product.sku].filter(Boolean),
          caption: `Ảnh sản phẩm: ${product.product_name} (${product.sku || 'N/A'})`
        });
        addedCount++;
      }
    }
  }

  return { addedCount, totalScannedProducts: products.length };
};

/**
 * Cập nhật thông tin ảnh (Tên, Thư mục, Tags, Chú thích)
 */
export const updateMediaAssetService = async (id, business_id, updateData) => {
  const asset = await MediaAsset.findOne({ _id: id, business_id });
  if (!asset) throw new Error('Không tìm thấy ảnh');

  if (updateData.file_name) asset.file_name = updateData.file_name;
  if (updateData.folder) asset.folder = updateData.folder;
  if (updateData.caption !== undefined) asset.caption = updateData.caption;
  if (Array.isArray(updateData.tags)) asset.tags = updateData.tags;

  await asset.save();
  return asset;
};

/**
 * Xóa 1 ảnh (và xóa file vật lý nếu có trên ổ cứng server)
 */
export const deleteMediaAssetService = async (id, business_id) => {
  const asset = await MediaAsset.findOne({ _id: id, business_id });
  if (!asset) throw new Error('Không tìm thấy ảnh');

  // Xóa file vật lý trong thư mục uploads nếu file_path tồn tại
  if (asset.file_path && asset.file_path.startsWith('/uploads/')) {
    const relativePart = asset.file_path.replace('/uploads/', '');
    const physicalPath = path.join(uploadDir, relativePart);
    if (fs.existsSync(physicalPath)) {
      try {
        fs.unlinkSync(physicalPath);
      } catch (err) {
        console.warn('[deleteMediaAsset] Failed to unlink physical file:', err.message);
      }
    }
  }

  await MediaAsset.deleteOne({ _id: id, business_id });
  return { message: 'Xóa ảnh thành công', id };
};

/**
 * Xóa hàng loạt ảnh đã chọn
 */
export const bulkDeleteMediaAssetsService = async (ids, business_id) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Danh sách ID ảnh là bắt buộc');
  }

  const assets = await MediaAsset.find({ _id: { $in: ids }, business_id });

  for (const asset of assets) {
    if (asset.file_path && asset.file_path.startsWith('/uploads/')) {
      const relativePart = asset.file_path.replace('/uploads/', '');
      const physicalPath = path.join(uploadDir, relativePart);
      if (fs.existsSync(physicalPath)) {
        try {
          fs.unlinkSync(physicalPath);
        } catch (err) {
          console.warn('[bulkDeleteMedia] Error deleting physical file:', err.message);
        }
      }
    }
  }

  const result = await MediaAsset.deleteMany({ _id: { $in: ids }, business_id });
  return { deletedCount: result.deletedCount };
};
