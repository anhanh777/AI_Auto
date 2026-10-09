import mongoose from 'mongoose';

/**
 * Schema Collection customers (Khớp Bảng 3.28 trong Báo cáo - 14 trường)
 * Quản lý thông tin Khách hàng tương tác và mua hàng của từng Business
 */
const customerSchema = new mongoose.Schema(
  {
    // 1. _id (PK)
    // 2. Thuộc cửa hàng nào (businesses._id)
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc'],
      index: true
    },
    // 3. Page-Scoped ID của khách hàng trên Facebook Messenger
    psid: {
      type: String,
      sparse: true,
      trim: true,
      index: true
    },
    // 4. Họ tên khách hàng (lấy từ Facebook / khách cung cấp)
    full_name: {
      type: String,
      required: [true, 'Tên khách hàng là bắt buộc'],
      trim: true
    },
    // 5. Số điện thoại liên lạc / nhận hàng của khách
    phone_number: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    // 6. Địa chỉ giao hàng mặc định hoặc cập nhật mới nhất
    shipping_address: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    // 7. Đường dẫn ảnh đại diện Facebook khách hàng
    profile_pic_url: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    },
    // 8. Thẻ phân loại khách hàng (VIP, TIEM_NANG, BO_BOM)
    customer_tags: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    // 9. Tổng số đơn hàng khách đã đặt thành công
    total_orders_count: {
      type: Number,
      default: 0
    },
    // 10. Tổng số tiền khách hàng đã chi tiêu tích lũy
    total_spend_amount: {
      type: Number,
      default: 0
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    source: {
      type: String,
      default: 'facebook'
    },
    notes: {
      type: String,
      default: ''
    },
    // 12. Người tạo / hệ thống tạo bản ghi (users._id)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 14. Người cập nhật hồ sơ khách hàng (users._id)
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

customerSchema.pre('save', function (next) {
  if (this.phone_number && !this.phone) this.phone = this.phone_number;
  if (this.phone && !this.phone_number) this.phone_number = this.phone;
  if (this.shipping_address && !this.address) this.address = this.shipping_address;
  if (this.address && !this.shipping_address) this.shipping_address = this.address;
  if (this.profile_pic_url && !this.avatar) this.avatar = this.profile_pic_url;
  if (this.avatar && !this.profile_pic_url) this.profile_pic_url = this.avatar;
  if (this.customer_tags?.length && !this.tags?.length) this.tags = this.customer_tags;
  if (this.tags?.length && !this.customer_tags?.length) this.customer_tags = this.tags;
  next();
});

export const Customer = mongoose.model('Customer', customerSchema);
