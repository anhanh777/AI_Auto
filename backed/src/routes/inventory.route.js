import { Router } from 'express';
import {
  getInventorySummaryController,
  importStockController,
  getInventoryHistoryController
} from '../controllers/inventory.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Toàn bộ API kho hàng yêu cầu xác thực
router.use(authenticate);

// 1. GET /api/v1/inventory - Báo cáo tồn kho
router.get('/', getInventorySummaryController);

// 2. POST /api/v1/inventory/import - Tạo phiếu nhập kho
router.post('/import', importStockController);

// 3. GET /api/v1/inventory/history - Lịch sử thao tác sản phẩm & kho hàng
router.get('/history', getInventoryHistoryController);

export default router;
