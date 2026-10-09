import apiClient from '../config/axios.config.js';

export const conversationService = {
  // Lấy danh sách hội thoại theo Business / Channel
  getConversations: async (params = {}) => {
    return await apiClient.get('/conversations', { params });
  },

  // Lấy tin nhắn của 1 hội thoại
  getMessages: async (conversationId) => {
    return await apiClient.get(`/conversations/${conversationId}/messages`);
  },

  // Gửi tin nhắn mới (Nhân viên hoặc AI)
  sendMessage: async (conversationId, data) => {
    return await apiClient.post(`/conversations/${conversationId}/messages`, data);
  },

  // Bật / Tắt Bot AI cho cuộc hội thoại
  toggleBot: async (conversationId) => {
    return await apiClient.patch(`/conversations/${conversationId}/toggle-bot`);
  }
};
