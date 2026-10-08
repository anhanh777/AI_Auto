import mongoose from 'mongoose';

/**
 * Schema Collection products (Khớp Bảng 3.32 trong Báo cáo)
 * Quản lý sản phẩm, biến thể, tồn kho và dữ liệu huấn luyện AI Gemini RAG
 */
const productSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc']
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Danh mục sản phẩm là bắt buộc']
    },
    sku: {
      type: String,
      required: [true, 'Mã SKU sản phẩm là bắt buộc'],
      trim: true,
      uppercase: true
    },
    product_name: {
      type: String,
      required: [true, 'Tên sản phẩm là bắt buộc'],
      trim: true
    },
    slug: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
    },
    base_price: {
      type: Number,
      required: [true, 'Giá bán niêm yết gốc là bắt buộc'],
      min: [0, 'Giá bán không được âm']
    },
    sale_price: {
      type: Number,
      default: null,
      min: [0, 'Giá khuyến mãi không được âm']
    },
    stock_physical: {
      type: Number,
      default: 0,
      min: [0, 'Tồn kho vật lý không được âm']
    },
    stock_available: {
      type: Number,
      default: 0,
      min: [0, 'Tồn kho khả dụng không được âm']
    },
    variants_json: {
      type: [
        {
          size: { type: String, default: '' },
          color: { type: String, default: '' },
          sku_con: { type: String, default: '' },
          stock: { type: Number, default: 0 },
          price: { type: Number, default: 0 }
        }
      ],
      default: []
    },
    ai_selling_points: {
      type: String,
      default: '' // Đặc điểm nổi bật, chất liệu, form dáng, tư vấn size nạp cho AI
    },
    description: {
      type: String,
      default: ''
    },
    image_urls: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'OUT_OF_STOCK', 'HIDDEN'],
      default: 'ACTIVE'
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Index tìm kiếm theo business_id và sku
productSchema.index({ business_id: 1, sku: 1 }, { unique: true });
productSchema.index({ business_id: 1, category_id: 1, status: 1 });

export const Product = mongoose.model('Product', productSchema);
