import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ATLAS_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:Admin123456%40@cluster0.0ge6qxs.mongodb.net/ai_sales_consultant?retryWrites=true&w=majority';

async function seedStoredFiles() {
  console.log('Connecting to Atlas...');
  await mongoose.connect(ATLAS_URI);
  const db = mongoose.connection.db;

  const uploadsRoot = path.resolve(__dirname, '../uploads');
  const folders = ['products', 'categories', 'general', 'avatars', 'bot', 'stickers'];
  let totalSaved = 0;

  for (const f of folders) {
    const fPath = path.join(uploadsRoot, f);
    if (!fs.existsSync(fPath)) continue;
    const files = fs.readdirSync(fPath);
    for (const file of files) {
      const fullPath = path.join(fPath, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) continue;
      const buf = fs.readFileSync(fullPath);
      const ext = path.extname(file).toLowerCase();
      let mime = 'image/jpeg';
      if (ext === '.png') mime = 'image/png';
      else if (ext === '.webp') mime = 'image/webp';
      else if (ext === '.gif') mime = 'image/gif';

      await db.collection('stored_files').updateOne(
        { filename: file, folder: f },
        {
          $set: {
            filename: file,
            folder: f,
            mimetype: mime,
            size: buf.length,
            data: buf,
            updated_at: new Date()
          },
          $setOnInsert: { created_at: new Date() }
        },
        { upsert: true }
      );
      totalSaved++;
    }
  }
  console.log(`✅ Total files seeded into stored_files collection: ${totalSaved}`);

  // Update AKN-474 and ATN-126
  await db.collection('products').updateOne(
    { sku: 'AKN-474' },
    {
      $set: {
        image_urls: [
          'https://ai-auto-backend.onrender.com/uploads/products/akn_474_theu_hoa.jpg',
          'https://ai-auto-backend.onrender.com/uploads/general/1792418911623_521668230.jpg'
        ]
      }
    }
  );
  await db.collection('products').updateOne(
    { sku: 'ATN-126' },
    {
      $set: {
        image_urls: [
          'https://ai-auto-backend.onrender.com/uploads/products/atn_126_retro.jpg',
          'https://ai-auto-backend.onrender.com/uploads/general/1792418911625_143527188.jpg'
        ]
      }
    }
  );
  console.log('✅ AKN-474 and ATN-126 updated successfully in Atlas!');

  // Verify
  const p1 = await db.collection('products').findOne({ sku: 'AKN-474' });
  console.log('AKN-474 in Atlas:', p1.sku, '|', p1.product_name, '|', p1.image_urls);

  const p2 = await db.collection('products').findOne({ sku: 'ATN-126' });
  console.log('ATN-126 in Atlas:', p2.sku, '|', p2.product_name, '|', p2.image_urls);

  process.exit(0);
}

seedStoredFiles().catch((err) => {
  console.error(err);
  process.exit(1);
});
