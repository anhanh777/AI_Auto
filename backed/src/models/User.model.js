import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Schema Collection users (Khớp Bảng 3.26 trong Báo cáo - 14 trường)
 * Tài khoản Người dùng / Nhân viên trong hệ thống Multi-Tenant
 */
const userSchema = new mongoose.Schema(
  {
    // 1. _id (PK)
    // 2. Mảng danh sách ID các Cửa hàng/Doanh nghiệp mà tài khoản trực thuộc hoặc quản lý
    business_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    }],
    // 3. Vai trò phân quyền của người dùng (roles._id)
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Vai trò người dùng là bắt buộc']
    },
    // 4. Họ và tên đầy đủ của người dùng / nhân viên
    full_name: {
      type: String,
      required: [true, 'Họ và tên là bắt buộc'],
      trim: true
    },
    // 5. Email đăng nhập hệ thống
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true
    },
    // 6. Mật khẩu được mã hóa an toàn theo thuật toán Bcrypt
    password_hash: {
      type: String,
      default: ''
    },
    password: {
      type: String,
      minlength: [6, 'Mật khẩu phải từ 6 ký tự trở lên']
    },
    // 7. Số điện thoại liên hệ cá nhân
    phone_number: {
      type: String,
      default: '',
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    // 8. Đường dẫn ảnh đại diện người dùng
    avatar_url: {
      type: String,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    },
    // 9. Trạng thái tài khoản (ACTIVE, INACTIVE, LOCKED)
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
      default: 'ACTIVE'
    },
    is_active: {
      type: Boolean,
      default: true
    },
    // 10. Thời điểm đăng nhập hệ thống gần nhất
    last_login_at: {
      type: Date,
      default: null
    },
    username: {
      type: String,
      trim: true,
      lowercase: true
    },
    custom_permissions: {
      type: [String],
      default: []
    },
    // 12. Người tạo tài khoản (users._id)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 14. Người cập nhật tài khoản (users._id)
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

// Đồng bộ các trường alias trước khi lưu
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password, salt);
    this.password = this.password_hash;
  }
  if (this.phone_number && !this.phone) this.phone = this.phone_number;
  if (this.phone && !this.phone_number) this.phone_number = this.phone;
  if (this.avatar_url && !this.avatar) this.avatar = this.avatar_url;
  if (this.avatar && !this.avatar_url) this.avatar_url = this.avatar;
  if (this.status) this.is_active = this.status === 'ACTIVE';
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  const hash = this.password_hash || this.password;
  if (!hash) return false;
  return await bcrypt.compare(candidatePassword, hash);
};

export const User = mongoose.model('User', userSchema);
