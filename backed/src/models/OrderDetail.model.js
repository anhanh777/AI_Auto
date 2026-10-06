import mongoose from 'mongoose';

const orderDetailSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Đơn hàng là bắt buộc'],
      index: true
    },
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
    product_name: {
      type: String,
      required: true,
      trim: true
    },
    variant_info: {
      type: String,
      default: '',
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0
    },
    total_price: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const OrderDetail = mongoose.model('OrderDetail', orderDetailSchema);
