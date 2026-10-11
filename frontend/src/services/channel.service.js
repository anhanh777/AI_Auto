import apiClient from '../config/axios.config.js';

export const channelService = {
  // Lấy danh sách kênh theo Business ID
  getChannels: async (businessId) => {
    const params = businessId ? { business_id: businessId } : {};
    return await apiClient.get('/channels', { params });
  },

  // Tạo mới / Kết nối kênh chat
  createChannel: async (channelData) => {
    return await apiClient.post('/channels', channelData);
  },

  // Cập nhật thông tin / chế độ vận hành kênh
  updateChannel: async (id, channelData) => {
    return await apiClient.put(`/channels/${id}`, channelData);
  },

  // Xóa / Hủy kết nối kênh
  deleteChannel: async (id) => {
    return await apiClient.delete(`/channels/${id}`);
  },

  // Lấy danh sách Fanpage từ Meta bằng User Access Token
  getFacebookPages: async (userAccessToken) => {
    const res = await apiClient.post('/channels/facebook/pages', { user_access_token: userAccessToken });
    return res.data;
  },

  // Kết nối 1 Fanpage vào Business
  connectFacebookPage: async (pageData) => {
    const res = await apiClient.post('/channels/facebook/connect', pageData);
    return res.data;
  }
};
