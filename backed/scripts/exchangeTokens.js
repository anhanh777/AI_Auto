import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Channel } from '../src/models/Channel.model.js';
import { Customer } from '../src/models/Customer.model.js';
import { Conversation } from '../src/models/Conversation.model.js';

dotenv.config();

const APP_ID = process.env.META_APP_ID || '1553312296825910';
const APP_SECRET = process.env.META_APP_SECRET || '647436b0c03877680340cf2bb7594034';
const USER_TOKEN = 'EAAWEurOtdDYBSr0UPmN2NTGW6AR4sA7cQC4WioIUUMOZAWKDNycjTqGsyuW2Qci8pEAlKlgEEMjCvRZAlZCoTnLNqTSGroGez1Jrl2qHBFcO5AexEdCnPajGVt4vZBq7v5dWzSrmTj4LSCpVZCLVYWdJoekkPcg3Mkstl6yQ449HtO41dyBMZCtFvq2AC0JbFve0z3VGMwQqDSinqawuTv4wSTs3jSw6OapmJx';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_sales_consultant';

async function main() {
  console.log('--- BẮT ĐẦU ĐỔI TOKEN VÀ CẬP NHẬT TÊN THẬT KHÁCH HÀNG ---');

  // 1. Đổi Short-Lived User Token sang Long-Lived Token (60 ngày)
  let longLivedToken = USER_TOKEN;
  try {
    const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${USER_TOKEN}`;
    const exchangeRes = await fetch(exchangeUrl);
    const exchangeData = await exchangeRes.json();

    if (exchangeData.access_token) {
      longLivedToken = exchangeData.access_token;
      console.log('✅ Đã đổi sang Long-Lived User Token thành công!');
      console.log('   Expires in:', exchangeData.expires_in, 'giây (~60 ngày)');
    } else {
      console.warn('⚠️ Không đổi được Long-Lived Token:', exchangeData.error?.message || exchangeData);
      console.log('ℹ️ Sử dụng token trực tiếp người dùng cung cấp...');
    }
  } catch (err) {
    console.error('❌ Lỗi khi gọi exchange token API:', err.message);
  }

  // 2. Lấy danh sách Pages và Page Access Token vĩnh viễn (Never Expire)
  let accountsData = [];
  try {
    const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}&limit=100`;
    const accountsRes = await fetch(accountsUrl);
    const accountsJson = await accountsRes.json();

    if (accountsJson.data && Array.isArray(accountsJson.data)) {
      accountsData = accountsJson.data;
      console.log(`✅ Lấy được ${accountsData.length} Fanpage từ Meta:`);
      accountsData.forEach(p => console.log(`   - [${p.id}] ${p.name}`));
    } else {
      console.error('❌ Lỗi lấy danh sách Pages:', accountsJson);
    }
  } catch (err) {
    console.error('❌ Lỗi khi gọi me/accounts:', err.message);
  }

  // 3. Kết nối MongoDB và cập nhật Channels
  console.log('Connecting MongoDB...', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB!');

  const pageTokensMap = new Map();

  for (const page of accountsData) {
    pageTokensMap.set(page.id, page.access_token);

    const updateRes = await Channel.updateMany(
      { page_id: page.id },
      {
        $set: {
          page_name: page.name,
          access_token: page.access_token,
          page_access_token: page.access_token,
          is_connected: true,
          is_active: true
        }
      }
    );
    console.log(`📌 Đã cập nhật Token mới cho Fanpage [${page.name}] (Page ID: ${page.id}): Matched ${updateRes.matchedCount}, Modified ${updateRes.modifiedCount}`);
  }

  // 4. Cập nhật thông tin thật cho Khách hàng
  console.log('\n--- BẮT ĐẦU ĐỒNG BỘ THÔNG TIN THẬT KHÁCH HÀNG ---');
  const customers = await Customer.find({
    psid: { $exists: true, $ne: '' }
  });

  console.log(`Tìm thấy ${customers.length} khách hàng có PSID.`);

  for (const cust of customers) {
    // Tìm channel tương ứng
    const channel = await Channel.findOne({ business_id: cust.business_id });
    const token = channel?.page_access_token || channel?.access_token || (accountsData[0] ? accountsData[0].access_token : null);

    if (!token) {
      console.warn(`⚠️ Không có Page Token cho khách hàng PSID: ${cust.psid}`);
      continue;
    }

    try {
      const profileUrl = `https://graph.facebook.com/v19.0/${cust.psid}?fields=id,name,first_name,last_name,profile_pic&access_token=${token}`;
      const profileRes = await fetch(profileUrl);
      const profileData = await profileRes.json();

      if (profileData.name) {
        console.log(`🎉 Graph API nhận diện thành công: PSID ${cust.psid} -> Tên thật: "${profileData.name}"`);
        const oldName = cust.full_name;
        cust.full_name = profileData.name;
        if (profileData.profile_pic) {
          cust.avatar = profileData.profile_pic;
          cust.profile_pic_url = profileData.profile_pic;
        }
        await cust.save();
        console.log(`✅ Đã lưu DB: "${oldName}" -> "${cust.full_name}"`);

        // Cập nhật cả customer_name trong Conversation nếu có
        await Conversation.updateMany(
          { customer_id: cust._id },
          {
            $set: {
              customer_name: cust.full_name,
              customer_avatar: cust.avatar
            }
          }
        );
      } else {
        console.warn(`⚠️ Graph API không trả về name cho PSID ${cust.psid}:`, profileData);
      }
    } catch (err) {
      console.error(`❌ Lỗi query profile cho PSID ${cust.psid}:`, err.message);
    }
  }

  console.log('\n--- HOÀN TẤT ĐỒNG BỘ TOKEN VÀ KHÁCH HÀNG! ---');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
