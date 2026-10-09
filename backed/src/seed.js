import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import {
  Business,
  Channel,
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
      Channel.deleteMany({}),
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
      full_name: 'Anh Trần',
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
      full_name: 'Lê Bình BM A',
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
      full_name: 'Vũ Thị Hường',
      email: 'wilford.parten93722@hotmail.com',
      phone: '0988776655',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      custom_permissions: ['PRODUCT_VIEW', 'ORDER_VIEW', 'CHAT_VIEW', 'CHAT_REPLY'],
      is_active: true
    });

    // 4. Nạp Bảng Businesses (Bảng 3.23)
    console.log('[Seeder] 3/8. Đang tạo Doanh nghiệp mẫu (Business)...');
    const mainBusiness = await Business.create({
      business_name: 'Soulmade - Chạm cảm xúc, nâng tầm phong cách',
      code: 'SOULMADE',
      industry: 'Bán lẻ - Thời trang nam nữ',
      phone: '0901234567',
      email: 'contact@soulmade.vn',
      logo_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=150',
      is_active: true,
      owner_user_id: adminUser._id,
      created_by: adminUser._id
    });

    const secondBusiness = await Business.create({
      business_name: 'AI Sales Fashion Store (Chi nhánh 2)',
      code: 'AISALES_CN2',
      industry: 'Thời trang công sở cao cấp',
      phone: '0988776655',
      email: 'store2@aisales.ai',
      logo_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150',
      is_active: true,
      owner_user_id: adminUser._id,
      created_by: adminUser._id
    });

    // Cập nhật mảng business_ids cho Users
    adminUser.business_ids = [mainBusiness._id, secondBusiness._id];
    await adminUser.save();

    staffUser.business_ids = [mainBusiness._id];
    await staffUser.save();

    user3.business_ids = [mainBusiness._id];
    await user3.save();

    // 4.1. Nạp Bảng Channels (Khớp Biểu đồ Lớp Class Diagram - Kênh Facebook Fanpage)
    console.log('[Seeder] 3.1/8. Đang tạo Kênh Chat Fanpage Facebook...');
    await Channel.create([
      {
        business_id: mainBusiness._id,
        page_id: 'soulmade.official.fanpage',
        page_name: 'Soulmade Official - Fanpage Facebook',
        platform: 'facebook',
        avatar_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=150',
        operating_mode: 'AI_AUTO',
        is_active: true,
        created_by: adminUser._id
      },
      {
        business_id: mainBusiness._id,
        page_id: 'soulmade.outlet.facebook',
        page_name: 'Soulmade Outlet & Sneaker - Fanpage',
        platform: 'facebook',
        avatar_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150',
        operating_mode: 'AI_AUTO',
        is_active: true,
        created_by: adminUser._id
      },
      {
        business_id: secondBusiness._id,
        page_id: 'aisales.cn2.facebook',
        page_name: 'AI Sales Chi Nhánh 2 - Fanpage',
        platform: 'facebook',
        avatar_url: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=150',
        operating_mode: 'AI_AUTO',
        is_active: true,
        created_by: adminUser._id
      }
    ]);

    // 5. Nạp Bảng Categories (Bảng 3.31)
    console.log('[Seeder] 4/8. Đang tạo Categories...');
    const catBoby = await Category.create({
      business_id: mainBusiness._id,
      category_name: 'Boby',
      slug: 'boby',
      parent_id: null,
      description: 'Chăm sóc cơ thể',
      image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=150',
      is_active: true,
      created_by: staffUser._id
    });

    const catXitKhuMui = await Category.create({
      business_id: mainBusiness._id,
      category_name: 'Xịt Khử Mùi',
      slug: 'xit-khu-mui',
      parent_id: null,
      description: 'Hương thơm tự nhiên dịu nhẹ lưu hương 24h',
      image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150',
      is_active: true,
      created_by: staffUser._id
    });

    // 6. Nạp Bảng Products (Bảng 3.32)
    console.log('[Seeder] 5/8. Đang tạo Products mẫu...');
    const sampleProductsData = [
      {
        sku: 'TM10',
        product_name: 'Kem Massage Body Thon Gọn – Săn Chắc Sline 6D+ | Thảo Dược Dịu Nhẹ – Hỗ Trợ',
        base_price: 400000,
        sale_price: 299000,
        stock_physical: 100000,
        stock_available: 100000,
        category_id: catBoby._id,
        ai_selling_points: 'Kem massage Sline 6D+ chiết xuất thảo dược tự nhiên, làm săn chắc vùng eo, đùi, bắp tay hiệu quả an toàn.',
        description: 'Kem massage Sline 6D+ là lựa chọn phù hợp cho những ai muốn xây dựng thói quen chăm sóc cơ thể tại nhà.',
        image_urls: [
          'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500'
        ],
        variants_json: [
          { sku_con: 'TM10-200ML', size: '200ml', color: 'Tiêu chuẩn', stock: 50000, price: 299000 },
          { sku_con: 'TM10-500ML', size: '500ml', color: 'Tiết kiệm', stock: 50000, price: 499000 }
        ]
      },
      {
        sku: 'TM09',
        product_name: 'Kem Massage Gừng Quế – Săn Chắc Vùng Bụng & Đùi Tự Nhiên',
        base_price: 400000,
        sale_price: 299000,
        stock_physical: 100000,
        stock_available: 100000,
        category_id: catBoby._id,
        ai_selling_points: 'Chiết xuất tinh dầu gừng quế ấm nóng thẩm thấu nhanh, hỗ trợ đốt cháy mỡ thừa vùng eo.',
        description: 'Thành phần gừng quế thiên nhiên giúp làm ấm và thúc đẩy tuần hoàn máu dưới da.',
        image_urls: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500'],
        variants_json: [
          { sku_con: 'TM09-STD', size: 'Hộp 250g', color: 'Vàng gừng', stock: 100000, price: 299000 }
        ]
      },
      {
        sku: 'TM08',
        product_name: 'Kem Massage Dưỡng Da – Hỗ Trợ Cải Thiện Vóc Dáng Sline',
        base_price: 400000,
        sale_price: 179000,
        stock_physical: 100000,
        stock_available: 100000,
        category_id: catBoby._id,
        ai_selling_points: 'Dưỡng ẩm da mịn màng, hỗ trợ làm mờ các vết rạn da và làm săn chắc cơ thể.',
        description: 'Kem dưỡng kết hợp massage body lành tính cho mọi loại da.',
        image_urls: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500'],
        variants_json: [
          { sku_con: 'TM08-STD', size: 'Tuýp 150ml', color: 'Trắng', stock: 100000, price: 179000 }
        ]
      },
      {
        sku: 'TM07',
        product_name: 'Đai Nịt Bụng Cao Cấp Chăm Sóc Vóc Dáng Định Hình',
        base_price: 300000,
        sale_price: 149000,
        stock_physical: 100000,
        stock_available: 100000,
        category_id: catBoby._id,
        ai_selling_points: 'Đai nịt bụng chất liệu co giãn 4 chiều thoáng khí, có thanh chống cuộn gập khi ngồi.',
        description: 'Đai định hình eo thon gọn tức thì, tự tin diện đồ ôm sát.',
        image_urls: ['https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500'],
        variants_json: [
          { sku_con: 'TM07-S', size: 'S', color: 'Da', stock: 30000, price: 149000 },
          { sku_con: 'TM07-M', size: 'M', color: 'Da', stock: 40000, price: 149000 },
          { sku_con: 'TM07-L', size: 'L', color: 'Đen', stock: 30000, price: 149000 }
        ]
      },
      {
        sku: 'TM06',
        product_name: 'Kem Massage Eo Gọn – Da Săn Chắc Tinh Chất Trà Xanh',
        base_price: 600000,
        sale_price: 299000,
        stock_physical: 100000,
        stock_available: 100000,
        category_id: catBoby._id,
        ai_selling_points: 'Chiết xuất trà xanh chống oxy hóa da, dưỡng da mịn màng săn chắc.',
        description: 'Dòng kem cao cấp công nghệ thẩm thấu sâu.',
        image_urls: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500'],
        variants_json: [
          { sku_con: 'TM06-STD', size: 'Hộp 200g', color: 'Xanh nhạt', stock: 100000, price: 299000 }
        ]
      },
      {
        sku: 'TM05',
        product_name: 'Kem Thảo Dược Massage Vùng Mỡ Thừa Bắp Tay & Đùi',
        base_price: 600000,
        sale_price: 299000,
        stock_physical: 100000,
        stock_available: 100000,
        category_id: catBoby._id,
        ai_selling_points: '10 loại thảo mộc đông y giúp tan mỡ cục bộ không gây bỏng rát.',
        description: 'Hiệu quả rõ rệt sau 2 tuần sử dụng đều đặn.',
        image_urls: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500'],
        variants_json: [
          { sku_con: 'TM05-STD', size: 'Chai 250ml', color: 'Nâu thảo mộc', stock: 100000, price: 299000 }
        ]
      },
      {
        sku: 'TM04',
        product_name: 'Kem Massage Định Dáng Body Slim Cao Cấp',
        base_price: 400000,
        sale_price: 179000,
        stock_physical: 100000,
        stock_available: 100000,
        category_id: catBoby._id,
        ai_selling_points: 'Định hình đường cong cơ thể, làm mịn vùng da sần vỏ cam.',
        description: 'Sản phẩm được nhiều spa tin dùng.',
        image_urls: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500'],
        variants_json: [
          { sku_con: 'TM04-STD', size: 'Hũ 200g', color: 'Hồng nhạt', stock: 100000, price: 179000 }
        ]
      }
    ];

    for (const p of sampleProductsData) {
      await Product.create({
        business_id: mainBusiness._id,
        category_ids: [p.category_id],
        sku: p.sku,
        product_name: p.product_name,
        slug: `${p.sku.toLowerCase()}-massage`,
        base_price: p.base_price,
        sale_price: p.sale_price,
        stock_physical: p.stock_physical,
        stock_available: p.stock_available,
        variants_json: p.variants_json,
        ai_selling_points: p.ai_selling_points,
        description: p.description,
        image_urls: p.image_urls,
        status: 'ACTIVE',
        created_by: staffUser._id
      });
    }

    // 7. Nạp Bảng AIConfig
    console.log('[Seeder] 6/8. Đang tạo Cấu hình AI...');
    await AIConfig.create({
      business_id: mainBusiness._id,
      model_name: 'gemini-1.5-flash',
      system_prompt: `Bạn là trợ lý ảo AI tư vấn bán hàng trực tuyến thông minh của cửa hàng Soulmade.`,
      temperature: 0.7,
      max_output_tokens: 1024,
      debounce_delay_seconds: 4,
      auto_order_extraction: true,
      is_active: true,
      updated_by: adminUser._id
    });

    console.log('\n======================================================');
    console.log('🎉 SEED DỮ LIỆU MẪU THEO ĐÚNG ẢNH THÀNH CÔNG 100%!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Lỗi khi nạp dữ liệu:', error);
    process.exit(1);
  }
};

seedDatabase();
