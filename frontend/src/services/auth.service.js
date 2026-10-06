import apiClient from '../config/axios.config.js';

export const authService = {
  login: (username, password) => apiClient.post('/auth/login', { username, password }),
  getMe: () => apiClient.get('/auth/me'),
  changePassword: (oldPassword, newPassword) => apiClient.post('/auth/change-password', { oldPassword, newPassword }),
  getPermissions: () => apiClient.get('/auth/permissions'),
  getRoles: () => apiClient.get('/auth/roles'),
  updateRolePermissions: (roleId, permissions) => apiClient.put(`/auth/roles/${roleId}`, { permissions })
};
