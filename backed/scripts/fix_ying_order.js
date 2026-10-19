import mongoose from 'mongoose';
import { createOrderService } from '../src/services/order.service.js';

const ATLAS_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:Admin123456%40@cluster0.0ge6qxs.mongodb.net/ai_sales_consultant?retryWrites=true&w=majority';

async function fixYingOrder() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(ATLAS_URI);
  const db = mongoose.connection.db;

  const custId = new mongoose.Types.ObjectId('6ad625799c29ed529206fef0');
  const convId = new mongoose.Types.ObjectId('6ad625799c29ed529206fef3');
  const businessId = new mongoose.Types.ObjectId('6ac9130194916faf5eac7627');
  const channelId = new mongoose.Types.ObjectId('6acca40f3bd623cc02ff580d');

  // 1. Cập nhật Customer đồng bộ địa chỉ "Hà Nam"
  await db.collection('customers').updateOne(
    { _id: custId },
    {
      $set: {
        shipping_address: 'Hà Nam',
        address: 'Hà Nam',
        phone: '0332156789',
        phone_number: '0332156789'
      }
    }
  );
  console.log('✅ Customer Ying Ying updated with address "Hà Nam"');

  // 2. Tìm sản phẩm AKN-474
  const product = await db.collection('products').findOne({ sku: 'AKN-474' });

  // 3. Tạo đơn hàng qua createOrderService
  const order = await createOrderService(
    {
      business_id: businessId,
      channel_id: channelId,
      conversation_id: convId,
      customer_id: custId,
      customer_name: 'Ying Ying',
      shipping_customer_name: 'Ying Ying',
      customer_phone: '0332156789',
      shipping_phone: '0332156789',
      shipping_address: 'Hà Nam',
      order_items: [
        {
          product_id: product?._id || null,
          variant_sku: 'AKN-474',
          product_name: 'Áo Kiểu Nữ Thêu Hoa Hàn Quốc',
          size: 'M',
          color: 'Trắng',
          quantity: 1,
          unit_price: 200000,
          price: 200000
        }
      ],
      order_status: 'PENDING',
      status: 'PENDING',
      order_source: 'FACEBOOK_AI',
      note: 'Đơn hàng tự động qua AI: "Hà Nam" (Khách chỉ cung cấp khu vực tỉnh/TP, CSKH cần gọi xác nhận số nhà chi tiết)'
    },
    null
  );

  console.log(`✅ Order created successfully: #${order.order_code} (Total: ${order.total_amount}đ)`);

  // 4. Cập nhật Conversation order_draft
  await db.collection('conversations').updateOne(
    { _id: convId },
    {
      $set: {
        'order_draft.status': 'IDLE',
        'order_draft.last_order_id': order._id,
        'order_draft.last_order_code': order.order_code,
        'order_draft.shipping_address': 'Hà Nam',
        followup_status: 'CANCELLED'
      }
    }
  );
  console.log('✅ Conversation updated with order code #' + order.order_code);

  process.exit(0);
}

fixYingOrder().catch((err) => {
  console.error(err);
  process.exit(1);
});
