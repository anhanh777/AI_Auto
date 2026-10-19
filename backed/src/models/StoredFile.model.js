import mongoose from 'mongoose';

/**
 * Schema Collection stored_files
 * Lưu trữ vĩnh viễn tệp đính kèm và hình ảnh trên MongoDB Atlas
 * Đảm bảo hệ thống tự phục hồi file tĩnh (Self-Healing) khi triển khai trên Container Ephemeral (Render)
 */
const storedFileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      index: true
    },
    folder: {
      type: String,
      default: 'general',
      index: true
    },
    mimetype: {
      type: String,
      default: 'image/jpeg'
    },
    size: {
      type: Number,
      default: 0
    },
    data: {
      type: Buffer,
      required: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

storedFileSchema.index({ folder: 1, filename: 1 }, { unique: true });

export const StoredFile = mongoose.models.StoredFile || mongoose.model('StoredFile', storedFileSchema);
