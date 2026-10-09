import mongoose from 'mongoose';

const aiConfigSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc'],
      index: true
    },
    channel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      default: null
    },
    bot_name: {
      type: String,
      default: 'AI Assistant',
      trim: true
    },
    model_name: {
      type: String,
      default: 'gemini-1.5-flash',
      trim: true
    },
    ai_persona_tone: {
      type: String,
      enum: ['FRIENDLY', 'PROFESSIONAL', 'POLITE', 'GENZ', 'ENTHUSIASTIC'],
      default: 'FRIENDLY'
    },
    system_prompt: {
      type: String,
      required: [true, 'System prompt là bắt buộc'],
      default: 'Bạn là chuyên viên tư vấn bán hàng thời trang thông minh, nhiệt tình và chu đáo.'
    },
    welcome_message: {
      type: String,
      default: 'Dạ shop xin chào bạn ạ! Bạn đang quan tâm đến mẫu sản phẩm nào để shop hỗ trợ tư vấn ngay cho mình nhé?'
    },
    guardrail_blocklist: {
      type: [String],
      default: ['chửi bậy', 'lừa đảo', 'hoàn tiền gấp', 'hàng giả', 'hàng nhái', 'đối thủ']
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2.0
    },
    max_output_tokens: {
      type: Number,
      default: 1024
    },
    debounce_delay_seconds: {
      type: Number,
      default: 3,
      min: 1,
      max: 30
    },
    auto_order_extraction: {
      type: Boolean,
      default: true
    },
    is_active: {
      type: Boolean,
      default: true
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

aiConfigSchema.index({ business_id: 1, channel_id: 1 }, { unique: true });

export const AIConfig = mongoose.model('AIConfig', aiConfigSchema);
