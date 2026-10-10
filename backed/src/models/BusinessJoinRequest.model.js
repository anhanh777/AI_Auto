import mongoose from 'mongoose';

/**
 * Schema Collection business_join_requests
 * Quản lý Yêu cầu xin gia nhập Business từ nhân sự/thành viên
 */
const businessJoinRequestSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc'],
      index: true
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người dùng gửi yêu cầu là bắt buộc'],
      index: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true
    },
    note: {
      type: String,
      default: ''
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewed_at: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

businessJoinRequestSchema.index({ business_id: 1, user_id: 1, status: 1 });

export const BusinessJoinRequest = mongoose.model('BusinessJoinRequest', businessJoinRequestSchema);
