import { sendError } from '../utils/response.util.js';

/**
 * Middleware bọc hàm validation dữ liệu đầu vào
 * @param {Function} validatorFn - Hàm kiểm tra tính hợp lệ
 */
export const validateBody = (validatorFn) => {
  return (req, res, next) => {
    const { isValid, errors } = validatorFn(req.body);
    if (!isValid) {
      return sendError(res, 'Dữ liệu không hợp lệ', errors, 400);
    }
    next();
  };
};
