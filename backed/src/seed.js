import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import {
  Role,
  User,
  Category,
  Product,
  Inventory,
  AIConfig,
  KnowledgeBase,
  Customer,
  Conversation,
  Message
} from './models/index.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_sales_consultant';

const seedDatabase = async () => {
  try {
    console.log('[Seeder] Đang kết nối tới MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Seeder] Kết nối MongoDB thành công!');

    // 1. Xóa dữ liệu cũ để tránh trùng lặp
    console.log('[Seeder] Đang làm sạch dữ liệu cũ...');
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Inventory.deleteMany({}),
      AIConfig.deleteMany({}),
      KnowledgeBase.deleteMany({}),
      Customer.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({})
    ]);

    // 2. Nạp Bảng Roles (Vai trò người dùng)
    console.log('[Seeder] 1/7. Đang tạo Roles (ADMIN, STAFF)...');
    const adminRole = await Role.create({
      name: 'ADMIN',
      description: 'Quản trị viên toàn quyền hệ thống',
      permissions: ['ALL']
    });

    const staffRole = await Role.create({
      name: 'STAFF',
      description: 'Nhân viên tư vấn bán hàng trực tiếp',
      permissions: ['CHAT_MANAGEMENT', 'ORDER_MANAGEMENT', 'PRODUCT_VIEW']
    });

    // 3. Nạp Bảng Users (Tài khoản quản trị & nhân viên)
    console.log('[Seeder] 2/7. Đang tạo Users mẫu...');
    const adminUser = await User.create({
      role_id: adminRole._id,
      username: 'admin',
      password: 'admin123',
      full_name: 'Anh Trần',
      email: 'trananhhunter02@gmail.com',
      phone: '0901234567',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      custom_permissions: ['ALL'],
      is_active: true
    });

    const user2 = await User.create({
      role_id: adminRole._id,
      username: 'lebinh',
      password: '123456',
      full_name: 'Lê Bình BM A',
      email: 'lebinh080122@gmail.com',
      phone: '0912345678',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      custom_permissions: ['ALL'],
      is_active: true
    });

    const user3 = await User.create({
      role_id: adminRole._id,
      username: 'vuhuong',
      password: '123456',
      full_name: 'Vũ Thị Hường Agency',
      email: 'wilford.parten93722@hotmail.com',
      phone: '0988776655',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      custom_permissions: ['ALL'],
      is_active: true
    });

    const user4 = await User.create({
      role_id: adminRole._id,
      username: 'hongngoc',
      password: '123456',
      full_name: 'Hồng Ngọc Agency',
      email: '162978140914106@facebook.com',
      phone: '0977665544',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      custom_permissions: ['ALL'],
      is_active: true
    });

    // 4. Nạp Bảng Categories (Danh mục sản phẩm)
    console.log('[Seeder] 3/7. Đang tạo Categories...');
    const catTshirt = await Category.create({
      name: 'Áo Thun & Polo',
      slug: 'ao-thun-polo',
      description: 'Các mẫu áo thun cotton, áo polo trẻ trung và năng động',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500'
    });

    const catJeans = await Category.create({
      name: 'Quần Jean & Kaki',
      slug: 'quan-jean-kaki',
      description: 'Quần jean baggy, ống rộng và quần short thoáng mát',
      image: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500'
    });

    const catAccessories = await Category.create({
      name: 'Phụ Kiện Thời Trang',
      slug: 'phu-kien-thoi-trang',
      description: 'Mũ lưỡi trai, túi tote vải canvas và thắt lưng',
      image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500'
    });

    // 5. Nạp Bảng Products (Sản phẩm & biến thể Size/Màu sắc)
    console.log('[Seeder] 4/7. Đang tạo Products & Tồn kho ban đầu...');
    const prod1 = await Product.create({
      category_id: catTshirt._id,
      sku: 'AT-COTTON-01',
      name: 'Áo Thun Cotton Oversize Dáng Rộng Hàn Quốc',
      slug: 'ao-thun-cotton-oversize-dang-rong-han-quoc',
      description: 'Chất liệu 100% Cotton 2 chiều dày dặn 250gsm, co giãn thoáng mát, thấm hút mồ hôi tốt, không xù lông.',
      base_price: 250000,
      sale_price: 199000,
      images: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800'
      ],
      variants: [
        { sku: 'AT-COTTON-01-W-M', size: 'M', color: 'Trắng', price: 199000, in_stock: 30 },
        { sku: 'AT-COTTON-01-W-L', size: 'L', color: 'Trắng', price: 199000, in_stock: 25 },
        { sku: 'AT-COTTON-01-B-M', size: 'M', color: 'Đen', price: 199000, in_stock: 40 },
        { sku: 'AT-COTTON-01-B-L', size: 'L', color: 'Đen', price: 199000, in_stock: 35 }
      ],
      total_stock: 130
    });

    const prod2 = await Product.create({
      category_id: catTshirt._id,
      sku: 'AP-POLO-02',
      name: 'Áo Polo Nam Cổ Bẻ Vải Cá Sấu Cao Cấp',
      slug: 'ao-polo-nam-co-be-vai-ca-sau-cao-cap',
      description: 'Chất vải Pique cá sấu mắt chim thoáng khí, form slim-fit tôn dáng, phù hợp đi làm và đi chơi.',
      base_price: 320000,
      sale_price: 259000,
      images: [
        'https://images.unsplash.com/photo-1625910513413-7e452a87df2e?w=800'
      ],
      variants: [
        { sku: 'AP-POLO-02-NV-L', size: 'L', color: 'Xanh Navy', price: 259000, in_stock: 20 },
        { sku: 'AP-POLO-02-NV-XL', size: 'XL', color: 'Xanh Navy', price: 259000, in_stock: 25 },
        { sku: 'AP-POLO-02-W-L', size: 'L', color: 'Trắng', price: 259000, in_stock: 30 }
      ],
      total_stock: 75
    });

    const prod3 = await Product.create({
      category_id: catJeans._id,
      sku: 'QJ-BAGGY-01',
      name: 'Quần Jean Baggy Unisex Ống Suông Rộng Rãi',
      slug: 'quan-jean-baggy-unisex-ong-suong-rong-rai',
      description: 'Chất denim cotton dày dặn, giặt wash không phai màu, form chuẩn trẻ trung cá tính.',
      base_price: 450000,
      sale_price: 380000,
      images: [
        'https://images.unsplash.com/photo-1542272604-780c96856592?w=800'
      ],
      variants: [
        { sku: 'QJ-BAGGY-01-LB-29', size: '29', color: 'Xanh Nhạt', price: 380000, in_stock: 20 },
        { sku: 'QJ-BAGGY-01-LB-30', size: '30', color: 'Xanh Nhạt', price: 380000, in_stock: 25 },
        { sku: 'QJ-BAGGY-01-BL-30', size: '30', color: 'Đen Khói', price: 380000, in_stock: 20 }
      ],
      total_stock: 65
    });

    const prod4 = await Product.create({
      category_id: catAccessories._id,
      sku: 'PK-TOTE-01',
      name: 'Túi Tote Vải Canvas Đựng Vừa Laptop 15.6 inch',
      slug: 'tui-tote-vai-canvas-dung-vua-laptop',
      description: 'Vải Canvas mộc bảo vệ môi trường, có khóa kéo miệng và ngăn nhỏ đựng ví/điện thoại tiện lợi.',
      base_price: 180000,
      sale_price: 139000,
      images: [
        'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800'
      ],
      variants: [
        { sku: 'PK-TOTE-01-CRM', size: 'Freesize', color: 'Trắng Kem', price: 139000, in_stock: 50 },
        { sku: 'PK-TOTE-01-BLK', size: 'Freesize', color: 'Đen', price: 139000, in_stock: 50 }
      ],
      total_stock: 100
    });

    // 6. Nạp Bảng AIConfig (Cấu hình Prompt AI mẫu)
    console.log('[Seeder] 5/7. Đang tạo Cấu hình AI (AIConfig)...');
    await AIConfig.create({
      model_name: 'gemini-1.5-flash',
      system_prompt: `Bạn là trợ lý ảo AI tư vấn bán hàng trực tuyến thông minh, nhiệt tình và chuyên nghiệp của cửa hàng thời trang AI Sales Store.

NHIỆM VỤ CỦA BẠN:
1. Chào hỏi khách hàng lễ phép, thân thiện (xưng "Dạ em chào anh/chị ạ", "Dạ shop em chào bạn").
2. Tư vấn sản phẩm chính xác dựa trên danh mục sản phẩm, màu sắc, kích cỡ và giá tiền hiện có của cửa hàng.
3. Giải đáp các thắc mắc về chính sách đổi trả, phí ship, thời gian giao hàng theo đúng thông tin cửa hàng cung cấp.
4. Khi khách hàng đồng ý mua hàng và cung cấp thông tin (Họ tên, SĐT, Địa chỉ, Tên sản phẩm, Màu/Size), hãy xác nhận lại đơn hàng lịch sự và xuất kèm khối JSON đơn hàng theo cú pháp đặc biệt để hệ thống tự động tạo đơn nháp.

LƯU Ý: Không bịa đặt thông tin sản phẩm hoặc giá cả nếu không có trong dữ liệu cửa hàng.`,
      temperature: 0.7,
      max_output_tokens: 1024,
      debounce_delay_seconds: 4,
      auto_order_extraction: true,
      is_active: true,
      updated_by: adminUser._id
    });

    // 7. Nạp Bảng KnowledgeBase (Kho tri thức RAG)
    console.log('[Seeder] 6/7. Đang tạo Kho Tri Thức RAG (KnowledgeBase)...');
    await KnowledgeBase.create([
      {
        title: 'Chính sách Đổi trả và Bảo hành trong 7 ngày',
        category: 'RETURN_POLICY',
        content: 'Khách hàng được quyền đổi trả hàng trong vòng 7 ngày kể từ ngày nhận hàng nếu sản phẩm bị lỗi do nhà sản xuất (rách chỉ, phai màu, sai mẫu) hoặc muốn đổi kích cỡ (size) không vừa. Điều kiện: Sản phẩm còn nguyên tem mác, chưa qua giặt là hoặc sử dụng. Shop hỗ trợ 100% phí ship 2 chiều nếu do lỗi của shop.',
        keywords: ['đổi trả', 'đổi size', 'bảo hành', 'lỗi sản phẩm', 'trả hàng', '7 ngày'],
        is_active: true,
        created_by: adminUser._id
      },
      {
        title: 'Bảng Hướng dẫn Chọn Size Quần Áo (Size Guide)',
        category: 'SIZE_GUIDE',
        content: 'Bảng chọn size áo thun:\n- Size M: Dành cho người cao từ 1m55 - 1m68, cân nặng 48kg - 58kg.\n- Size L: Dành cho người cao từ 1m68 - 1m76, cân nặng 59kg - 68kg.\n- Size XL: Dành cho người cao từ 1m75 - 1m85, cân nặng 69kg - 82kg.\n(Nếu thích mặc form rộng rãi giấu quần, khách hàng nên tăng lên 1 size).',
        keywords: ['chọn size', 'bảng size', 'chiều cao', 'cân nặng', 'size m', 'size l', 'size xl'],
        is_active: true,
        created_by: adminUser._id
      },
      {
        title: 'Chính sách Giao hàng và Phí Vận chuyển (Shipping Policy)',
        category: 'SHIPPING',
        content: 'Cửa hàng áp dụng chính sách giao hàng toàn quốc:\n- Nội thành Hà Nội & TP.HCM: Nhận hàng sau 1 - 2 ngày (Phí ship đồng giá 20.000đ).\n- Các tỉnh thành khác: Nhận hàng sau 2 - 4 ngày (Phí ship đồng giá 30.000đ).\n- ĐẶC BIỆT: Miễn phí vận chuyển (FREESHIP) cho mọi đơn hàng có giá trị từ 500.000đ trở lên.',
        keywords: ['phí ship', 'giao hàng', 'vận chuyển', 'thời gian giao', 'freeship', 'ship hà nội', 'ship tphcm'],
        is_active: true,
        created_by: adminUser._id
      }
    ]);

    // 8. Nạp Bảng Customer, Conversation, Message (Mẫu 1 khách hàng đã chat)
    console.log('[Seeder] 7/7. Đang tạo Dữ liệu Hội thoại & Khách hàng mẫu...');
    const sampleCustomer = await Customer.create({
      psid: 'fb_psid_987654321',
      full_name: 'Nguyễn Văn An',
      phone: '0987654321',
      email: 'vanan.nguyen@gmail.com',
      address: 'Số 123 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
      source: 'facebook',
      tags: ['Khách hàng tiềm năng', 'Quan tâm Áo thun'],
      notes: 'Khách thích form áo rộng rãi màu đen'
    });

    const sampleConversation = await Conversation.create({
      customer_id: sampleCustomer._id,
      channel: 'facebook_messenger',
      external_channel_id: 'fb_psid_987654321',
      is_bot_active: true,
      status: 'OPEN',
      last_message_text: 'Dạ shop em có áo thun cotton dáng rộng màu đen size L đang có sẵn ạ!',
      last_message_at: new Date(),
      unread_count: 0,
      assigned_to: staffUser._id
    });

    await Message.create([
      {
        conversation_id: sampleConversation._id,
        sender_type: 'CUSTOMER',
        content: 'Shop ơi áo thun cotton dáng rộng có màu đen size L không ạ?',
        is_read: true
      },
      {
        conversation_id: sampleConversation._id,
        sender_type: 'AI_BOT',
        content: 'Dạ shop em có áo thun cotton dáng rộng màu đen size L đang có sẵn ạ! Giá đang ưu đãi chỉ 199.000đ (giá gốc 250.000đ). Anh/chị cho em xin chiều cao và cân nặng để em tư vấn size chuẩn nhất nhé ạ!',
        is_read: true
      }
    ]);

    console.log('\n======================================================');
    console.log('🎉 NẠP DỮ LIỆU MẪU (DATABASE SEEDING) THÀNH CÔNG 100%!');
    console.log('======================================================');
    console.log('📌 Tài khoản Quản trị viên (Admin): admin / admin123');
    console.log('📌 Tài khoản Nhân viên (Staff):       staff01 / staff123');
    console.log('📌 Danh mục sản phẩm: 3 danh mục');
    console.log('📌 Sản phẩm mẫu:      4 sản phẩm (kèm nhiều biến thể & tồn kho)');
    console.log('📌 Tri thức RAG:       3 chính sách bán hàng');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Lỗi khi nạp dữ liệu:', error);
    process.exit(1);
  }
};

seedDatabase();
