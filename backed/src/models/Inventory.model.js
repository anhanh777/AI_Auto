import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Sản phẩm là bắt buộc']
    },
    variant_sku: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      enum: ['IMPORT', 'EXPORT', 'ADJUST', 'ORDER_HOLD', 'ORDER_RELEASE']
    },
    quantity: {
      type: Number,
      required: true
    },
    unit_price: {
      type: Number,
      default: 0,
      min: 0
    },
    note: {
      type: String,
      default: ''
    },
    performed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const Inventory = mongoose.model('Inventory', inventorySchema);
