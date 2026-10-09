import apiClient from '../config/axios.config.js';

export const aiConfigService = {
  getAIConfig: async (params = {}) => {
    const res = await apiClient.get('/ai-config', { params });
    return res.data;
  },

  updateAIConfig: async (data) => {
    const res = await apiClient.put('/ai-config', data);
    return res.data;
  }
};
