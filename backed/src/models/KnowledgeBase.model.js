import mongoose from 'mongoose';

const knowledgeBaseSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề tài liệu tri thức là bắt buộc'],
      trim: true
    },
    category: {
      type: String,
      enum: ['SHIPPING', 'RETURN_POLICY', 'SIZE_GUIDE', 'PROMOTION', 'FAQ', 'GENERAL'],
      default: 'GENERAL'
    },
    content: {
      type: String,
      required: [true, 'Nội dung tài liệu tri thức là bắt buộc']
    },
    keywords: {
      type: [String],
      default: []
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

knowledgeBaseSchema.index({ business_id: 1, category: 1 });

export const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
