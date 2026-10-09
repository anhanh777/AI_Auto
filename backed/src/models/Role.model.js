import mongoose from 'mongoose';

/**
 * Schema Collection roles (Khớp Bảng 3.24 trong Báo cáo - 9 trường)
 * Vai trò RBAC phân quyền tài khoản theo từng Business
 */
const roleSchema = new mongoose.Schema(
  {
    // 1. _id (PK)
    // 2. Thuộc cửa hàng / doanh nghiệp nào (businesses._id)
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true
    },
    // 3. Tên vai trò phân quyền (ADMIN, STAFF, MANAGER)
    role_name: {
      type: String,
      required: [true, 'Tên vai trò là bắt buộc'],
      trim: true
    },
    // Hỗ trợ alias name
    name: {
      type: String,
      trim: true
    },
    // 4. Mô tả chi tiết phạm vi quyền hạn của vai trò
    description: {
      type: String,
      default: ''
    },
    // 5. Danh sách ID quyền hạn được gán (permissions._id)
    permission_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permission'
    }],
    // Hỗ trợ mảng chuỗi mã quyền permissions
    permissions: [{
      type: String
    }],
    // 7. Người tạo bản ghi (users._id)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 9. Người cập nhật bản ghi (users._id)
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    // 6. created_at & 8. updated_at
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

roleSchema.pre('save', function (next) {
  if (this.role_name && !this.name) this.name = this.role_name;
  if (this.name && !this.role_name) this.role_name = this.name;
  next();
});

export const Role = mongoose.model('Role', roleSchema);
