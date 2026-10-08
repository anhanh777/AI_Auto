import { sendError } from '../utils/response.util.js';

/**
 * Middleware bọc hàm validation dữ liệu đầu vào
 * Tự động đồng bộ x-business-id từ headers vào req.body nếu có
 * @param {Function} validatorFn - Hàm kiểm tra tính hợp lệ
 */
export const validateBody = (validatorFn) => {
  return (req, res, next) => {
    if (!req.body.business_id && req.headers['x-business-id']) {
      req.body.business_id = req.headers['x-business-id'];
    }
    const { isValid, errors } = validatorFn(req.body);
    if (!isValid) {
      return sendError(res, 'Dữ liệu không hợp lệ', errors, 400);
    }
    next();
  };
};
