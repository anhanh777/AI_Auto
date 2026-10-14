import mongoose from 'mongoose';

/**
 * Schema Collection media_assets
 * Quản lý Kho Tư liệu & Media tập trung của từng Doanh nghiệp (Multi-Tenant)
 * Phục vụ cho Kịch bản Bot, Huấn luyện AI Gemini RAG, LiveChat và Quản lý Sản phẩm
 */
const mediaAssetSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc'],
      index: true
    },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    file_name: {
      type: String,
      required: [true, 'Tên file hoặc tiêu đề ảnh là bắt buộc'],
      trim: true
    },
    original_name: {
      type: String,
      default: '',
      trim: true
    },
    file_url: {
      type: String,
      required: [true, 'Đường dẫn URL ảnh là bắt buộc'],
      trim: true
    },
    file_path: {
      type: String,
      default: '',
      trim: true
    },
    file_size: {
      type: Number,
      default: 0 // bytes
    },
    mimetype: {
      type: String,
      default: 'image/jpeg'
    },
    folder: {
      type: String,
      enum: ['general', 'products', 'bot', 'vouchers', 'size_charts', 'banners', 'feedback'],
      default: 'general',
      index: true
    },
    tags: {
      type: [String],
      default: []
    },
    caption: {
      type: String,
      default: '',
      trim: true
    },
    is_public: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'media_assets'
  }
);

// Tạo index tìm kiếm văn bản và tag
mediaAssetSchema.index({ business_id: 1, folder: 1, created_at: -1 });
mediaAssetSchema.index({ file_name: 'text', caption: 'text', tags: 'text' });

export const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);
