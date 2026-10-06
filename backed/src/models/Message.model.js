import mongoose from 'mongoose';

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
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Cuộc hội thoại là bắt buộc'],
      index: true
    },
    sender_type: {
      type: String,
      enum: ['CUSTOMER', 'AI_BOT', 'STAFF'],
      required: true
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    is_read: {
      type: Boolean,
      default: false
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

export const Message = mongoose.model('Message', messageSchema);
