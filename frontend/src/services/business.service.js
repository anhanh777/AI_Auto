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

  toggleArchiveBusiness: async (id) => {
    return await apiClient.put(`/businesses/${id}/archive`);
  },

  deleteBusiness: async (id) => {
    return await apiClient.delete(`/businesses/${id}`);
  },

  getJoinRequests: async (businessId, status = 'PENDING') => {
    return await apiClient.get(`/businesses/${businessId}/join-requests`, { params: { status } });
  },

  approveJoinRequest: async (requestId) => {
    return await apiClient.post(`/businesses/join-requests/${requestId}/approve`);
  },

  rejectJoinRequest: async (requestId, note = '') => {
    return await apiClient.post(`/businesses/join-requests/${requestId}/reject`, { note });
  }
};
