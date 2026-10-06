import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Khách hàng là bắt buộc'],
      index: true
    },
    channel: {
      type: String,
      enum: ['facebook_messenger', 'web_livechat'],
      default: 'facebook_messenger'
    },
    external_channel_id: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    is_bot_active: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['OPEN', 'RESOLVED', 'PENDING_STAFF'],
      default: 'OPEN'
    },
    last_message_text: {
      type: String,
      default: ''
    },
    last_message_at: {
      type: Date,
      default: Date.now
    },
    unread_count: {
      type: Number,
      default: 0,
      min: 0
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const Conversation = mongoose.model('Conversation', conversationSchema);
