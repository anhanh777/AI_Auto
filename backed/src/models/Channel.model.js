import mongoose from 'mongoose';

/**
 * Schema Collection channels (Khớp Bảng 3.27 trong Báo cáo - 14 trường)
 * Quản lý các Kênh Facebook Fanpage kết nối bán hàng của từng Business
 */
const channelSchema = new mongoose.Schema(
  {
    // 1. _id (PK)
    // 2. Thuộc cửa hàng / doanh nghiệp nào (businesses._id)
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID là bắt buộc'],
      index: true
    },
    // 3. ID định danh Fanpage do Meta cấp (Facebook Page ID)
    page_id: {
      type: String,
      required: [true, 'ID Kênh / Page ID là bắt buộc'],
      trim: true
    },
    // 4. Tên hiển thị công khai của Fanpage Facebook
    page_name: {
      type: String,
      required: [true, 'Tên Kênh / Page Name là bắt buộc'],
      trim: true
    },
    // 5. Nền tảng mạng xã hội kết nối (mặc định 'facebook')
    platform: {
      type: String,
      default: 'facebook'
    },
    // 6. Đường dẫn ảnh đại diện Logo của Fanpage Facebook
    avatar_url: {
      type: String,
      default: ''
    },
    // 7. Token cấp quyền truy cập quản lý tin nhắn Fanpage
    page_access_token: {
      type: String,
      default: ''
    },
    access_token: {
      type: String,
      default: ''
    },
    // 8. Mã bảo mật xác thực Webhook kết nối từ Meta Developers
    webhook_verify_token: {
      type: String,
      default: 'ai_sales_secret_verify_token'
    },
    webhook_url: {
      type: String,
      default: ''
    },
    // 9. Chế độ vận hành xử lý (AI_FIRST, MANUAL_FIRST, HYBRID, AI_AUTO)
    operating_mode: {
      type: String,
      enum: ['AI_FIRST', 'MANUAL_FIRST', 'HYBRID', 'AI_AUTO', 'MANUAL'],
      default: 'AI_FIRST'
    },
    // 10. Trạng thái kênh đang kết nối đồng bộ dữ liệu
    is_connected: {
      type: Boolean,
      default: true
    },
    is_active: {
      type: Boolean,
      default: true
    },
    // 12. Người thực hiện kết nối (users._id)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 14. Người cập nhật trạng thái gần nhất (users._id)
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    // 11. created_at & 13. updated_at
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

channelSchema.pre('save', function (next) {
  if (this.page_access_token && !this.access_token) this.access_token = this.page_access_token;
  if (this.access_token && !this.page_access_token) this.page_access_token = this.access_token;
  if (this.is_connected !== undefined) this.is_active = this.is_connected;
  next();
});

export const Channel = mongoose.model('Channel', channelSchema);
