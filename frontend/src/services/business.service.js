import apiClient from '../config/axios.config.js';

export const businessService = {
  getBusinesses: async (params = {}) => {
    return await apiClient.get('/businesses', { params });
  },

  getBusinessById: async (id) => {
    return await apiClient.get(`/businesses/${id}`);
  },

  createBusiness: async (data) => {
    return await apiClient.post('/businesses', data);
  },

  joinBusiness: async (code) => {
    return await apiClient.post('/businesses/join', { code });
  },

  updateBusiness: async (id, data) => {
    return await apiClient.put(`/businesses/${id}`, data);
  },

  deleteBusiness: async (id) => {
    return await apiClient.delete(`/businesses/${id}`);
  }
};
