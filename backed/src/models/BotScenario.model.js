import mongoose from 'mongoose';

/**
 * Schema Collection bot_scenarios
 * Quản lý Kịch bản phản hồi tự động theo tin nhắn do chủ Doanh nghiệp tự cấu hình
 */
const botScenarioSchema = new mongoose.Schema(
  {
    // Doanh nghiệp sở hữu kịch bản
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc'],
      index: true
    },
    // Kênh Fanpage áp dụng (null nếu áp dụng cho toàn bộ Fanpage của business)
    channel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      default: null,
      index: true
    },
    // Tên kịch bản (VD: "Tư vấn địa chỉ", "Chính sách đổi trả", "Khuyến mãi Flash Sale")
    scenario_name: {
      type: String,
      required: [true, 'Tên kịch bản là bắt buộc'],
      trim: true
    },
    // Loại điều kiện kích hoạt
    // KEYWORD_CONTAINS: Tin nhắn chứa bất kỳ từ khóa nào
    // KEYWORD_EXACT: Tin nhắn khớp chính xác 100% từ khóa
    // FIRST_MESSAGE: Tin nhắn đầu tiên của khách mở chat
    // HANDOVER_KEYWORD: Từ khóa yêu cầu gặp nhân viên / khiếu nại
    trigger_type: {
      type: String,
      enum: ['KEYWORD_CONTAINS', 'KEYWORD_EXACT', 'FIRST_MESSAGE', 'HANDOVER_KEYWORD'],
      default: 'KEYWORD_CONTAINS'
    },
    // Danh sách từ khóa kích hoạt (VD: ["địa chỉ", "ở đâu", "chi nhánh"])
    keywords: {
      type: [String],
      default: []
    },
    // Hành động khi khớp kịch bản
    // REPLY_TEXT: Gửi tin nhắn trả lời tự động do chủ shop soạn
    // HANDOVER_STAFF: Tắt bot, chuyển giao cho nhân viên trực chat
    // NOTIFY_STAFF: Gửi phản hồi kèm thông báo nội bộ cho nhân viên
    action_type: {
      type: String,
      enum: ['REPLY_TEXT', 'HANDOVER_STAFF', 'NOTIFY_STAFF'],
      default: 'REPLY_TEXT'
    },
    // Nội dung tin nhắn phản hồi tự động
    response_content: {
      type: String,
      default: '',
      trim: true
    },
    // Hình ảnh đính kèm (URL ảnh bảng size, QR thanh toán, ảnh voucher nếu có)
    image_url: {
      type: String,
      default: '',
      trim: true
    },
    // Tự động gắn tag cho khách hàng khi kích hoạt kịch bản này (VD: "Hỏi khuyến mãi", "Cần tư vấn")
    tag_to_add: {
      type: String,
      default: '',
      trim: true
    },
    // Trạng thái kích hoạt (Chủ shop có thể bật/tắt bất kỳ lúc nào)
    is_active: {
      type: Boolean,
      default: true,
      index: true
    },
    // Độ ưu tiên khớp kịch bản (số càng lớn ưu tiên kiểm tra trước)
    priority: {
      type: Number,
      default: 0
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

botScenarioSchema.index({ business_id: 1, is_active: 1, priority: -1 });

export const BotScenario = mongoose.model('BotScenario', botScenarioSchema);
