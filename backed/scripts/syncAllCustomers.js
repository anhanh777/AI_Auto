import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import { Channel } from '../src/models/Channel.model.js';
import { Customer } from '../src/models/Customer.model.js';
import { Conversation } from '../src/models/Conversation.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_sales_consultant';

async function sync() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const channel = await Channel.findOne({ page_id: '105115765931449' });
  if (!channel) {
    console.error('Channel Soulmade not found');
    process.exit(1);
  }

  const token = channel.page_access_token;
  const pageId = channel.page_id;

  // Lấy conversations từ Meta
  console.log('Fetching conversations from Meta Page API...');
  const convRes = await axios.get(`https://graph.facebook.com/v19.0/${pageId}/conversations`, {
    params: {
      fields: 'id,snippet,updated_time,participants',
      limit: 25,
      access_token: token
    }
  });

  const convList = convRes.data?.data || [];
  console.log(`Found ${convList.length} conversations on Meta.`);

  const participantMap = new Map();
  for (const c of convList) {
    const parts = c.participants?.data || [];
    for (const p of parts) {
      if (p.id !== pageId && p.name && p.name !== 'Người dùng Facebook') {
        participantMap.set(p.id, p.name);
      }
    }
  }

  console.log('Known participants from Meta Page Conversations:', Object.fromEntries(participantMap));

  const customers = await Customer.find({ psid: { $exists: true, $ne: '' } });
  for (const cust of customers) {
    console.log(`Checking customer ${cust.full_name} (${cust.psid})...`);
    let realName = participantMap.get(cust.psid);

    if (!realName) {
      // Thử gọi PSID
      try {
        const uRes = await axios.get(`https://graph.facebook.com/v19.0/${cust.psid}`, {
          params: { fields: 'name,profile_pic', access_token: token }
        });
        if (uRes.data?.name) realName = uRes.data.name;
        if (uRes.data?.profile_pic) cust.avatar = uRes.data.profile_pic;
      } catch (err) {}
    }

    if (realName) {
      console.log(`🎉 Found real name for ${cust.psid}: "${realName}" (was: "${cust.full_name}")`);
      cust.full_name = realName;
      if (!cust.avatar || cust.avatar.includes('unsplash')) {
        cust.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=4F46E5&color=fff&size=200&bold=true`;
      }
      cust.profile_pic_url = cust.avatar;
      await cust.save();

      await Conversation.updateMany(
        { customer_id: cust._id },
        {
          $set: {
            customer_name: cust.full_name,
            customer_avatar: cust.avatar
          }
        }
      );
      console.log(`✅ Saved customer ${realName} to DB.`);
    }
  }

  console.log('--- SYNC COMPLETED ---');
  await mongoose.disconnect();
}

sync().catch(console.error);
