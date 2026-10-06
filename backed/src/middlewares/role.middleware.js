import { sendError } from '../utils/response.util.js';

/**
 * Middleware phân quyền (Role-Based Access Control)
 * @param {string[]} allowedRoles - Mảng các role được phép truy cập (VD: ['ADMIN'])
 */
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role_id) {
      return sendError(res, 'Không xác định được quyền hạn của người dùng', null, 403);
    }

    const userRoleName = req.user.role_id.name;
    if (!allowedRoles.includes(userRoleName)) {
      return sendError(res, 'Bạn không có quyền thực hiện thao tác này', null, 403);
    }

    next();
  };
};
