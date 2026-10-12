import apiClient from '../config/axios.config.js';

export const orderService = {
  getOrders: async (params = {}) => {
    return await apiClient.get('/orders', { params });
  },

  getOrderStats: async (business_id) => {
    return await apiClient.get('/orders/stats', { params: { business_id } });
  },

  getOrderById: async (id, business_id) => {
    return await apiClient.get(`/orders/${id}`, { params: { business_id } });
  },

  createOrder: async (data) => {
    return await apiClient.post('/orders', data);
  },

  updateOrderStatus: async (id, status, business_id, note = '', cancellationReason = '') => {
    return await apiClient.put(`/orders/${id}/status`, {
      status,
      business_id,
      note,
      cancellation_reason: cancellationReason
    });
  },

  deleteOrder: async (id, business_id) => {
    return await apiClient.delete(`/orders/${id}`, { params: { business_id } });
  }
};
