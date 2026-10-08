import { sendError } from '../utils/response.util.js';

/**
 * Middleware kiểm tra quyền truy cập chi tiết (Permission-based)
 * @param {string} requiredPermission - Mã quyền bắt buộc (VD: 'USER_MANAGE', 'PRODUCT_CREATE')
 */
export const hasPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role_id) {
      return sendError(res, 'Không xác định được quyền hạn của tài khoản', null, 403);
    }

    const role = req.user.role_id;
    const userCustomPerms = req.user.custom_permissions || [];

    // 1. Quản trị viên (ADMIN) hoặc vai trò / người dùng có quyền 'ALL' luôn được toàn quyền
    if (
      role?.name === 'ADMIN' ||
      (Array.isArray(role?.permissions) && role.permissions.includes('ALL')) ||
      userCustomPerms.includes('ALL')
    ) {
      return next();
    }

    // 2. Kiểm tra xem mã quyền có nằm trong custom_permissions của tài khoản hoặc permissions của vai trò không
    if (userCustomPerms.includes(requiredPermission) || (Array.isArray(role?.permissions) && role.permissions.includes(requiredPermission))) {
      return next();
    }

    // 3. Không đủ quyền -> Chặn lại và báo lỗi 403
    return sendError(
      res,
      `Bạn không có quyền ${requiredPermission} để thực hiện thao tác này`,
      null,
      403
    );
  };
};
