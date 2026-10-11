import {
  getInventorySummaryService,
  importStockService,
  getInventoryHistoryService
} from '../services/inventory.service.js';

/**
 * GET /api/v1/inventory
 * Báo cáo tổng quan tồn kho
 */
export const getInventorySummaryController = async (req, res) => {
  try {
    const business_id = req.user?.business_id || req.query.business_id;
    const { page, limit, search, category_id, stock_status } = req.query;

    const result = await getInventorySummaryService({
      business_id,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      search,
      category_id,
      stock_status
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy báo cáo tồn kho thành công',
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi lấy báo cáo tồn kho'
    });
  }
};

/**
 * POST /api/v1/inventory/import
 * Tạo phiếu nhập kho sản phẩm
 */
export const importStockController = async (req, res) => {
  try {
    const business_id = req.user?.business_id || req.body.business_id;
    const userId = req.user?._id;
    const { product_id, variant_sku, quantity, unit_price, note } = req.body;

    const result = await importStockService({
      business_id,
      product_id,
      variant_sku,
      quantity,
      unit_price,
      note,
      userId
    });

    return res.status(201).json({
      success: true,
      message: 'Nhập kho sản phẩm thành công',
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi nhập kho sản phẩm'
    });
  }
};

/**
 * GET /api/v1/inventory/history
 * Lịch sử thao tác sản phẩm và kho hàng
 */
export const getInventoryHistoryController = async (req, res) => {
  try {
    const business_id = req.user?.business_id || req.query.business_id;
    const { product_id, type, page, limit } = req.query;

    const result = await getInventoryHistoryService({
      business_id,
      product_id,
      type,
      page: Number(page) || 1,
      limit: Number(limit) || 20
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy lịch sử kho hàng thành công',
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi lấy lịch sử kho hàng'
    });
  }
};
