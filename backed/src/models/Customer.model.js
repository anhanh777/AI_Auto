import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc'],
      index: true
    },
    psid: {
      type: String,
      sparse: true,
      trim: true,
      index: true
    },
    full_name: {
      type: String,
      required: [true, 'Tên khách hàng là bắt buộc'],
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    },
    source: {
      type: String,
      enum: ['facebook', 'web', 'manual'],
      default: 'facebook'
    },
    tags: {
      type: [String],
      default: []
    },
    total_orders_count: {
      type: Number,
      default: 0
    },
    total_spend_amount: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      default: ''
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

customerSchema.index({ business_id: 1, psid: 1 });
customerSchema.index({ business_id: 1, phone: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
