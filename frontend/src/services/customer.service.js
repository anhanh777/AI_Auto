import apiClient from '../config/axios.config.js';

export const customerService = {
  getCustomers: async (params = {}) => {
    const res = await apiClient.get('/customers', { params });
    return res.data;
  },

  getCustomerById: async (id, business_id) => {
    const res = await apiClient.get(`/customers/${id}`, { params: { business_id } });
    return res.data;
  },

  createCustomer: async (data) => {
    const res = await apiClient.post('/customers', data);
    return res.data;
  },

  updateCustomer: async (id, data) => {
    const res = await apiClient.put(`/customers/${id}`, data);
    return res.data;
  },

  deleteCustomer: async (id, business_id) => {
    const res = await apiClient.delete(`/customers/${id}`, { params: { business_id } });
    return res.data;
  }
};
