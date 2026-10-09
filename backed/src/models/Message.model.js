import mongoose from 'mongoose';

/**
 * Schema Collection messages (Khớp Bảng 3.30 trong Báo cáo - 14 trường)
 * Chi tiết Tin nhắn trao đổi giữa Khách hàng, Trợ lý AI và Nhân viên
 */
const attachmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'file', 'audio', 'video'],
    default: 'image'
  },
  url: {
    type: String,
    required: true
  }
}, { _id: false });

const messageSchema = new mongoose.Schema(
  {
    // 1. _id (PK)
    // 2. Thuộc phiên hội thoại nào (conversations._id)
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Cuộc hội thoại là bắt buộc'],
      index: true
    },
    // 3. Đối tượng gửi tin nhắn (CUSTOMER, AI_BOT, STAFF)
    sender_type: {
      type: String,
      enum: ['CUSTOMER', 'AI_BOT', 'STAFF'],
      required: true
    },
    // 4. ID định danh người gửi (PSID khách hoặc User ID nhân viên)
    sender_id: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    // 5. Loại tin nhắn (TEXT, IMAGE, BUTTON_TEMPLATE, ORDER_CARD)
    message_type: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'BUTTON_TEMPLATE', 'ORDER_CARD', 'file', 'audio', 'video'],
      default: 'TEXT'
    },
    type: {
      type: String,
      default: 'TEXT'
    },
    // 6. Nội dung văn bản của tin nhắn
    content: {
      type: String,
      required: true,
      trim: true
    },
    // 7. Đường dẫn hình ảnh hoặc tệp đính kèm trong tin nhắn
    attachment_url: {
      type: String,
      default: ''
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    // 8. Thời gian AI xử lý và phản hồi tin nhắn (mili-giây)
    ai_latency_ms: {
      type: Number,
      default: null
    },
    // 9. Ý định của khách hàng do AI nhận diện (ASK_PRICE, BUY,...)
    ai_intent_detected: {
      type: String,
      default: null
    },
    // 10. Trạng thái nhân viên đã đọc tin nhắn
    is_read: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // 12. Người tạo bản ghi (users._id)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 14. Người cập nhật tin nhắn (users._id)
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

messageSchema.pre('save', function (next) {
  if (this.message_type && !this.type) this.type = this.message_type;
  if (this.type && !this.message_type) this.message_type = this.type;
  if (this.attachment_url && this.attachments.length === 0) {
    this.attachments.push({ type: 'image', url: this.attachment_url });
  } else if (this.attachments.length > 0 && !this.attachment_url) {
    this.attachment_url = this.attachments[0].url;
  }
  next();
});

export const Message = mongoose.model('Message', messageSchema);
