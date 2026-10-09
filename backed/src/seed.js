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
  Message,
  Order
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
      Message.deleteMany({}),
      Order.deleteMany({})
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
      permissions: ['CHAT_VIEW', 'CHAT_REPLY', 'ORDER_VIEW', 'ORDER_CREATE', 'PRODUCT_VIEW', 'CUSTOMER_VIEW']
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
      custom_permissions: ['PRODUCT_VIEW', 'ORDER_VIEW', 'CHAT_VIEW', 'CHAT_REPLY', 'CUSTOMER_VIEW'],
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
      custom_permissions: ['PRODUCT_VIEW', 'ORDER_VIEW', 'CHAT_VIEW', 'CHAT_REPLY', 'CUSTOMER_VIEW'],
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
      business_name: 'aoooo',
      code: 'AIXXI',
      industry: 'Bán lẻ - Thời trang & Phụ kiện',
      phone: '0332159178',
      email: 'a@gamc.com',
      logo_url: '',
      is_active: true,
      owner_user_id: adminUser._id,
      created_by: adminUser._id
    });

    // Cập nhật mảng business_ids cho Users
    adminUser.business_ids = [mainBusiness._id, secondBusiness._id];
    await adminUser.save();

    staffUser.business_ids = [mainBusiness._id];
    await staffUser.save();

    user3.business_ids = [secondBusiness._id];
    await user3.save();

    // 4.1. Nạp Bảng Channels
    console.log('[Seeder] 3.1/8. Đang tạo Kênh Chat Fanpage Facebook...');
    const channels = await Channel.create([
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
      }
    ]);
    const mainChannel = channels[0];

    // 5. Nạp Bảng Categories
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

    // 6. Nạp Bảng Products
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
      }
    ];

    const seededProducts = [];
    for (const p of sampleProductsData) {
      const prod = await Product.create({
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
      seededProducts.push(prod);
    }

    // 7. Nạp Bảng AIConfig (Mỗi business có 1 config riêng biệt)
    console.log('[Seeder] 6/8. Đang tạo Cấu hình Bot AI...');
    await AIConfig.create({
      business_id: mainBusiness._id,
      bot_name: 'Soulmade Assistant',
      model_name: 'gemini-1.5-flash',
      ai_persona_tone: 'FRIENDLY',
      system_prompt: `Bạn là trợ lý ảo AI tư vấn bán hàng trực tuyến thông minh của cửa hàng Soulmade. Hãy chào hỏi khách hàng thân thiện và trả lời chính xác dựa trên sản phẩm trong kho.`,
      welcome_message: 'Dạ shop Soulmade xin chào quý khách! Hôm nay shop có nhiều ưu đãi kem massage Sline cực tốt, bạn cần tư vấn dòng nào ạ?',
      guardrail_blocklist: ['chửi bậy', 'lừa đảo', 'hoàn tiền gấp', 'hàng giả', 'đối thủ'],
      temperature: 0.7,
      max_output_tokens: 1024,
      debounce_delay_seconds: 3,
      auto_order_extraction: true,
      is_active: true,
      updated_by: adminUser._id
    });

    await AIConfig.create({
      business_id: secondBusiness._id,
      bot_name: 'AI Sales Bot',
      model_name: 'gemini-1.5-flash',
      ai_persona_tone: 'PROFESSIONAL',
      system_prompt: `Bạn là trợ lý tư vấn bán hàng của shop aoooo.`,
      welcome_message: 'Xin chào quý khách đến với aoooo Store!',
      guardrail_blocklist: ['chửi bậy', 'lừa đảo'],
      temperature: 0.7,
      max_output_tokens: 1024,
      debounce_delay_seconds: 3,
      auto_order_extraction: true,
      is_active: true,
      updated_by: adminUser._id
    });

    // 8. Nạp Kho Tri Thức RAG (Knowledge Base)
    console.log('[Seeder] 7/8. Đang nạp Kho Tri Thức RAG...');
    await KnowledgeBase.create([
      {
        business_id: mainBusiness._id,
        title: 'Chính sách vận chuyển & Giao hàng Soulmade',
        category: 'SHIPPING',
        content: 'Miễn phí giao hàng toàn quốc cho đơn hàng từ 500.000đ. Đơn hàng dưới 500.000đ phí ship đồng giá 30.000đ. Thời gian giao hàng: Nội thành 1-2 ngày, tỉnh khác 2-4 ngày.',
        keywords: ['phí ship', 'giao hàng', 'vận chuyển', 'freeship'],
        created_by: adminUser._id
      },
      {
        business_id: mainBusiness._id,
        title: 'Chính sách đổi trả & Hoàn tiền',
        category: 'RETURN_POLICY',
        content: 'Hỗ trợ đổi trả trong vòng 7 ngày kể từ khi nhận hàng đối với sản phẩm còn nguyên tem mác, chưa qua sử dụng hoặc có lỗi từ nhà sản xuất.',
        keywords: ['đổi hàng', 'trả hàng', 'hoàn tiền', 'lỗi sản phẩm'],
        created_by: adminUser._id
      },
      {
        business_id: mainBusiness._id,
        title: 'Hướng dẫn sử dụng Kem Massage Sline 6D+',
        category: 'FAQ',
        content: 'Thoa một lượng kem vừa đủ lên vùng da cần massage (bụng, đùi, bắp tay), massage nhẹ nhàng theo chiều kim đồng hồ từ 10-15 phút. Ngày dùng 2 lần sáng và tối.',
        keywords: ['cách dùng', 'hướng dẫn', 'kem sline', 'massage'],
        created_by: adminUser._id
      }
    ]);

    // 9. Nạp Bảng Customers, Conversations, Messages, Orders
    console.log('[Seeder] 8/8. Đang tạo Khách hàng, Hội thoại và Đơn hàng...');
    const sampleChatThreads = [
      {
        customer_name: 'Phạm Thị Nghĩa',
        phone: '0912345678',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
        tags: ["Sp/L'vento", 'Hot MKT'],
        last_message: '↩ - Chị Phạm Thị Nghĩa Ơi Có Khuyến Mãi Khủng Này! ❤️',
        date: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        customer_name: 'Thị Thị Nguyen',
        phone: '0987654321',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        tags: ["Sp/L'vento", 'Hot MKT'],
        last_message: '↩ - Chị Thị Thị Nguyen Ơi Có Khuyến Mãi Khủng Này! ❤️',
        date: new Date(Date.now() - 15 * 60 * 1000)
      },
      {
        customer_name: 'Hoàng Thị Thanh Thúy',
        phone: '0933221144',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
        tags: ["Sp/L'vento", 'Hot MKT'],
        last_message: '↩ - Chị Hoàng Thị Thanh Thúy Ơi Có Khuyến Mãi Khủng Này! ❤️',
        date: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        customer_name: 'Tuyết Bùi',
        phone: '0909887766',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100',
        tags: ['Khách mới'],
        last_message: '↩ - Cảm ơn bạn Tuyết Bùi đã hỏi! Giá sản phẩm có thể thay đổi theo...',
        date: new Date(Date.now() - 2 * 3600 * 1000)
      }
    ];

    for (const item of sampleChatThreads) {
      const cust = await Customer.create({
        business_id: mainBusiness._id,
        full_name: item.customer_name,
        phone: item.phone,
        avatar: item.avatar,
        source: 'facebook',
        tags: item.tags,
        total_orders_count: 1,
        total_spend_amount: 299000
      });

      const conv = await Conversation.create({
        business_id: mainBusiness._id,
        channel_id: mainChannel._id,
        customer_id: cust._id,
        channel: 'facebook_messenger',
        external_channel_id: `fb_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tags: item.tags,
        is_bot_active: true,
        status: 'OPEN',
        last_message_text: item.last_message,
        last_message_at: item.date,
        unread_count: 1
      });

      await Message.create([
        {
          conversation_id: conv._id,
          sender_type: 'CUSTOMER',
          content: `Chào shop, mình quan tâm đến sản phẩm ${item.tags[0] || 'Kem massage'}`,
          created_at: new Date(item.date.getTime() - 60000)
        },
        {
          conversation_id: conv._id,
          sender_type: 'AI_BOT',
          content: item.last_message,
          created_at: item.date
        }
      ]);

      // Tạo đơn hàng mẫu trích xuất bởi AI
      await Order.create({
        order_code: `DH_${Math.floor(10000 + Math.random() * 90000)}`,
        business_id: mainBusiness._id,
        customer_id: cust._id,
        customer_name: cust.full_name,
        customer_phone: cust.phone,
        shipping_address: '123 Đường Cầu Giấy, Phường Dịch Vọng, Hà Nội',
        order_items: [
          {
            product_id: seededProducts[0]._id,
            product_name: seededProducts[0].product_name,
            sku: seededProducts[0].sku,
            variant: '200ml',
            quantity: 1,
            price: 299000
          }
        ],
        subtotal_amount: 299000,
        shipping_fee: 30000,
        discount_amount: 0,
        total_amount: 329000,
        status: 'CONFIRMED',
        payment_method: 'COD',
        payment_status: 'UNPAID',
        extracted_by_ai: true,
        extracted_from_conversation_id: conv._id
      });
    }

    console.log('\n======================================================');
    console.log('🎉 SEED DỮ LIỆU ĐA DOANH NGHIỆP (MULTI-TENANT) THÀNH CÔNG!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Lỗi khi nạp dữ liệu:', error);
    process.exit(1);
  }
};

seedDatabase();
