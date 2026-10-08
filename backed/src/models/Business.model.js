import mongoose from 'mongoose';

/**
 * Schema Collection businesses (Khớp Bảng 3.23 trong Báo cáo)
 * Quản lý thông tin Doanh nghiệp / Cửa hàng kinh doanh
 */
const businessSchema = new mongoose.Schema(
  {
    business_name: {
      type: String,
      required: [true, 'Tên doanh nghiệp là bắt buộc'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Mã doanh nghiệp là bắt buộc'],
      unique: true,
      trim: true,
      uppercase: true
    },
    owner_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    industry: {
      type: String,
      default: 'Thời trang & May mặc'
    },
    logo_url: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    gemini_api_key: {
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

export const Business = mongoose.model('Business', businessSchema);
