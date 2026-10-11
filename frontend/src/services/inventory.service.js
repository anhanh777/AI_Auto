import apiClient from '../config/axios.config.js';

export const inventoryService = {
  /**
   * Lấy tổng quan tồn kho
   * GET /api/v1/inventory
   */
  getInventory: async (params = {}) => {
    return await apiClient.get('/inventory', { params });
  },

  /**
   * Tạo phiếu nhập kho
   * POST /api/v1/inventory/import
   */
  importStock: async (data) => {
    return await apiClient.post('/inventory/import', data);
  },

  /**
   * Lấy lịch sử biến động kho và thao tác sản phẩm
   * GET /api/v1/inventory/history
   */
  getHistory: async (params = {}) => {
    return await apiClient.get('/inventory/history', { params });
  }
};

export default inventoryService;
