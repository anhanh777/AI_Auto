import mongoose from 'mongoose';

const ATLAS_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:Admin123456%40@cluster0.0ge6qxs.mongodb.net/ai_sales_consultant?retryWrites=true&w=majority';
const OLD_BASE = 'http://localhost:5000';
const NEW_BASE = 'https://ai-auto-backend.onrender.com';

async function migrateImageUrls() {
  console.log('🔄 Bắt đầu chuẩn hóa URL hình ảnh trên MongoDB Atlas Cloud...');
  const conn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('✅ Kết nối MongoDB Atlas thành công!');

  try {
    // 1. Products
    const products = await conn.db.collection('products').find({}).toArray();
    let updatedProducts = 0;
    for (const prod of products) {
      if (Array.isArray(prod.image_urls) && prod.image_urls.length > 0) {
        let changed = false;
        const newUrls = prod.image_urls.map((url) => {
          if (typeof url === 'string') {
            if (url.includes(OLD_BASE)) {
              changed = true;
              return url.replace(OLD_BASE, NEW_BASE);
            }
            if (url.startsWith('/uploads/')) {
              changed = true;
              return `${NEW_BASE}${url}`;
            }
          }
          return url;
        });

        if (changed) {
          await conn.db.collection('products').updateOne(
            { _id: prod._id },
            { $set: { image_urls: newUrls } }
          );
          updatedProducts++;
        }
      }
    }
    console.log(`📦 Products: Đã cập nhật ${updatedProducts}/${products.length} sản phẩm sang ${NEW_BASE}`);

    // 2. Categories
    const categories = await conn.db.collection('categories').find({}).toArray();
    let updatedCategories = 0;
    for (const cat of categories) {
      if (cat.image_url && typeof cat.image_url === 'string') {
        let newUrl = cat.image_url;
        if (newUrl.includes(OLD_BASE)) {
          newUrl = newUrl.replace(OLD_BASE, NEW_BASE);
        } else if (newUrl.startsWith('/uploads/')) {
          newUrl = `${NEW_BASE}${newUrl}`;
        }
        if (newUrl !== cat.image_url) {
          await conn.db.collection('categories').updateOne(
            { _id: cat._id },
            { $set: { image_url: newUrl } }
          );
          updatedCategories++;
        }
      }
    }
    console.log(`🏷️ Categories: Đã cập nhật ${updatedCategories}/${categories.length} danh mục`);

    // 3. Messages
    const messages = await conn.db.collection('messages').find({ 'attachments.0': { $exists: true } }).toArray();
    let updatedMessages = 0;
    for (const msg of messages) {
      if (Array.isArray(msg.attachments)) {
        let changed = false;
        const newAttachments = msg.attachments.map((att) => {
          if (att?.url && typeof att.url === 'string') {
            let nUrl = att.url;
            if (nUrl.includes(OLD_BASE)) {
              changed = true;
              nUrl = nUrl.replace(OLD_BASE, NEW_BASE);
            } else if (nUrl.startsWith('/uploads/')) {
              changed = true;
              nUrl = `${NEW_BASE}${nUrl}`;
            }
            return { ...att, url: nUrl };
          }
          return att;
        });

        if (changed) {
          await conn.db.collection('messages').updateOne(
            { _id: msg._id },
            { $set: { attachments: newAttachments } }
          );
          updatedMessages++;
        }
      }
    }
    console.log(`💬 Messages: Đã cập nhật ${updatedMessages}/${messages.length} tin nhắn chứa ảnh`);

    // 4. MediaAssets
    const mediaAssets = await conn.db.collection('media_assets').find({}).toArray();
    let updatedAssets = 0;
    for (const asset of mediaAssets) {
      let changed = false;
      let newFileUrl = asset.file_url;
      let newThumbUrl = asset.thumbnail_url;

      if (newFileUrl && typeof newFileUrl === 'string') {
        if (newFileUrl.includes(OLD_BASE)) {
          changed = true;
          newFileUrl = newFileUrl.replace(OLD_BASE, NEW_BASE);
        } else if (newFileUrl.startsWith('/uploads/')) {
          changed = true;
          newFileUrl = `${NEW_BASE}${newFileUrl}`;
        }
      }

      if (newThumbUrl && typeof newThumbUrl === 'string') {
        if (newThumbUrl.includes(OLD_BASE)) {
          changed = true;
          newThumbUrl = newThumbUrl.replace(OLD_BASE, NEW_BASE);
        } else if (newThumbUrl.startsWith('/uploads/')) {
          changed = true;
          newThumbUrl = `${NEW_BASE}${newThumbUrl}`;
        }
      }

      if (changed) {
        await conn.db.collection('media_assets').updateOne(
          { _id: asset._id },
          { $set: { file_url: newFileUrl, thumbnail_url: newThumbUrl } }
        );
        updatedAssets++;
      }
    }
    console.log(`🖼️ Media Assets: Đã cập nhật ${updatedAssets}/${mediaAssets.length} file tài nguyên`);

    // 5. Bot Scenarios
    const scenarios = await conn.db.collection('bot_scenarios').find({}).toArray();
    let updatedScenarios = 0;
    for (const sc of scenarios) {
      let changed = false;
      let newUrls = sc.image_urls;
      let newUrl = sc.image_url;

      if (Array.isArray(newUrls)) {
        newUrls = newUrls.map((u) => {
          if (typeof u === 'string') {
            if (u.includes(OLD_BASE)) {
              changed = true;
              return u.replace(OLD_BASE, NEW_BASE);
            }
            if (u.startsWith('/uploads/')) {
              changed = true;
              return `${NEW_BASE}${u}`;
            }
          }
          return u;
        });
      }

      if (newUrl && typeof newUrl === 'string') {
        if (newUrl.includes(OLD_BASE)) {
          changed = true;
          newUrl = newUrl.replace(OLD_BASE, NEW_BASE);
        } else if (newUrl.startsWith('/uploads/')) {
          changed = true;
          newUrl = `${NEW_BASE}${newUrl}`;
        }
      }

      if (changed) {
        await conn.db.collection('bot_scenarios').updateOne(
          { _id: sc._id },
          { $set: { image_urls: newUrls, image_url: newUrl } }
        );
        updatedScenarios++;
      }
    }
    console.log(`🤖 Bot Scenarios: Đã cập nhật ${updatedScenarios}/${scenarios.length} kịch bản`);

    console.log('\n🎉 ========================================================');
    console.log('🏆 TOÀN BỘ LINK ẢNH TRÊN MONGODB ATLAS ĐÃ ĐƯỢC CHUẨN HÓA HTTPS!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Lỗi di trú URL ảnh:', err.message);
  } finally {
    await conn.close();
  }
}

migrateImageUrls().catch(console.error);
