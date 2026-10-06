import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: String,
    trim: true,
    default: ''
  },
  color: {
    type: String,
    trim: true,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  in_stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Danh mục sản phẩm là bắt buộc']
    },
    sku: {
      type: String,
      required: [true, 'Mã SKU sản phẩm là bắt buộc'],
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Tên sản phẩm là bắt buộc'],
      trim: true,
      index: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    base_price: {
      type: Number,
      required: [true, 'Giá niêm yết là bắt buộc'],
      min: 0
    },
    sale_price: {
      type: Number,
      default: null,
      min: 0
    },
    images: {
      type: [String],
      default: []
    },
    variants: {
      type: [variantSchema],
      default: []
    },
    total_stock: {
      type: Number,
      default: 0,
      min: 0
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const Product = mongoose.model('Product', productSchema);
