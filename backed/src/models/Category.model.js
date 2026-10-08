import mongoose from 'mongoose';

/**
 * Schema Collection categories (Khớp Bảng 3.31 trong Báo cáo)
 * Quản lý danh mục sản phẩm theo từng doanh nghiệp
 */
const categorySchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc']
    },
    category_name: {
      type: String,
      required: [true, 'Tên danh mục là bắt buộc'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Slug danh mục là bắt buộc'],
      trim: true,
      lowercase: true
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    description: {
      type: String,
      default: ''
    },
    image_url: {
      type: String,
      default: ''
    },
    is_active: {
      type: Boolean,
      default: true
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Index tìm kiếm theo business_id và slug
categorySchema.index({ business_id: 1, slug: 1 }, { unique: true });

export const Category = mongoose.model('Category', categorySchema);
