import apiClient from '../config/axios.config.js';

export const categoryService = {
  getCategories: async (params = {}) => {
    return await apiClient.get('/categories', { params });
  },

  getCategoryById: async (id) => {
    return await apiClient.get(`/categories/${id}`);
  },

  createCategory: async (data) => {
    return await apiClient.post('/categories', data);
  },

  updateCategory: async (id, data) => {
    return await apiClient.put(`/categories/${id}`, data);
  },

  deleteCategory: async (id) => {
    return await apiClient.delete(`/categories/${id}`);
  }
};
