import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    psid: {
      type: String,
      unique: true,
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
    source: {
      type: String,
      enum: ['facebook', 'web', 'manual'],
      default: 'facebook'
    },
    tags: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const Customer = mongoose.model('Customer', customerSchema);
