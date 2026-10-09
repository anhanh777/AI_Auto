import mongoose from 'mongoose';

/**
 * Schema Collection orders (Khớp Bảng 3.34 trong Báo cáo - 22 trường)
 * Quản lý Đơn hàng Bán lẻ & Trích xuất tự động từ AI Chatbot
 */
const orderSchema = new mongoose.Schema(
  {
    // 1. _id (PK)
    // 2. Mã hiển thị đơn hàng (ví dụ: #DH_83921)
    order_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    // 3. Thuộc cửa hàng / doanh nghiệp nào (businesses._id)
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Doanh nghiệp là bắt buộc'],
      index: true
    },
    // 4. Khách hàng đặt mua (customers._id)
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Khách hàng là bắt buộc']
    },
    // 5. Phiên chat phát sinh đơn hàng (conversations._id)
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
      index: true
    },
    // 6. Danh sách sản phẩm gồm product_id, sku, name, quantity, price
    order_items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        },
        product_name: String,
        name: String,
        sku: String,
        quantity: {
          type: Number,
          default: 1,
          min: 1
        },
        unit_price: Number,
        price: Number,
        total_price: Number
      }
    ],
    // 7. Tổng tiền hàng tạm tính trước giảm giá (VND)
    subtotal_amount: {
      type: Number,
      default: 0
    },
    // 8. Phí vận chuyển giao hàng (VND)
    shipping_fee: {
      type: Number,
      default: 0.00
    },
    // 9. Số tiền chiết khấu giảm giá (VND)
    discount_amount: {
      type: Number,
      default: 0.00
    },
    // 10. Tổng giá trị thanh toán cuối cùng của đơn hàng (VND)
    total_amount: {
      type: Number,
      required: true,
      default: 0
    },
    // 11. Họ và tên người nhận hàng
    shipping_customer_name: {
      type: String,
      default: '',
      trim: true
    },
    customer_name: {
      type: String,
      default: '',
      trim: true
    },
    // 12. Số điện thoại liên lạc người nhận hàng
    shipping_phone: {
      type: String,
      default: '',
      trim: true
    },
    customer_phone: {
      type: String,
      default: '',
      trim: true
    },
    // 13. Địa chỉ giao hàng chi tiết
    shipping_address: {
      type: String,
      default: '',
      trim: true
    },
    // 14. Trạng thái đơn (PENDING, CONFIRMED, SHIPPING, DELIVERED, CANCELLED, COMPLETED)
    order_status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    status: {
      type: String,
      default: 'PENDING'
    },
    // 15. Phương thức thanh toán (COD, BANK_TRANSFER)
    payment_method: {
      type: String,
      enum: ['COD', 'BANK_TRANSFER', 'MOMO', 'VNPAY', 'CASH'],
      default: 'COD'
    },
    // 16. Trạng thái thanh toán (UNPAID, PAID, REFUNDED)
    payment_status: {
      type: String,
      enum: ['UNPAID', 'PAID', 'REFUNDED'],
      default: 'UNPAID'
    },
    // 17. Cờ đánh dấu đơn hàng do AI tự động trích xuất từ chat
    extracted_by_ai: {
      type: Boolean,
      default: true
    },
    // 18. Ghi chú giao hàng hoặc dặn dò đặc biệt
    notes: {
      type: String,
      default: ''
    },
    source: {
      type: String,
      default: 'ai_chat'
    },
    created_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 20. Người tạo / AI Engine tạo (users._id)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // 22. Người cập nhật đơn hàng (users._id)
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    // 19. created_at & 21. updated_at
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

orderSchema.pre('save', function (next) {
  if (this.shipping_customer_name && !this.customer_name) this.customer_name = this.shipping_customer_name;
  if (this.customer_name && !this.shipping_customer_name) this.shipping_customer_name = this.customer_name;
  if (this.shipping_phone && !this.customer_phone) this.customer_phone = this.shipping_phone;
  if (this.customer_phone && !this.shipping_phone) this.shipping_phone = this.customer_phone;
  if (this.order_status && !this.status) this.status = this.order_status;
  if (this.status && !this.order_status) this.order_status = this.status;
  next();
});

export const Order = mongoose.model('Order', orderSchema);
