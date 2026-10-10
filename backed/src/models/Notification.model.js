import mongoose from 'mongoose';

/**
 * Schema Collection notifications
 * Quản lý thông báo người dùng và chuông cảnh báo hệ thống
 */
const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người nhận thông báo là bắt buộc'],
      index: true
    },
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề thông báo là bắt buộc'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Nội dung thông báo là bắt buộc'],
      trim: true
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'join_request'],
      default: 'info'
    },
    link: {
      type: String,
      default: null
    },
    is_read: {
      type: Boolean,
      default: false,
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const Notification = mongoose.model('Notification', notificationSchema);
