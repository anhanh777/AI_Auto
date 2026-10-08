import apiClient from '../config/axios.config.js';

export const productService = {
  getProducts: async (params = {}) => {
    return await apiClient.get('/products', { params });
  },

  getProductById: async (id) => {
    return await apiClient.get(`/products/${id}`);
  },

  createProduct: async (data) => {
    return await apiClient.post('/products', data);
  },

  updateProduct: async (id, data) => {
    return await apiClient.put(`/products/${id}`, data);
  },

  deleteProduct: async (id) => {
    return await apiClient.delete(`/products/${id}`);
  },

  importStock: async (id, data) => {
    return await apiClient.post(`/products/${id}/import-stock`, data);
  }
};
