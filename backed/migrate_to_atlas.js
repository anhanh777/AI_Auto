import mongoose from 'mongoose';

// Hướng dẫn: Chạy script này bằng lệnh:
// node migrate_to_atlas.js "<CHUOI_KET_NOI_MONGODB_ATLAS>"

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/ai_sales_consultant';
const TARGET_URI = process.argv[2] || process.env.TARGET_MONGODB_URI;

if (!TARGET_URI) {
  console.error('\n❌ Lỗi: Bạn chưa cung cấp chuỗi kết nối MongoDB Atlas!');
  console.error('👉 Cú pháp: node migrate_to_atlas.js "mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/ai_sales_consultant?retryWrites=true&w=majority"\n');
  process.exit(1);
}

async function migrateData() {
  console.log('\n🚀 BẮT ĐẦU CHUYỂN DỮ LIỆU TỪ LOCAL LÊN MONGODB ATLAS...');
  console.log('📍 Nguồn (Local):', LOCAL_URI);
  console.log('☁️ Đích (Atlas):', TARGET_URI.replace(/:([^:@]+)@/, ':****@'));

  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('✅ Đã kết nối Local MongoDB thành công!');

  const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
  console.log('✅ Đã kết nối MongoDB Atlas Cloud thành công!\n');

  try {
    const collections = await localConn.db.listCollections().toArray();
    console.log(`📦 Tìm thấy ${collections.length} bảng (collections) cần chuyển giao:\n`);

    for (const col of collections) {
      const colName = col.name;
      if (colName.startsWith('system.')) continue;

      const localCol = localConn.db.collection(colName);
      const targetCol = targetConn.db.collection(colName);

      const docs = await localCol.find({}).toArray();
      const count = docs.length;

      if (count === 0) {
        console.log(`  ⚪ [${colName}]: 0 bản ghi (Bỏ qua)`);
        continue;
      }

      // Xóa dữ liệu cũ trên Atlas nếu có để tránh trùng lặp
      await targetCol.deleteMany({});

      // Nạp toàn bộ dữ liệu từ local vào Atlas
      await targetCol.insertMany(docs);
      console.log(`  ✨ [${colName}]: Đã chuyển thành công ${count} bản ghi sang Cloud!`);
    }

    console.log('\n🎉 ========================================================');
    console.log('🏆 CHÚC MỪNG: TOÀN BỘ DỮ LIỆU LOCAL ĐÃ ĐƯỢC ĐẨY LÊN ATLAS 100%!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('\n❌ Xảy ra lỗi trong quá trình chuyển dữ liệu:', err.message);
  } finally {
    await localConn.close();
    await targetConn.close();
    process.exit(0);
  }
}

migrateData();
