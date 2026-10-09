import mongoose from 'mongoose';

/**
 * Schema Collection channels (Khớp Biểu đồ Lớp Class Diagram Báo cáo)
 * Quản lý các Kênh kết nối bán hàng / Chat (Facebook Fanpage, Zalo OA, Website...) của từng Business
 */
const channelSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID là bắt buộc']
    },
    page_id: {
      type: String,
      required: [true, 'ID Kênh / Page ID là bắt buộc'],
      trim: true
    },
    page_name: {
      type: String,
      required: [true, 'Tên Kênh / Page Name là bắt buộc'],
      trim: true
    },
    platform: {
      type: String,
      enum: ['facebook', 'zalo', 'web', 'instagram', 'tiktok'],
      default: 'facebook'
    },
    avatar_url: {
      type: String,
      default: ''
    },
    access_token: {
      type: String,
      default: ''
    },
    webhook_url: {
      type: String,
      default: ''
    },
    operating_mode: {
      type: String,
      enum: ['AI_AUTO', 'HYBRID', 'MANUAL'],
      default: 'AI_AUTO'
    },
    is_active: {
      type: Boolean,
      default: true
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const Channel = mongoose.model('Channel', channelSchema);
export default Channel;
