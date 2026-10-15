import apiClient from '../config/axios.config.js';

export const analyticsService = {
  getAnalytics: async (business_id, timeRange = '7days') => {
    return await apiClient.get('/analytics', { params: { business_id, timeRange } });
  }
};
