import apiClient from '../config/axios.config.js';

export const uploadService = {
  /**
   * Upload 1 file ảnh
   * @param {File} file - File ảnh từ <input type="file" />
   * @param {string} folder - Thư mục lưu trữ: 'avatars', 'products', 'general'
   */
  uploadSingle: async (file, folder = 'avatars') => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await apiClient.post(`/upload/single?folder=${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res;
  },

  /**
   * Upload nhiều file ảnh (Album sản phẩm)
   * @param {FileList|Array<File>} files - Danh sách file ảnh
   * @param {string} folder - Thư mục lưu trữ
   */
  uploadMultiple: async (files, folder = 'products') => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('images', file);
    });

    const res = await apiClient.post(`/upload/multiple?folder=${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res;
  }
};
