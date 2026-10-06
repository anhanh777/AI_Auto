import { Router } from 'express';
import {
  login,
  getMe,
  changePassword,
  getPermissions,
  getRoles,
  updateRolePermissions
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { hasPermission } from '../middlewares/role.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { validateLoginInput, validateChangePasswordInput } from '../validations/auth.validation.js';

const authRouter = Router();

// 1. Đăng nhập (Public)
authRouter.post('/login', validateBody(validateLoginInput), login);

// 2. Lấy thông tin tài khoản hiện tại
authRouter.get('/me', authenticate, getMe);

// 3. Đổi mật khẩu cá nhân
authRouter.post('/change-password', authenticate, validateBody(validateChangePasswordInput), changePassword);

// 4. Lấy danh mục quyền hệ thống (Dùng để vẽ bảng Checkbox trên Frontend)
authRouter.get('/permissions', authenticate, getPermissions);

// 5. Lấy danh sách các vai trò
authRouter.get('/roles', authenticate, getRoles);

// 6. Admin cập nhật danh sách quyền cho vai trò
authRouter.put('/roles/:id', authenticate, hasPermission('ROLE_MANAGE'), updateRolePermissions);

export default authRouter;
