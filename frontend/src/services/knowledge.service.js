import apiClient from '../config/axios.config.js';

export const knowledgeService = {
  getKnowledgeList: async (params = {}) => {
    const res = await apiClient.get('/knowledge', { params });
    return res.data;
  },

  getKnowledgeById: async (id, business_id) => {
    const res = await apiClient.get(`/knowledge/${id}`, { params: { business_id } });
    return res.data;
  },

  createKnowledge: async (data) => {
    const res = await apiClient.post('/knowledge', data);
    return res.data;
  },

  updateKnowledge: async (id, data) => {
    const res = await apiClient.put(`/knowledge/${id}`, data);
    return res.data;
  },

  deleteKnowledge: async (id, business_id) => {
    const res = await apiClient.delete(`/knowledge/${id}`, { params: { business_id } });
    return res.data;
  }
};
