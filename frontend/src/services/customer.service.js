import apiClient from '../config/axios.config.js';

export const customerService = {
  getCustomers: async (params = {}) => {
    return await apiClient.get('/customers', { params });
  },

  getCustomerById: async (id, business_id) => {
    return await apiClient.get(`/customers/${id}`, { params: { business_id } });
  },

  createCustomer: async (data) => {
    return await apiClient.post('/customers', data);
  },

  updateCustomer: async (id, data) => {
    return await apiClient.put(`/customers/${id}`, data);
  },

  deleteCustomer: async (id, business_id) => {
    return await apiClient.delete(`/customers/${id}`, { params: { business_id } });
  },

  getCustomerStats: async (business_id) => {
    return await apiClient.get('/customers/stats', { params: { business_id } });
  },

  getCustomerOrders: async (id, business_id) => {
    return await apiClient.get(`/customers/${id}/orders`, { params: { business_id } });
  }
};
