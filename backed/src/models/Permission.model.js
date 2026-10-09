import mongoose from 'mongoose';

/**
 * Schema Collection permissions (Khớp Bảng 3.25 trong Báo cáo - 9 trường)
 * Danh mục Quyền hạn chi tiết trong hệ thống
 */
const permissionSchema = new mongoose.Schema(
  {
    // 1. _id (PK)
    // 2. Mã quyền chuẩn hóa (MANAGE_PRODUCT, CHAT_TAKEOVER,...)
    permission_code: {
      type: String,
      required: [true, 'Mã quyền là bắt buộc'],
      unique: true,
      trim: true,
      uppercase: true
    },
    // 3. Tên quyền hiển thị trên giao diện
    permission_name: {
      type: String,
      required: [true, 'Tên quyền là bắt buộc'],
      trim: true
    },
    // 4. Nhóm chức năng (CHAT, PRODUCT, ORDER, SETTING)
    module_group: {
      type: String,
      required: [true, 'Nhóm chức năng là bắt buộc'],
      trim: true,
      uppercase: true
    },
    // 5. Mô tả chi tiết hành động được phép thực hiện
    description: {
      type: String,
      default: ''
    },
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

export const Permission = mongoose.model('Permission', permissionSchema);
