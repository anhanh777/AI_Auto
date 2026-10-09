import mongoose from 'mongoose';

/**
 * Schema Collection businesses (Khớp hoàn toàn Bảng 3.23 / Bảng 6 trong Báo cáo Đồ án tốt nghiệp - 15 trường)
 * Quản lý thông tin Doanh nghiệp / Cửa hàng kinh doanh Multi-Tenant
 */
const businessSchema = new mongoose.Schema(
  {
    // 1. Mã định danh duy nhất (MongoDB _id)
    // 2. Tên cửa hàng / thương hiệu kinh doanh
    business_name: {
      type: String,
      required: [true, 'Tên doanh nghiệp là bắt buộc'],
      trim: true
    },
    // 3. Mã định danh viết tắt của cửa hàng (VD: SOULMADE, AISALES_CN2)
    code: {
      type: String,
      required: [true, 'Mã doanh nghiệp là bắt buộc'],
      unique: true,
      trim: true,
      uppercase: true
    },
    // 4. ID tài khoản chủ sở hữu cửa hàng (users._id)
    owner_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 5. Số điện thoại hotline liên hệ của cửa hàng
    hotline: {
      type: String,
      default: '',
      trim: true
    },
    // Hỗ trợ alias phone tương thích ngược
    phone: {
      type: String,
      default: '',
      trim: true
    },
    // 6. Email liên hệ chính của doanh nghiệp
    email: {
      type: String,
      default: '',
      trim: true
    },
    // 7. Địa chỉ trụ sở / kho hàng chính
    address: {
      type: String,
      default: '',
      trim: true
    },
    // 8. Đường dẫn URL hình ảnh Logo đại diện thương hiệu
    logo_url: {
      type: String,
      default: ''
    },
    // 9. API Key riêng biệt cho Google Gemini AI (nếu có)
    gemini_api_key: {
      type: String,
      default: ''
    },
    // 10. Gói dịch vụ sử dụng (FREE, PRO, ENTERPRISE)
    subscription_tier: {
      type: String,
      enum: ['FREE', 'PRO', 'ENTERPRISE'],
      default: 'FREE'
    },
    // 11. Trạng thái hoạt động (ACTIVE, SUSPENDED, EXPIRED, ARCHIVED)
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'ARCHIVED'],
      default: 'ACTIVE'
    },
    is_active: {
      type: Boolean,
      default: true
    },
    // Ngành hàng bổ trợ
    industry: {
      type: String,
      default: 'Bán lẻ - Thời trang & Phụ kiện'
    },
    // 13. Người tạo bản ghi (users._id)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 15. Người cập nhật dữ liệu gần nhất (users._id)
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    // 12. created_at (Thời điểm khởi tạo bản ghi) & 14. updated_at (Thời điểm cập nhật dữ liệu gần nhất)
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Đồng bộ hotline và phone
businessSchema.pre('save', function (next) {
  if (this.hotline && !this.phone) {
    this.phone = this.hotline;
  } else if (this.phone && !this.hotline) {
    this.hotline = this.phone;
  }
  next();
});

export const Business = mongoose.model('Business', businessSchema);
