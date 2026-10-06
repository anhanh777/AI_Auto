import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên vai trò là bắt buộc'],
      unique: true,
      trim: true,
      enum: ['ADMIN', 'STAFF']
    },
    description: {
      type: String,
      default: ''
    },
    permissions: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const Role = mongoose.model('Role', roleSchema);
