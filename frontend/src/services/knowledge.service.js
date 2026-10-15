import apiClient from '../config/axios.config.js';

export const knowledgeService = {
  getKnowledgeList: async (params = {}) => {
    return await apiClient.get('/knowledge', { params });
  },

  getKnowledgeById: async (id, business_id) => {
    return await apiClient.get(`/knowledge/${id}`, { params: { business_id } });
  },

  createKnowledge: async (data) => {
    return await apiClient.post('/knowledge', data);
  },

  updateKnowledge: async (id, data) => {
    return await apiClient.put(`/knowledge/${id}`, data);
  },

  deleteKnowledge: async (id, business_id) => {
    return await apiClient.delete(`/knowledge/${id}`, { params: { business_id } });
  },

  // Xem trước phân tích file Excel/CSV
  previewKnowledgeFile: async (formData) => {
    return await apiClient.post('/knowledge/preview-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Nhập tài liệu tri thức từ file Excel/CSV
  importKnowledge: async (formData) => {
    return await apiClient.post('/knowledge/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Tải file mẫu Excel
  downloadTemplate: async () => {
    return await apiClient.get('/knowledge/template', {
      responseType: 'blob'
    });
  }
};
