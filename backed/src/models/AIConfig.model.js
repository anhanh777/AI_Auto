import mongoose from 'mongoose';

/**
 * Schema Collection bot_configs (Khớp Bảng 3.33 trong Báo cáo - 14 trường)
 * Cấu hình Trợ lý ảo AI Bán hàng (Google Gemini & RAG)
 */
const aiConfigSchema = new mongoose.Schema(
  {
    // 1. _id (PK)
    // 2. Thuộc cửa hàng / doanh nghiệp nào (businesses._id)
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc'],
      index: true
    },
    // 3. Áp dụng riêng cho kênh nào (channels._id, null nếu toàn bộ)
    channel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      default: null,
      index: true
    },
    // 4. Tên định danh của trợ lý ảo AI
    bot_name: {
      type: String,
      default: 'AI Assistant',
      trim: true
    },
    // 5. Giọng điệu tư vấn (FRIENDLY, PROFESSIONAL, POLITE, GENZ)
    ai_persona_tone: {
      type: String,
      enum: ['FRIENDLY', 'PROFESSIONAL', 'POLITE', 'GENZ', 'ENTHUSIASTIC'],
      default: 'FRIENDLY'
    },
    // 6. Prompt chỉ thị gốc định hình phong cách và nguyên tắc bán hàng
    system_prompt: {
      type: String,
      required: [true, 'System prompt là bắt buộc'],
      default: 'Bạn là chuyên viên tư vấn bán hàng thời trang thông minh, nhiệt tình và chu đáo.'
    },
    // 7. Lời chào tự động gửi khi khách mở hộp thoại chat
    welcome_message: {
      type: String,
      default: 'Dạ shop xin chào bạn ạ! Bạn đang quan tâm đến mẫu sản phẩm nào để shop hỗ trợ tư vấn ngay cho mình nhé?'
    },
    // 8. Danh sách từ khóa cấm, chủ đề nhạy cảm ngăn AI trả lời
    guardrail_blocklist: {
      type: [String],
      default: ['chửi bậy', 'lừa đảo', 'hoàn tiền gấp', 'hàng giả', 'hàng nhái', 'đối thủ']
    },
    // 9. Thời gian trễ giả lập gõ phím tự nhiên (giây)
    smart_delay_seconds: {
      type: Number,
      default: 3,
      min: 1,
      max: 30
    },
    debounce_delay_seconds: {
      type: Number,
      default: 3
    },
    // 10. Bật/tắt tính năng trích xuất đơn hàng tự động từ chat
    auto_order_detect: {
      type: Boolean,
      default: true
    },
    auto_order_extraction: {
      type: Boolean,
      default: true
    },
    model_name: {
      type: String,
      default: 'gemini-1.5-flash',
      trim: true
    },
    temperature: {
      type: Number,
      default: 0.7
    },
    max_output_tokens: {
      type: Number,
      default: 1024
    },
    is_active: {
      type: Boolean,
      default: true
    },
    // 12. Người tạo cấu hình (users._id)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 14. Người cập nhật cấu hình (users._id)
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

aiConfigSchema.pre('save', function (next) {
  if (this.smart_delay_seconds && !this.debounce_delay_seconds) this.debounce_delay_seconds = this.smart_delay_seconds;
  if (this.debounce_delay_seconds && !this.smart_delay_seconds) this.smart_delay_seconds = this.debounce_delay_seconds;
  if (this.auto_order_detect !== undefined && this.auto_order_extraction === undefined) this.auto_order_extraction = this.auto_order_detect;
  if (this.auto_order_extraction !== undefined && this.auto_order_detect === undefined) this.auto_order_detect = this.auto_order_extraction;
  next();
});

export const AIConfig = mongoose.model('AIConfig', aiConfigSchema);
