import apiClient from '../config/axios.config.js';

export const botScenarioService = {
  // Lấy danh sách kịch bản của Doanh nghiệp
  getScenarios: async (params = {}) => {
    return await apiClient.get('/bot-scenarios', { params });
  },

  // Lấy chi tiết 1 kịch bản
  getScenarioById: async (id, business_id) => {
    return await apiClient.get(`/bot-scenarios/${id}`, { params: { business_id } });
  },

  // Tạo kịch bản mới
  createScenario: async (data) => {
    return await apiClient.post('/bot-scenarios', data);
  },

  // Cập nhật kịch bản
  updateScenario: async (id, data) => {
    return await apiClient.put(`/bot-scenarios/${id}`, data);
  },

  // Bật/tắt nhanh kịch bản
  toggleScenario: async (id, business_id) => {
    return await apiClient.patch(`/bot-scenarios/${id}/toggle`, { business_id });
  },

  // Xóa kịch bản
  deleteScenario: async (id, business_id) => {
    return await apiClient.delete(`/bot-scenarios/${id}`, { params: { business_id } });
  },

  // Thử nghiệm kịch bản trong Sandbox / Simulator
  testMatchScenario: async (data) => {
    return await apiClient.post('/bot-scenarios/test-match', data);
  }
};
