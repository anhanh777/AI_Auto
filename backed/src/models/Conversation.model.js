import mongoose from 'mongoose';

/**
 * Schema Collection conversations (Khớp Bảng 3.29 trong Báo cáo - 15 trường)
 * Quản lý các Phiên hội thoại Messenger & LiveChat của từng Business
 */
const conversationSchema = new mongoose.Schema(
  {
    // 1. _id (PK)
    // 2. Thuộc cửa hàng / doanh nghiệp nào (businesses._id)
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      index: true
    },
    // 3. Hội thoại diễn ra trên kênh Fanpage nào (channels._id)
    channel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      index: true
    },
    // 4. Khách hàng tham gia trò chuyện (customers._id)
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Khách hàng là bắt buộc'],
      index: true
    },
    // 5. Danh sách nhãn phân loại hội thoại (VD: 'Sp/L\'vento', 'Hot MKT')
    tags: {
      type: [String],
      default: []
    },
    // 6. Trạng thái AI tự động trả lời (True: AI trực, False: Đã tiếp quản)
    is_bot_active: {
      type: Boolean,
      default: true
    },
    // 7. Nhân viên trực tiếp tiếp quản hỗ trợ (users._id)
    assigned_staff_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 8. Tóm tắt nội dung văn bản tin nhắn gần nhất
    last_message_content: {
      type: String,
      default: ''
    },
    last_message_text: {
      type: String,
      default: ''
    },
    // 9. Thời điểm phát sinh tin nhắn mới nhất
    last_message_at: {
      type: Date,
      default: Date.now
    },
    // 10. Số lượng tin nhắn khách gửi chưa được nhân viên đọc
    unread_count: {
      type: Number,
      default: 0,
      min: 0
    },
    // 11. Trạng thái hội thoại (ACTIVE, RESOLVED, ARCHIVED, SPAM, OPEN)
    conversation_status: {
      type: String,
      enum: ['ACTIVE', 'OPEN', 'RESOLVED', 'ARCHIVED', 'SPAM', 'PENDING_STAFF'],
      default: 'ACTIVE'
    },
    status: {
      type: String,
      default: 'ACTIVE'
    },
    channel: {
      type: String,
      default: 'facebook_messenger'
    },
    external_channel_id: {
      type: String,
      sparse: true,
      trim: true
    },
    // 13. Người khởi tạo phiên chat (users._id hoặc Hệ thống)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 15. Người cập nhật trạng thái gần nhất (users._id)
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    // 12. created_at & 14. updated_at
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

conversationSchema.pre('save', function (next) {
  if (this.assigned_staff_id && !this.assigned_to) this.assigned_to = this.assigned_staff_id;
  if (this.assigned_to && !this.assigned_staff_id) this.assigned_staff_id = this.assigned_to;
  if (this.last_message_content && !this.last_message_text) this.last_message_text = this.last_message_content;
  if (this.last_message_text && !this.last_message_content) this.last_message_content = this.last_message_text;
  if (this.conversation_status && !this.status) this.status = this.conversation_status;
  if (this.status && !this.conversation_status) this.conversation_status = this.status;
  next();
});

export const Conversation = mongoose.model('Conversation', conversationSchema);
