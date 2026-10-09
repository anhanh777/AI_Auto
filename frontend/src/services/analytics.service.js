import apiClient from '../config/axios.config.js';

export const analyticsService = {
  getAnalytics: async (business_id) => {
    const res = await apiClient.get('/analytics', { params: { business_id } });
    return res.data;
  }
};
