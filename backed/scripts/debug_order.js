import mongoose from 'mongoose';
import { evaluateAddressQuality, validateAndSanitizePhone } from '../src/helpers/orderValidation.helper.js';

const uri = 'mongodb+srv://admin:Admin123456%40@cluster0.0ge6qxs.mongodb.net/ai_sales_consultant?retryWrites=true&w=majority';

async function test() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const conv = await db.collection('conversations').findOne({ _id: new mongoose.Types.ObjectId('6ad625799c29ed529206fef3') });
  const cust = await db.collection('customers').findOne({ _id: conv.customer_id });

  console.log('Customer shipping_address:', cust.shipping_address);
  console.log('Customer address:', cust.address);
  console.log('Order Draft in Conv:', conv.order_draft);

  // Test address validation:
  console.log('Address check "Hà nam":', evaluateAddressQuality('Hà nam'));
  console.log('Address check "Hà Nam":', evaluateAddressQuality('Hà Nam'));
  console.log('Address check "đổi địa chỉ Hà nam":', evaluateAddressQuality('đổi địa chỉ Hà nam'));
  console.log('Address check "hà nội":', evaluateAddressQuality('hà nội'));

  process.exit(0);
}

test();
