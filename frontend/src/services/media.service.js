import apiClient from '../config/axios.config.js';

export const mediaService = {
  // Lấy danh sách ảnh trong Kho Media
  getMedia: async (params = {}) => {
    return await apiClient.get('/media', { params });
  },

  // Lấy thống kê kho ảnh (số lượng, dung lượng MB)
  getStats: async (params = {}) => {
    return await apiClient.get('/media/stats', { params });
  },

  // Upload ảnh mới vào Kho Media
  uploadMedia: async (files, folder = 'general', tags = [], caption = '', business_id = null) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('images', file);
    });
    formData.append('folder', folder);
    if (caption) formData.append('caption', caption);
    if (tags && tags.length > 0) formData.append('tags', JSON.stringify(tags));
    if (business_id) formData.append('business_id', business_id);

    return await apiClient.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: business_id ? { business_id } : {}
    });
  },

  // Thêm ảnh từ URL có sẵn
  addManualMedia: async (data) => {
    return await apiClient.post('/media/manual', data);
  },

  // Tự động quét và gom ảnh từ toàn bộ Sản phẩm vào Kho
  syncProductMedia: async (business_id) => {
    return await apiClient.post('/media/sync-products', { business_id });
  },

  // Cập nhật thông tin ảnh (tên, folder, tags, caption)
  updateMedia: async (id, data, business_id) => {
    return await apiClient.put(`/media/${id}`, { ...data, business_id });
  },

  // Xóa 1 ảnh
  deleteMedia: async (id, business_id) => {
    return await apiClient.delete(`/media/${id}`, { params: { business_id } });
  },

  // Xóa nhiều ảnh đã chọn
  bulkDeleteMedia: async (ids, business_id) => {
    return await apiClient.delete('/media/bulk', {
      data: { ids, business_id }
    });
  }
};
