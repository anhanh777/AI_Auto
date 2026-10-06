import mongoose from 'mongoose';

const aiConfigSchema = new mongoose.Schema(
  {
    model_name: {
      type: String,
      default: 'gemini-1.5-flash',
      trim: true
    },
    system_prompt: {
      type: String,
      required: [true, 'System prompt là bắt buộc']
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
      default: 4,
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

export const AIConfig = mongoose.model('AIConfig', aiConfigSchema);
