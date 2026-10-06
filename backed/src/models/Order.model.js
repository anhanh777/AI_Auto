import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    order_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Khách hàng là bắt buộc']
    },
    created_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    source: {
      type: String,
      enum: ['ai_chat', 'staff_manual', 'web'],
      default: 'ai_chat'
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    customer_name: {
      type: String,
      required: true,
      trim: true
    },
    customer_phone: {
      type: String,
      required: true,
      trim: true
    },
    shipping_address: {
      type: String,
      required: true,
      trim: true
    },
    subtotal_amount: {
      type: Number,
      required: true,
      min: 0
    },
    discount_amount: {
      type: Number,
      default: 0,
      min: 0
    },
    shipping_fee: {
      type: Number,
      default: 0,
      min: 0
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0
    },
    payment_method: {
      type: String,
      enum: ['COD', 'BANKING'],
      default: 'COD'
    },
    payment_status: {
      type: String,
      enum: ['UNPAID', 'PAID'],
      default: 'UNPAID'
    },
    notes: {
      type: String,
      default: ''
    },
    extracted_from_conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const Order = mongoose.model('Order', orderSchema);
