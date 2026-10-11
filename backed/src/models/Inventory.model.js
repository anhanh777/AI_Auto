import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc'],
      index: true
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Sản phẩm là bắt buộc'],
      index: true
    },
    variant_sku: {
      type: String,
      default: '',
      trim: true
    },
    type: {
      type: String,
      required: true,
      enum: ['IMPORT', 'EXPORT', 'ADJUST', 'CREATE', 'UPDATE', 'ORDER_HOLD', 'ORDER_RELEASE']
    },
    quantity: {
      type: Number,
      required: true,
      default: 0
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

inventorySchema.index({ business_id: 1, created_at: -1 });
inventorySchema.index({ business_id: 1, product_id: 1, created_at: -1 });

export const Inventory = mongoose.model('Inventory', inventorySchema);
