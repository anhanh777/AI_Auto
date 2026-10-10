import {
  loginService,
  registerService,
  getMeService,
  changePasswordService,
  getRolesService,
  updateRolePermissionsService,
  getAllPermissionsListService
} from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const login = async (req, res) => {
  try {
    const result = await loginService(req.body);
    return sendSuccess(res, 'Đăng nhập thành công', result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const register = async (req, res) => {
  try {
    const result = await registerService(req.body);
    return sendSuccess(res, 'Đăng ký tài khoản thành công', result, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await getMeService(req.user._id);
    return sendSuccess(res, 'Lấy thông tin tài khoản thành công', user);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const changePassword = async (req, res) => {
  try {
    const result = await changePasswordService(req.user._id, req.body);
    return sendSuccess(res, 'Đổi mật khẩu thành công', result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getPermissions = (req, res) => {
  try {
    const permissions = getAllPermissionsListService();
    return sendSuccess(res, 'Lấy danh mục quyền hệ thống thành công', permissions);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const getRoles = async (req, res) => {
  try {
    const roles = await getRolesService();
    return sendSuccess(res, 'Lấy danh sách vai trò thành công', roles);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

export const updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const updatedRole = await updateRolePermissionsService(id, permissions);
    return sendSuccess(res, 'Cập nhật phân quyền vai trò thành công', updatedRole);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};
