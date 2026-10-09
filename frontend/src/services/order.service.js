import apiClient from '../config/axios.config.js';

export const orderService = {
  getOrders: async (params = {}) => {
    const res = await apiClient.get('/orders', { params });
    return res.data;
  },

  getOrderById: async (id, business_id) => {
    const res = await apiClient.get(`/orders/${id}`, { params: { business_id } });
    return res.data;
  },

  createOrder: async (data) => {
    const res = await apiClient.post('/orders', data);
    return res.data;
  },

  updateOrderStatus: async (id, status, business_id) => {
    const res = await apiClient.put(`/orders/${id}/status`, { status, business_id });
    return res.data;
  },

  deleteOrder: async (id, business_id) => {
    const res = await apiClient.delete(`/orders/${id}`, { params: { business_id } });
    return res.data;
  }
};
