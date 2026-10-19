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

  // Kiểm tra tính hợp lệ của token cho các kênh Facebook
  const channelsWithStatus = await Promise.all(
    channels.map(async (ch) => {
      const chObj = ch.toObject ? ch.toObject() : { ...ch };
      const token = ch.page_access_token || ch.access_token;
      if (!token) {
        chObj.token_valid = false;
        chObj.token_error = 'Chưa có Token';
        return chObj;
      }
      try {
        const checkRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id&access_token=${token}`);
        const checkData = await checkRes.json();
        if (checkData.id) {
          chObj.token_valid = true;
          if (!ch.is_connected) {
            await Channel.findByIdAndUpdate(ch._id, { is_connected: true });
            chObj.is_connected = true;
          }
        } else {
          chObj.token_valid = false;
          chObj.token_error = checkData.error?.message || 'Token hết hạn hoặc không hợp lệ';
          if (ch.is_connected) {
            await Channel.findByIdAndUpdate(ch._id, { is_connected: false });
            chObj.is_connected = false;
          }
        }
      } catch (err) {
        chObj.token_valid = false;
        chObj.token_error = err.message;
      }
      return chObj;
    })
  );

  return channelsWithStatus;
};

/**
 * Tự động kiểm tra và nâng cấp lên Token vĩnh viễn (Never Expires) cho Fanpage Facebook
 */
export const resolvePermanentPageToken = async ({ access_token, user_access_token, page_id, page_name }) => {
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) return access_token;

  let candidateUserToken = user_access_token || null;

  // Nếu chưa có candidateUserToken, kiểm tra xem access_token có phải là USER token không
  if (!candidateUserToken && access_token) {
    try {
      const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${access_token}&access_token=${appId}|${appSecret}`);
      const debugData = await debugRes.json();
      if (debugData?.data?.type === 'USER') {
        candidateUserToken = access_token;
      }
    } catch (e) {}
  }

  if (candidateUserToken) {
    try {
      // Đổi sang Long-lived User Token (hạn 60 ngày)
      const exRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${candidateUserToken}`);
      const exData = await exRes.json();
      if (exData.access_token) {
        // Lấy Page Token VĨNH VIỄN (expires_at: 0) từ /me/accounts
        const accRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${exData.access_token}`);
        const accData = await accRes.json();
        const targetPage = (accData.data || []).find((p) => p.id === page_id);
        if (targetPage?.access_token) {
          console.log(`[Facebook Channel] Đã tự động nâng cấp sang Token Vĩnh Viễn cho Page: ${page_name || page_id} (${page_id})`);
          return targetPage.access_token;
        }
      }
    } catch (tokenErr) {
      console.warn('[Facebook Token Auto-Exchange Warn]', tokenErr.message);
    }
  }

  return access_token;
};

export const createChannelService = async (data, userId) => {
  let finalToken = data.access_token || data.page_access_token;
  if (data.page_id && finalToken) {
    finalToken = await resolvePermanentPageToken({
      access_token: finalToken,
      user_access_token: data.user_access_token,
      page_id: data.page_id,
      page_name: data.page_name
    });
  }

  // Kiểm tra xem Channel đã tồn tại chưa để cập nhật thay vì tạo trùng
  let existingChannel = await Channel.findOne({
    business_id: data.business_id,
    page_id: data.page_id
  });

  if (existingChannel) {
    existingChannel.page_name = data.page_name || existingChannel.page_name;
    existingChannel.page_access_token = finalToken;
    existingChannel.access_token = finalToken;
    if (data.avatar_url) existingChannel.avatar_url = data.avatar_url;
    if (data.operating_mode) existingChannel.operating_mode = data.operating_mode;
    existingChannel.is_connected = true;
    existingChannel.is_active = true;
    existingChannel.updated_by = userId;
    await existingChannel.save();
    return existingChannel;
  }

  const newChannel = new Channel({
    ...data,
    page_access_token: finalToken,
    access_token: finalToken,
    is_connected: true,
    is_active: true,
    created_by: userId
  });
  await newChannel.save();
  return newChannel;
};

export const updateChannelService = async (channelId, data) => {
  if (data.access_token || data.page_access_token) {
    const rawToken = data.access_token || data.page_access_token;
    const existing = await Channel.findById(channelId);
    if (existing) {
      const permanentToken = await resolvePermanentPageToken({
        access_token: rawToken,
        user_access_token: data.user_access_token,
        page_id: existing.page_id,
        page_name: existing.page_name
      });
      data.access_token = permanentToken;
      data.page_access_token = permanentToken;
    }
  }
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
    avatar_url: page.id ? `https://graph.facebook.com/${page.id}/picture?type=large` : (page.picture?.data?.url || ''),
    tasks: page.tasks || []
  }));

  return pages;
};

export const connectFacebookPageService = async (data, userId) => {
  const { business_id, page_id, page_name, access_token, user_access_token, avatar_url, operating_mode } = data;
  if (!business_id || !page_id || !page_name) {
    throw new Error('business_id, page_id và page_name là bắt buộc');
  }

  const finalAvatarUrl = page_id
    ? `https://graph.facebook.com/${page_id}/picture?type=large`
    : (avatar_url || '');

  const finalPageToken = await resolvePermanentPageToken({
    access_token,
    user_access_token,
    page_id,
    page_name
  });

  // Thử đăng ký webhook subscribed_apps nếu có token
  if (finalPageToken) {
    try {
      const subUrl = `https://graph.facebook.com/v21.0/${page_id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads&access_token=${finalPageToken}`;
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
    if (finalPageToken) {
      channel.page_access_token = finalPageToken;
      channel.access_token = finalPageToken;
    }
    channel.avatar_url = finalAvatarUrl;
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
      avatar_url: finalAvatarUrl,
      page_access_token: finalPageToken || access_token || '',
      access_token: finalPageToken || access_token || '',
      operating_mode: operating_mode || 'AI_AUTO',
      is_connected: true,
      is_active: true,
      created_by: userId
    });
  }

  return channel;
};

export const syncChannelCustomersService = async (channelId) => {
  const channel = await Channel.findById(channelId);
  if (!channel) throw new Error('Không tìm thấy kênh Fanpage');

  const pageToken = channel.page_access_token || channel.access_token;
  if (!pageToken) {
    throw new Error('Kênh chưa có Page Access Token');
  }

  const { Conversation, Customer } = await import('../models/index.js');
  const conversations = await Conversation.find({ channel_id: channel._id }).populate('customer_id');

  let updatedCount = 0;
  const axios = (await import('axios')).default;

  for (const conv of conversations) {
    const customer = conv.customer_id;
    if (!customer?.psid) continue;

    try {
      const fbUserRes = await axios.get(
        `https://graph.facebook.com/v19.0/${customer.psid}`,
        {
          params: {
            fields: 'name,first_name,last_name,profile_pic',
            access_token: pageToken
          },
          timeout: 7000
        }
      );

      if (fbUserRes.data) {
        const realName = fbUserRes.data.name || `${fbUserRes.data.first_name || ''} ${fbUserRes.data.last_name || ''}`.trim();
        if (realName) {
          customer.full_name = realName;
          if (fbUserRes.data.profile_pic) {
            customer.avatar = fbUserRes.data.profile_pic;
            customer.profile_pic_url = fbUserRes.data.profile_pic;
          }
          await customer.save();
          updatedCount++;
          console.log(`[Sync Customer] Đã cập nhật tên thật: ${realName} (PSID: ${customer.psid})`);
        }
      }
    } catch (err) {
      if (err.response?.data?.error?.code === 190) {
        throw new Error(`Token của Fanpage "${channel.page_name}" đã hết hạn. Vui lòng cấp lại Page Access Token.`);
      }
      console.warn(`[Sync Customer] Lỗi PSID ${customer.psid}:`, err.response?.data?.error?.message || err.message);
    }
  }

  return { success: true, updatedCount };
};
