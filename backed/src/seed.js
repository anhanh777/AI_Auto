import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import {
  Business,
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

    // 1. Xóa dữ liệu cũ
    console.log('[Seeder] Đang làm sạch dữ liệu cũ...');
    await Promise.all([
      Business.deleteMany({}),
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

    // 2. Nạp Bảng Roles
    console.log('[Seeder] 1/8. Đang tạo Roles (ADMIN, STAFF)...');
    const adminRole = await Role.create({
      name: 'ADMIN',
      description: 'Quản trị viên toàn quyền hệ thống',
      permissions: ['ALL']
    });

    const staffRole = await Role.create({
      name: 'STAFF',
      description: 'Nhân viên tư vấn bán hàng trực tiếp',
      permissions: ['CHAT_VIEW', 'CHAT_REPLY', 'ORDER_VIEW', 'ORDER_CREATE', 'PRODUCT_VIEW']
    });

    // 3. Nạp Bảng Users
    console.log('[Seeder] 2/8. Đang tạo Users mẫu...');
    const adminUser = await User.create({
      role_id: adminRole._id,
      username: 'admin',
      password: 'admin123',
      full_name: 'Anh Trần (Admin)',
      email: 'trananhhunter02@gmail.com',
      phone: '0901234567',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      custom_permissions: ['ALL'],
      is_active: true
    });

    const staffUser = await User.create({
      role_id: staffRole._id,
      username: 'lebinh',
      password: '123456',
      full_name: 'Lê Bình (Tư vấn viên)',
      email: 'lebinh080122@gmail.com',
      phone: '0912345678',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      custom_permissions: ['PRODUCT_VIEW', 'ORDER_VIEW', 'CHAT_VIEW', 'CHAT_REPLY'],
      is_active: true
    });

    const user3 = await User.create({
      role_id: staffRole._id,
      username: 'vuhuong',
      password: '123456',
      full_name: 'Vũ Thị Hường (Tư vấn viên)',
      email: 'wilford.parten93722@hotmail.com',
      phone: '0988776655',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      custom_permissions: ['PRODUCT_VIEW', 'ORDER_VIEW', 'CHAT_VIEW', 'CHAT_REPLY'],
      is_active: true
    });

    // 4. Nạp Bảng Businesses (Cửa hàng / Doanh nghiệp - Bảng 3.23)
    console.log('[Seeder] 3/8. Đang tạo Doanh nghiệp mẫu (Business)...');
    const mainBusiness = await Business.create({
      business_name: 'Soulmade Fashion Store',
      code: 'SOULMADE_STORE',
      industry: 'Thời trang nam nữ thiết kế',
      phone: '0901234567',
      email: 'contact@soulmade.vn',
      logo_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=150',
      is_active: true,
      owner_user_id: adminUser._id,
      created_by: adminUser._id
    });

    const outletBusiness = await Business.create({
      business_name: 'Soulmade Outlet & Sneaker',
      code: 'SOULMADE_OUTLET',
      industry: 'Giày dép & Phụ kiện cao cấp',
      phone: '0912345678',
      email: 'outlet@soulmade.vn',
      logo_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150',
      is_active: true,
      owner_user_id: adminUser._id,
      created_by: adminUser._id
    });

    // 5. Nạp Bảng Categories (Danh mục sản phẩm - Bảng 3.31)
    console.log('[Seeder] 4/8. Đang tạo Categories theo Doanh nghiệp...');
    const catAoNam = await Category.create({
      business_id: mainBusiness._id,
      category_name: 'Áo Nam',
      slug: 'ao-nam',
      parent_id: null,
      description: 'Bộ sưu tập áo thời trang nam',
      image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500',
      is_active: true,
      created_by: adminUser._id
    });

    const catAoThun = await Category.create({
      business_id: mainBusiness._id,
      category_name: 'Áo Thun & Polo',
      slug: 'ao-thun-polo',
      parent_id: catAoNam._id,
      description: 'Các mẫu áo thun cotton 100%, áo polo cá sấu mắt chim trẻ trung',
      image_url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500',
      is_active: true,
      created_by: adminUser._id
    });

    const catJeans = await Category.create({
      business_id: mainBusiness._id,
      category_name: 'Quần Jean & Kaki',
      slug: 'quan-jean-kaki',
      parent_id: null,
      description: 'Quần jean ống suông, form rộng baggy và quần kaki co giãn',
      image_url: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500',
      is_active: true,
      created_by: adminUser._id
    });

    const catAccessories = await Category.create({
      business_id: mainBusiness._id,
      category_name: 'Phụ Kiện Thời Trang',
      slug: 'phu-kien-thoi-trang',
      parent_id: null,
      description: 'Túi tote canvas, mũ lưỡi trai, thắt lưng da',
      image_url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500',
      is_active: true,
      created_by: adminUser._id
    });

    // 6. Nạp Bảng Products (Sản phẩm, Biến thể & AI Selling Points - Bảng 3.32)
    console.log('[Seeder] 5/8. Đang tạo Products kèm AI Selling Points & Biến thể...');
    const prod1Variants = [
      { sku_con: 'AT-COTTON-01-W-M', size: 'M', color: 'Trắng', price: 199000, stock: 30 },
      { sku_con: 'AT-COTTON-01-W-L', size: 'L', color: 'Trắng', price: 199000, stock: 25 },
      { sku_con: 'AT-COTTON-01-B-M', size: 'M', color: 'Đen', price: 199000, stock: 40 },
      { sku_con: 'AT-COTTON-01-B-L', size: 'L', color: 'Đen', price: 199000, stock: 35 }
    ];
    const totalProd1Stock = prod1Variants.reduce((s, v) => s + v.stock, 0);

    const prod1 = await Product.create({
      business_id: mainBusiness._id,
      category_id: catAoThun._id,
      sku: 'AT-COTTON-01',
      product_name: 'Áo Thun Cotton Oversize Dáng Rộng Hàn Quốc',
      slug: 'ao-thun-cotton-oversize-dang-rong-han-quoc-at-cotton-01',
      base_price: 250000,
      sale_price: 199000,
      stock_physical: totalProd1Stock,
      stock_available: totalProd1Stock,
      variants_json: prod1Variants,
      ai_selling_points: 'Chất liệu 100% Cotton 2 chiều định lượng 250gsm dày dặn, thấm hút mồ hôi cực tốt. Cổ áo bo dệt chống dão giặt máy thoải mái. Form rộng giấu bụng, dễ phối đồ với quần jean hoặc short.',
      description: 'Mẫu áo thun best-seller của thương hiệu Soulmade, phù hợp cả nam và nữ.',
      image_urls: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800'
      ],
      status: 'ACTIVE',
      created_by: adminUser._id
    });

    const prod2Variants = [
      { sku_con: 'AP-POLO-02-NV-L', size: 'L', color: 'Xanh Navy', price: 259000, stock: 20 },
      { sku_con: 'AP-POLO-02-NV-XL', size: 'XL', color: 'Xanh Navy', price: 259000, stock: 25 },
      { sku_con: 'AP-POLO-02-W-L', size: 'L', color: 'Trắng', price: 259000, stock: 30 }
    ];
    const totalProd2Stock = prod2Variants.reduce((s, v) => s + v.stock, 0);

    const prod2 = await Product.create({
      business_id: mainBusiness._id,
      category_id: catAoThun._id,
      sku: 'AP-POLO-02',
      product_name: 'Áo Polo Nam Cổ Bẻ Vải Cá Sấu Cao Cấp',
      slug: 'ao-polo-nam-co-be-vai-ca-sau-cao-cap-ap-polo-02',
      base_price: 320000,
      sale_price: 259000,
      stock_physical: totalProd2Stock,
      stock_available: totalProd2Stock,
      variants_json: prod2Variants,
      ai_selling_points: 'Vải dệt Pique mắt chim thoáng khí, chống nhăn tự nhiên. Form regular lịch sự đi làm công sở hoặc đi tiệc. Logo thêu vi tính sắc nét tỉ mỉ.',
      description: 'Áo polo thanh lịch, tôn dáng dành cho quý ông hiện đại.',
      image_urls: [
        'https://images.unsplash.com/photo-1625910513413-7e452a87df2e?w=800'
      ],
      status: 'ACTIVE',
      created_by: adminUser._id
    });

    const prod3Variants = [
      { sku_con: 'QJ-BAGGY-01-LB-29', size: '29', color: 'Xanh Nhạt', price: 380000, stock: 20 },
      { sku_con: 'QJ-BAGGY-01-LB-30', size: '30', color: 'Xanh Nhạt', price: 380000, stock: 25 },
      { sku_con: 'QJ-BAGGY-01-BL-30', size: '30', color: 'Đen Khói', price: 380000, stock: 20 }
    ];
    const totalProd3Stock = prod3Variants.reduce((s, v) => s + v.stock, 0);

    const prod3 = await Product.create({
      business_id: mainBusiness._id,
      category_id: catJeans._id,
      sku: 'QJ-BAGGY-01',
      product_name: 'Quần Jean Baggy Unisex Ống Suông Rộng Rãi',
      slug: 'quan-jean-baggy-unisex-ong-suong-rong-rai-qj-baggy-01',
      base_price: 450000,
      sale_price: 380000,
      stock_physical: totalProd3Stock,
      stock_available: totalProd3Stock,
      variants_json: prod3Variants,
      ai_selling_points: 'Denim dệt chéo 13oz bền bỉ, công nghệ xử lý wash đá tự nhiên không phai màu khi giặt. Form ống suông che khuyết điểm chân cong cực tốt.',
      description: 'Quần jeans xu hướng Streetwear trẻ trung, thoải mái vận động.',
      image_urls: [
        'https://images.unsplash.com/photo-1542272604-780c96856592?w=800'
      ],
      status: 'ACTIVE',
      created_by: adminUser._id
    });

    const prod4Variants = [
      { sku_con: 'PK-TOTE-01-CRM', size: 'Freesize', color: 'Trắng Kem', price: 139000, stock: 0 },
      { sku_con: 'PK-TOTE-01-BLK', size: 'Freesize', color: 'Đen', price: 139000, stock: 0 }
    ];

    const prod4 = await Product.create({
      business_id: mainBusiness._id,
      category_id: catAccessories._id,
      sku: 'PK-TOTE-01',
      product_name: 'Túi Tote Vải Canvas Đựng Vừa Laptop 15.6 inch',
      slug: 'tui-tote-vai-canvas-dung-vua-laptop-pk-tote-01',
      base_price: 180000,
      sale_price: 139000,
      stock_physical: 0,
      stock_available: 0,
      variants_json: prod4Variants,
      ai_selling_points: 'Vải Canvas mộc sợi bông dày dặn, có khóa kéo chống trộm và ngăn phụ đựng ví/điện thoại tiện lợi.',
      description: 'Túi tote canvas đi học, đi làm, bảo vệ môi trường.',
      image_urls: [
        'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800'
      ],
      status: 'OUT_OF_STOCK',
      created_by: adminUser._id
    });

    // 7. Nạp Bảng AIConfig (Cấu hình AI theo Business)
    console.log('[Seeder] 6/8. Đang tạo Cấu hình AI (AIConfig)...');
    await AIConfig.create({
      business_id: mainBusiness._id,
      model_name: 'gemini-1.5-flash',
      system_prompt: `Bạn là trợ lý ảo AI tư vấn bán hàng trực tuyến thông minh, nhiệt tình và chuyên nghiệp của thương hiệu Soulmade Fashion Store.

NHIỆM VỤ CỦA BẠN:
1. Chào hỏi khách hàng lễ phép, thân thiện (xưng "Dạ em chào anh/chị ạ", "Dạ Soulmade chào bạn").
2. Dựa trên thông tin sản phẩm (ai_selling_points, giá bán, tồn kho, size/màu) và tri thức chính sách để tư vấn chuẩn xác.
3. Khi khách chốt đơn và cung cấp thông tin (Tên, SĐT, Địa chỉ, Sản phẩm), tổng hợp và gửi kèm block JSON đơn hàng để hệ thống ghi nhận.`,
      temperature: 0.7,
      max_output_tokens: 1024,
      debounce_delay_seconds: 4,
      auto_order_extraction: true,
      is_active: true,
      updated_by: adminUser._id
    });

    // 8. Nạp Bảng KnowledgeBase (Kho tri thức RAG)
    console.log('[Seeder] 7/8. Đang tạo Kho Tri Thức RAG (KnowledgeBase)...');
    await KnowledgeBase.create([
      {
        business_id: mainBusiness._id,
        title: 'Chính sách Đổi trả và Bảo hành trong 7 ngày',
        category: 'RETURN_POLICY',
        content: 'Khách hàng được quyền đổi trả hàng trong vòng 7 ngày kể từ ngày nhận hàng nếu sản phẩm bị lỗi do nhà sản xuất (rách chỉ, phai màu, sai mẫu) hoặc muốn đổi kích cỡ (size) không vừa. Điều kiện: Sản phẩm còn nguyên tem mác, chưa qua giặt là hoặc sử dụng. Shop hỗ trợ 100% phí ship 2 chiều nếu do lỗi của shop.',
        keywords: ['đổi trả', 'đổi size', 'bảo hành', 'lỗi sản phẩm', 'trả hàng', '7 ngày'],
        is_active: true,
        created_by: adminUser._id
      },
      {
        business_id: mainBusiness._id,
        title: 'Bảng Hướng dẫn Chọn Size Quần Áo (Size Guide)',
        category: 'SIZE_GUIDE',
        content: 'Bảng chọn size áo thun:\n- Size M: Dành cho người cao từ 1m55 - 1m68, cân nặng 48kg - 58kg.\n- Size L: Dành cho người cao từ 1m68 - 1m76, cân nặng 59kg - 68kg.\n- Size XL: Dành cho người cao từ 1m75 - 1m85, cân nặng 69kg - 82kg.\n(Nếu thích mặc form rộng rãi giấu quần, khách hàng nên tăng lên 1 size).',
        keywords: ['chọn size', 'bảng size', 'chiều cao', 'cân nặng', 'size m', 'size l', 'size xl'],
        is_active: true,
        created_by: adminUser._id
      },
      {
        business_id: mainBusiness._id,
        title: 'Chính sách Giao hàng và Phí Vận chuyển (Shipping Policy)',
        category: 'SHIPPING',
        content: 'Cửa hàng áp dụng chính sách giao hàng toàn quốc:\n- Nội thành Hà Nội & TP.HCM: Nhận hàng sau 1 - 2 ngày (Phí ship đồng giá 20.000đ).\n- Các tỉnh thành khác: Nhận hàng sau 2 - 4 ngày (Phí ship đồng giá 30.000đ).\n- ĐẶC BIỆT: Miễn phí vận chuyển (FREESHIP) cho mọi đơn hàng có giá trị từ 500.000đ trở lên.',
        keywords: ['phí ship', 'giao hàng', 'vận chuyển', 'thời gian giao', 'freeship', 'ship hà nội', 'ship tphcm'],
        is_active: true,
        created_by: adminUser._id
      }
    ]);

    // 9. Nạp Bảng Customer & Conversation mẫu
    console.log('[Seeder] 8/8. Đang tạo Dữ liệu Hội thoại & Khách hàng mẫu...');
    const sampleCustomer = await Customer.create({
      business_id: mainBusiness._id,
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
      business_id: mainBusiness._id,
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
        content: 'Dạ Soulmade có áo thun cotton dáng rộng màu đen size L đang có sẵn ạ! Giá đang ưu đãi chỉ 199.000đ (giá gốc 250.000đ). Anh/chị cho em xin chiều cao và cân nặng để em tư vấn size chuẩn nhất nhé ạ!',
        is_read: true
      }
    ]);

    console.log('\n======================================================');
    console.log('🎉 NẠP DỮ LIỆU MẪU (DATABASE SEEDING) THÀNH CÔNG 100%!');
    console.log('======================================================');
    console.log('📌 Doanh nghiệp chính: Soulmade Fashion Store (ID: ' + mainBusiness._id + ')');
    console.log('📌 Doanh nghiệp phụ:   Soulmade Outlet & Sneaker (ID: ' + outletBusiness._id + ')');
    console.log('📌 Tài khoản Quản trị viên (Admin): admin / admin123');
    console.log('📌 Tài khoản Nhân viên (Staff):       lebinh / 123456');
    console.log('📌 Danh mục sản phẩm: 4 danh mục (Áo Nam, Áo Thun & Polo, Quần Jean & Kaki, Phụ Kiện)');
    console.log('📌 Sản phẩm mẫu:      4 sản phẩm (kèm biến thể, tồn kho và AI Selling Points)');
    console.log('📌 Tri thức RAG:       3 bài chính sách bán hàng');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Lỗi khi nạp dữ liệu:', error);
    process.exit(1);
  }
};

seedDatabase();
