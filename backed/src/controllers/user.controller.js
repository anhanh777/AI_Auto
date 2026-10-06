import {
  getUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  resetPasswordService,
  deleteUserService
} from '../services/user.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getUsers = async (req, res) => {
  try {
    const result = await getUsersService(req.query);
    return sendSuccess(res, 'Lấy danh sách nhân viên thành công', result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await getUserByIdService(req.params.id);
    return sendSuccess(res, 'Lấy thông tin nhân viên thành công', user);
  } catch (error) {
    return sendError(res, error.message, null, 404);
  }
};

export const createUser = async (req, res) => {
  try {
    const newUser = await createUserService(req.body);
    return sendSuccess(res, 'Tạo tài khoản nhân viên thành công', newUser, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const updateUser = async (req, res) => {
  try {
    const updatedUser = await updateUserService(req.params.id, req.body);
    return sendSuccess(res, 'Cập nhật tài khoản nhân viên thành công', updatedUser);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const result = await resetPasswordService(req.params.id, req.body.defaultPassword);
    return sendSuccess(res, 'Đặt lại mật khẩu thành công', result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const result = await deleteUserService(req.params.id, req.user._id);
    return sendSuccess(res, 'Xóa tài khoản nhân viên thành công', result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};
