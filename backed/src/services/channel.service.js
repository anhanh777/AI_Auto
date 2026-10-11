import { Channel } from '../models/Channel.model.js';
import { Business } from '../models/Business.model.js';

export const getChannelsService = async (businessId) => {
  const filter = {};
  if (businessId) {
    filter.business_id = businessId;
  }
  const channels = await Channel.find(filter)
    .populate('business_id', 'business_name code logo_url')
    .sort({ created_at: -1 });
  return channels;
};

export const createChannelService = async (data, userId) => {
  const newChannel = new Channel({
    ...data,
    created_by: userId
  });
  await newChannel.save();
  return newChannel;
};

export const updateChannelService = async (channelId, data) => {
  const updated = await Channel.findByIdAndUpdate(channelId, data, { new: true });
  if (!updated) {
    throw new Error('Không tìm thấy kênh cần cập nhật');
  }
  return updated;
};

export const deleteChannelService = async (channelId) => {
  const deleted = await Channel.findByIdAndDelete(channelId);
  if (!deleted) {
    throw new Error('Không tìm thấy kênh cần xóa');
  }
  return deleted;
};

export const getFacebookPagesFromTokenService = async (userAccessToken) => {
  if (!userAccessToken) {
    throw new Error('userAccessToken là bắt buộc');
  }

  let token = userAccessToken;

  // Nếu có cấu hình META_APP_ID và META_APP_SECRET, thử đổi sang Long-Lived User Access Token
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;

  if (appId && appSecret) {
    try {
      const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userAccessToken}`;
      const exRes = await fetch(exchangeUrl);
      const exData = await exRes.json();
      if (exData.access_token) {
        token = exData.access_token;
      }
    } catch (err) {
      console.warn('[Facebook Graph API] Không thể đổi token dài hạn:', err.message);
    }
  }

  // Gọi /me/accounts để lấy danh sách Pages
  const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,picture{url},tasks&access_token=${token}`;
  const res = await fetch(accountsUrl);
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || 'Lỗi khi lấy danh sách Fanpage từ Meta');
  }

  const pages = (data.data || []).map((page) => ({
    page_id: page.id,
    page_name: page.name,
    access_token: page.access_token,
    category: page.category,
    avatar_url: page.picture?.data?.url || '',
    tasks: page.tasks || []
  }));

  return pages;
};

export const connectFacebookPageService = async (data, userId) => {
  const { business_id, page_id, page_name, access_token, avatar_url, operating_mode } = data;
  if (!business_id || !page_id || !page_name) {
    throw new Error('business_id, page_id và page_name là bắt buộc');
  }

  // Thử đăng ký webhook subscribed_apps nếu có access_token
  if (access_token) {
    try {
      const subUrl = `https://graph.facebook.com/v21.0/${page_id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads&access_token=${access_token}`;
      const subRes = await fetch(subUrl, { method: 'POST' });
      const subData = await subRes.json();
      console.log(`[Facebook Webhook] Subscribed page ${page_id}:`, subData);
    } catch (err) {
      console.warn(`[Facebook Webhook] Không thể subscribe page ${page_id}:`, err.message);
    }
  }

  // Kiểm tra xem Channel đã tồn tại trong business chưa
  let channel = await Channel.findOne({ business_id, page_id });

  if (channel) {
    channel.page_name = page_name;
    if (access_token) {
      channel.page_access_token = access_token;
      channel.access_token = access_token;
    }
    if (avatar_url) channel.avatar_url = avatar_url;
    if (operating_mode) channel.operating_mode = operating_mode;
    channel.is_connected = true;
    channel.is_active = true;
    channel.updated_by = userId;
    await channel.save();
  } else {
    channel = await Channel.create({
      business_id,
      page_id,
      page_name,
      platform: 'facebook',
      avatar_url: avatar_url || '',
      page_access_token: access_token || '',
      access_token: access_token || '',
      operating_mode: operating_mode || 'AI_AUTO',
      is_connected: true,
      is_active: true,
      created_by: userId
    });
  }

  return channel;
};
