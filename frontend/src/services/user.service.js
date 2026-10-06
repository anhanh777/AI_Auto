import apiClient from '../config/axios.config.js';

export const userService = {
  getUsers: (params = {}) => apiClient.get('/users', { params }),
  getUserById: (id) => apiClient.get(`/users/${id}`),
  createUser: (userData) => apiClient.post('/users', userData),
  updateUser: (id, userData) => apiClient.put(`/users/${id}`, userData),
  resetPassword: (id, defaultPassword) => apiClient.patch(`/users/${id}/reset-password`, { defaultPassword }),
  deleteUser: (id) => apiClient.delete(`/users/${id}`)
};
